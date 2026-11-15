-- =============================================================================
-- AlloPro — Security layer (Row Level Security + hardened queue RPCs)
-- Run in the Supabase SQL Editor AFTER the schema from the master spec.
-- Safe to re-run: every statement is idempotent.
-- =============================================================================

-- 0. Moroccan time for CURRENT_DATE / NOW() (queue "today" = Moroccan day) ----
ALTER DATABASE postgres SET timezone TO 'Africa/Casablanca';

-- Optional "Pro vérifié" badge used by the app
ALTER TABLE public.pro_profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- 1. HELPERS ------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_pro_owner(p_pro_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pro_profiles WHERE id = p_pro_id AND user_id = auth.uid()
  );
$$;

-- True inside trusted server functions (RPCs / triggers) that set the flag.
CREATE OR REPLACE FUNCTION public.is_trusted_context()
RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
  SELECT coalesce(current_setting('allopro.trusted', true), '') = 'on'
      OR coalesce(auth.jwt() ->> 'role', '') = 'service_role';
$$;

-- 2. ENABLE RLS ---------------------------------------------------------------

ALTER TABLE public.users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_kridi    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews      ENABLE ROW LEVEL SECURITY;

-- 3. USERS --------------------------------------------------------------------

DROP POLICY IF EXISTS users_select_self ON public.users;
CREATE POLICY users_select_self ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- A pro can read the name / phone of clients who booked with them.
DROP POLICY IF EXISTS users_select_my_clients ON public.users;
CREATE POLICY users_select_my_clients ON public.users
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.client_id = users.id AND public.is_pro_owner(b.pro_id)
  ));

DROP POLICY IF EXISTS users_insert_self ON public.users;
CREATE POLICY users_insert_self ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() AND role IN ('client', 'pro'));

DROP POLICY IF EXISTS users_update_self ON public.users;
CREATE POLICY users_update_self ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role IN ('client', 'pro'));

-- 4. CATEGORIES (public, read-only) -------------------------------------------

DROP POLICY IF EXISTS categories_read ON public.categories;
CREATE POLICY categories_read ON public.categories
  FOR SELECT TO anon, authenticated
  USING (true);

-- 5. PRO PROFILES -------------------------------------------------------------

DROP POLICY IF EXISTS pro_profiles_read ON public.pro_profiles;
CREATE POLICY pro_profiles_read ON public.pro_profiles
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS pro_profiles_insert_own ON public.pro_profiles;
CREATE POLICY pro_profiles_insert_own ON public.pro_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS pro_profiles_update_own ON public.pro_profiles;
CREATE POLICY pro_profiles_update_own ON public.pro_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Pros cannot grant themselves a subscription, a badge or fake ratings.
CREATE OR REPLACE FUNCTION public.protect_pro_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF public.is_trusted_context() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.subscription_active   := true;
    NEW.subscription_end_date := NOW() + INTERVAL '90 days';
    NEW.rating_avg            := 5.0;
    NEW.rating_count          := 0;
    NEW.is_verified           := false;
    NEW.current_queue_number  := 0;
    NEW.last_issued_ticket    := 0;
  ELSE
    NEW.subscription_active   := OLD.subscription_active;
    NEW.subscription_end_date := OLD.subscription_end_date;
    NEW.rating_avg            := OLD.rating_avg;
    NEW.rating_count          := OLD.rating_count;
    NEW.is_verified           := OLD.is_verified;
    NEW.user_id               := OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_pro_profile_fields ON public.pro_profiles;
CREATE TRIGGER trg_protect_pro_profile_fields
  BEFORE INSERT OR UPDATE ON public.pro_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_pro_profile_fields();

-- 6. SERVICES (public read, owner write) ---------------------------------------

DROP POLICY IF EXISTS services_read ON public.services;
CREATE POLICY services_read ON public.services
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS services_write_owner ON public.services;
CREATE POLICY services_write_owner ON public.services
  FOR ALL TO authenticated
  USING (public.is_pro_owner(pro_id))
  WITH CHECK (public.is_pro_owner(pro_id));

-- 7. BOOKINGS -----------------------------------------------------------------

DROP POLICY IF EXISTS bookings_select ON public.bookings;
CREATE POLICY bookings_select ON public.bookings
  FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR public.is_pro_owner(pro_id));

-- Clients create appointment / SOS requests as "pending". Queue tickets only via RPC.
DROP POLICY IF EXISTS bookings_insert_client ON public.bookings;
CREATE POLICY bookings_insert_client ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id = auth.uid()
    AND booking_type IN ('appointment', 'ondemand')
    AND status = 'pending'
  );

DROP POLICY IF EXISTS bookings_update_pro ON public.bookings;
CREATE POLICY bookings_update_pro ON public.bookings
  FOR UPDATE TO authenticated
  USING (public.is_pro_owner(pro_id))
  WITH CHECK (public.is_pro_owner(pro_id));

