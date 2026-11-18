-- =============================================================================
-- ALLO LM3LM — Categories & target jobs (métiers) seed
-- Idempotent: safe to re-run. Run after the base schema (spec §3–4).
-- =============================================================================

-- 1. TARGET JOBS TABLE (sub-trades inside a category) -------------------------
CREATE TABLE IF NOT EXISTS public.category_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  name_fr TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  sort_order INT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS category_jobs_category_idx ON public.category_jobs (category_id, sort_order);

-- A pro picks one category (booking engine) and one precise job inside it.
ALTER TABLE public.pro_profiles
  ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.category_jobs(id) ON DELETE SET NULL;

-- 2. CATEGORIES ---------------------------------------------------------------
INSERT INTO public.categories (slug, name_fr, name_ar, icon, booking_type, sort_order) VALUES
('coiffure',  'Coiffure & Beauté',           'حلاقة وتجميل',            'Scissors',    'queue',       1),
('sante',     'Médecins & Dentistes',        'أطباء وعيادات',           'Stethoscope', 'appointment', 2),
('bricolage', 'Plombier & Dépannage SOS',    'بلومبي وإصلاحات منزلية',  'Wrench',      'ondemand',    3),
('auto',      'Lavage & Mécanique Auto',     'غسيل وميكانيك السيارات',  'Car',         'queue',       4),
('sport',     'Terrains & Coaching Sportif', 'ملاعب وكوتشينغ رياضي',    'Trophy',      'appointment', 5),
('services',  'Services Quotidiens',         'خدمات يومية متنوعة',      'Home',        'appointment', 6)
ON CONFLICT (slug) DO UPDATE SET
  name_fr = EXCLUDED.name_fr,
  name_ar = EXCLUDED.name_ar,
  icon = EXCLUDED.icon,
  booking_type = EXCLUDED.booking_type,
  sort_order = EXCLUDED.sort_order;

-- 3. TARGET JOBS --------------------------------------------------------------
INSERT INTO public.category_jobs (category_id, slug, name_fr, name_ar, sort_order)
SELECT c.id, j.slug, j.name_fr, j.name_ar, j.sort_order
FROM (VALUES
  ('coiffure',  'barber',            'Coiffeur Homme / Barber',          'حلاق رجال',                                1),
  ('coiffure',  'coiffeuse',         'Coiffeuse & Esthéticienne',        'حلاقة وتجميل النساء',                      2),

  ('sante',     'dentiste',          'Dentiste',                         'طبيب الأسنان',                             1),
  ('sante',     'generaliste',       'Médecin Généraliste',              'طبيب العام',                               2),
  ('sante',     'kine',              'Kinésithérapeute',                 'مروض طبي',                                 3),
  ('sante',     'infirmier',         'Infirmier à domicile',             'ممرض مستقل (للديار)',                      4),

  ('bricolage', 'plombier',          'Plombier',                         'رصاص (بلومبي)',                            1),
  ('bricolage', 'electricien',       'Électricien',                      'كهربائي (تريسيان)',                        2),
  ('bricolage', 'clim-frigo',        'Technicien Clim & Frigo',          'تقني التبريد والمكيفات',                   3),
  ('bricolage', 'electromenager',    'Réparateur Électroménager',        'مصلح الآلات المنزلية',                     4),
  ('bricolage', 'parabole-cameras',  'Parabole & Caméras',               'تقني البارابول والكاميرات',                5),
  ('bricolage', 'serrurier',         'Serrurier',                        'مصلح الأقفال والسوارت',                    6),
  ('bricolage', 'peintre-platrier',  'Peintre & Plâtrier',               'صباغ وجباس',                               7),
  ('bricolage', 'menuisier',         'Menuisier Alum/Bois',              'نجار الألومنيوم والخشب',                   8),

  ('auto',      'lavage-auto',       'Lavage Auto (Centre / Domicile)',  'غسيل السيارات (محطة أو بالدار)',           1),
  ('auto',      'mecanicien',        'Mécanicien & Diagnostic',          'ميكانيكي وفحص بالـ Scanner',               2),
  ('auto',      'electricien-auto',  'Électricien Auto',                 'كهربائي السيارات',                         3),

  ('sport',     'terrain',           'Terrain Mini-Foot / Padel',        'ملاعب القرب (ميني فوت / بادل)',            1),
  ('sport',     'coach',             'Personal Trainer / Coach',         'مدرب رياضي شخصي',                          2),

  ('services',  'menage',            'Femme de ménage',                  'عاملة النظافة (بالساعة/بالنهار)',          1),
  ('services',  'transport',         'Transport & Déménagement (Honda)', 'ناقل البضائع والرحيل (هوندا/تريبورتور)',   2)
) AS j(category_slug, slug, name_fr, name_ar, sort_order)
JOIN public.categories c ON c.slug = j.category_slug
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name_fr = EXCLUDED.name_fr,
  name_ar = EXCLUDED.name_ar,
  sort_order = EXCLUDED.sort_order;

-- 4. RLS: public, read-only (writes only via service role / SQL editor) -------
ALTER TABLE public.category_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS category_jobs_read ON public.category_jobs;
CREATE POLICY category_jobs_read ON public.category_jobs
  FOR SELECT TO anon, authenticated
  USING (true);

-- 5. Integrity: a pro's job must belong to the pro's category ------------------
CREATE OR REPLACE FUNCTION public.check_pro_job_category()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.job_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.category_jobs
    WHERE id = NEW.job_id AND category_id = NEW.category_id
  ) THEN
    RAISE EXCEPTION 'job_id does not belong to category_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS pro_profiles_job_category ON public.pro_profiles;
CREATE TRIGGER pro_profiles_job_category
  BEFORE INSERT OR UPDATE OF job_id, category_id ON public.pro_profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_pro_job_category();