-- A client may only cancel their own booking.
DROP POLICY IF EXISTS bookings_cancel_client ON public.bookings;
CREATE POLICY bookings_cancel_client ON public.bookings
  FOR UPDATE TO authenticated
  USING (client_id = auth.uid() AND status IN ('pending', 'confirmed'))
  WITH CHECK (client_id = auth.uid() AND status = 'cancelled');

-- Price always comes from the catalog; client-side edits limited to status.
CREATE OR REPLACE FUNCTION public.guard_booking_fields()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.service_id IS NOT NULL THEN
      SELECT price_mad INTO NEW.total_price_mad
      FROM public.services
      WHERE id = NEW.service_id AND pro_id = NEW.pro_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'service does not belong to this pro' USING ERRCODE = '22023';
      END IF;
    END IF;
    -- Appointments belong to the day they are scheduled for.
    IF NEW.booking_type = 'appointment' AND NEW.scheduled_at IS NOT NULL THEN
      NEW.booking_date := (NEW.scheduled_at AT TIME ZONE 'Africa/Casablanca')::date;
    END IF;
  ELSIF NOT public.is_trusted_context() AND NOT public.is_pro_owner(OLD.pro_id) THEN
    -- Client update (cancellation): freeze everything but the status.
    NEW := OLD;
    NEW.status := 'cancelled';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_booking_fields ON public.bookings;
CREATE TRIGGER trg_guard_booking_fields
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.guard_booking_fields();

-- 8. KRIDI (owner only) -------------------------------------------------------

DROP POLICY IF EXISTS kridi_owner ON public.pro_kridi;
CREATE POLICY kridi_owner ON public.pro_kridi
  FOR ALL TO authenticated
  USING (public.is_pro_owner(pro_id))
  WITH CHECK (public.is_pro_owner(pro_id));

-- 9. REVIEWS (verified: only after a completed booking) -----------------------

DROP POLICY IF EXISTS reviews_read ON public.reviews;
CREATE POLICY reviews_read ON public.reviews
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS reviews_insert_verified ON public.reviews;
CREATE POLICY reviews_insert_verified ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.client_id = auth.uid()
        AND b.pro_id = reviews.pro_id
        AND b.status = 'completed'
    )
  );

-- Keep pro rating_avg / rating_count in sync.
CREATE OR REPLACE FUNCTION public.refresh_pro_rating()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('allopro.trusted', 'on', true);
  UPDATE public.pro_profiles p
  SET rating_avg   = coalesce((SELECT round(avg(rating)::numeric, 1) FROM public.reviews r WHERE r.pro_id = p.id), 5.0),
      rating_count = (SELECT count(*) FROM public.reviews r WHERE r.pro_id = p.id)
  WHERE p.id = NEW.pro_id;
  PERFORM set_config('allopro.trusted', 'off', true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_pro_rating ON public.reviews;
CREATE TRIGGER trg_refresh_pro_rating
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.refresh_pro_rating();

-- 10. HARDENED RPC: TAKE A QUEUE TICKET --------------------------------------
-- Same signature as the spec. Adds: auth checks, open-shop check, daily reset,
-- one active ticket per client per day, row lock against double numbering.

CREATE OR REPLACE FUNCTION public.take_queue_ticket(
  p_pro_id UUID,
  p_client_id UUID,
  p_service_id UUID,
  p_walkin_name TEXT DEFAULT NULL
) RETURNS public.bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pro public.pro_profiles;
  v_next_ticket INT;
  v_price NUMERIC(10,2) := 0;
  v_booking public.bookings;
  v_is_owner BOOLEAN := public.is_pro_owner(p_pro_id);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;
  -- Clients take tickets for themselves; walk-ins (no client) only by the pro.
  IF NOT ((p_client_id = auth.uid()) OR (p_client_id IS NULL AND v_is_owner)) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_pro FROM public.pro_profiles WHERE id = p_pro_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'pro not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT v_pro.is_open OR NOT v_pro.subscription_active THEN
    RAISE EXCEPTION 'queue closed' USING ERRCODE = 'P0001';
  END IF;

  IF p_client_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.bookings
    WHERE pro_id = p_pro_id AND client_id = p_client_id AND booking_type = 'queue'
      AND booking_date = CURRENT_DATE AND status IN ('pending', 'confirmed', 'in_progress')
  ) THEN
    RAISE EXCEPTION 'already in queue' USING ERRCODE = '23505';
  END IF;

  PERFORM set_config('allopro.trusted', 'on', true);

  -- New day → restart numbering at #1.
  IF NOT EXISTS (
    SELECT 1 FROM public.bookings
    WHERE pro_id = p_pro_id AND booking_type = 'queue' AND booking_date = CURRENT_DATE
  ) THEN
    UPDATE public.pro_profiles SET current_queue_number = 0, last_issued_ticket = 0 WHERE id = p_pro_id;
  END IF;

  UPDATE public.pro_profiles
  SET last_issued_ticket = last_issued_ticket + 1
  WHERE id = p_pro_id
  RETURNING last_issued_ticket INTO v_next_ticket;

  IF p_service_id IS NOT NULL THEN
    SELECT price_mad INTO v_price FROM public.services WHERE id = p_service_id AND pro_id = p_pro_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'service does not belong to this pro' USING ERRCODE = '22023';
    END IF;
  END IF;

  INSERT INTO public.bookings (
    client_id, walkin_name, pro_id, service_id, booking_type, status, queue_number, total_price_mad, booking_date
  ) VALUES (
    p_client_id, p_walkin_name, p_pro_id, p_service_id, 'queue', 'confirmed', v_next_ticket, coalesce(v_price, 0), CURRENT_DATE
  ) RETURNING * INTO v_booking;

  PERFORM set_config('allopro.trusted', 'off', true);
  RETURN v_booking;
END;
$$;

-- 11. HARDENED RPC: ADVANCE QUEUE --------------------------------------------
-- Owner only. Skips cancelled tickets; never jumps past the last issued ticket.

CREATE OR REPLACE FUNCTION public.advance_pro_queue(p_pro_id UUID)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_current INT;
  v_next INT;
BEGIN
  IF NOT public.is_pro_owner(p_pro_id) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;

  SELECT current_queue_number INTO v_current
  FROM public.pro_profiles WHERE id = p_pro_id FOR UPDATE;

  PERFORM set_config('allopro.trusted', 'on', true);

  UPDATE public.bookings
  SET status = 'completed'
  WHERE pro_id = p_pro_id
    AND booking_date = CURRENT_DATE
    AND booking_type = 'queue'
    AND status = 'in_progress';

  SELECT min(queue_number) INTO v_next
  FROM public.bookings
  WHERE pro_id = p_pro_id
    AND booking_date = CURRENT_DATE
    AND booking_type = 'queue'
    AND queue_number > v_current
    AND status IN ('pending', 'confirmed');

  IF v_next IS NULL THEN
    PERFORM set_config('allopro.trusted', 'off', true);
    RETURN v_current;
  END IF;

  UPDATE public.pro_profiles SET current_queue_number = v_next WHERE id = p_pro_id;

  UPDATE public.bookings
  SET status = 'in_progress'
  WHERE pro_id = p_pro_id
    AND booking_date = CURRENT_DATE
    AND booking_type = 'queue'
    AND queue_number = v_next;

  PERFORM set_config('allopro.trusted', 'off', true);
  RETURN v_next;
END;
$$;

-- 12. FUNCTION PERMISSIONS ----------------------------------------------------

REVOKE ALL ON FUNCTION public.take_queue_ticket(UUID, UUID, UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.advance_pro_queue(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.take_queue_ticket(UUID, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_pro_queue(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_pro_owner(UUID) TO anon, authenticated;

-- =============================================================================
-- CLIENT MODE ADDITIONS
-- =============================================================================

-- 13. A client sees the pro's phone (WhatsApp / Call) once a booking is confirmed
DROP POLICY IF EXISTS users_select_my_pros ON public.users;
CREATE POLICY users_select_my_pros ON public.users
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.pro_profiles p ON p.id = b.pro_id
    WHERE p.user_id = users.id
      AND b.client_id = auth.uid()
      AND b.status IN ('confirmed', 'in_progress', 'completed')
  ));

-- 14. Appointments: no double booking of the same slot
CREATE UNIQUE INDEX IF NOT EXISTS bookings_unique_active_slot
  ON public.bookings (pro_id, scheduled_at)
  WHERE booking_type = 'appointment' AND status IN ('pending', 'confirmed', 'in_progress');

-- Busy slots of a pro for a day (times only — no client data leaves the server)
CREATE OR REPLACE FUNCTION public.get_booked_slots(p_pro_id UUID, p_date DATE)
RETURNS TABLE (scheduled_at TIMESTAMPTZ, duration_minutes INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.scheduled_at, coalesce(s.duration_minutes, 30)
  FROM public.bookings b
  LEFT JOIN public.services s ON s.id = b.service_id
  WHERE b.pro_id = p_pro_id
    AND b.booking_type = 'appointment'
    AND b.booking_date = p_date
    AND b.status IN ('pending', 'confirmed', 'in_progress')
    AND b.scheduled_at IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.get_booked_slots(UUID, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_booked_slots(UUID, DATE) TO authenticated;

-- 15. SOS issue photos (Storage). Each user uploads only into their own folder.
INSERT INTO storage.buckets (id, name, public)
VALUES ('issue-photos', 'issue-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS issue_photos_upload ON storage.objects;
CREATE POLICY issue_photos_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'issue-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS issue_photos_read ON storage.objects;
CREATE POLICY issue_photos_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'issue-photos');
