# ALLOPRO — Master Product, Design, & Technical Specification

**Target Market:** Kingdom of Morocco (MA)  
**Primary Platform:** Android (APK & Google Play Store) — iOS Compatible via Expo  
**Supported Languages:** Français (`fr` - LTR) & العربية / الدارجة (`ar` - RTL)  
**Architecture Pattern:** Dual-Role Super-App (Client Mode & Pro Mode) powered by 3 specialized booking engines.

---

## 1. PRODUCT VISION & MOROCCAN MARKET FIT

**AlloPro** solves the daily chaos of waiting lines, unorganized phone bookings, and unreliable home repairs across Morocco. Instead of forcing every profession into a single rigid calendar, AlloPro groups Morocco's most requested services into **3 practical execution engines** inside one unified platform:

| Sector (القطاع) | Target Professions (المهن المستهدفة) | Core Market Problem | Assigned Engine |
| :--- | :--- | :--- | :--- |
| **Coiffure & Beauté** | Barbershops (حلاقة رجال/نساء), Beauty Salons, Hammams | Long waiting lines in the shop; clients never know how many people are ahead. | **Engine A: Live Queue (`queue`)** |
| **Auto & Lavage** | Car Wash (لافاج), Quick Mechanics, Oil Change (فیدانج) | Weekend crowding and wasted hours waiting for a turn. | **Engine A: Live Queue (`queue`)** |
| **Santé & Bien-être** | Dentists, General Doctors, Kiné (الترويض), Medical Labs | Paper-and-pen waiting lists and overcrowded waiting rooms. | **Engine B: Time Slots (`appointment`)** |
| **Sport & Loisirs** | Mini-foot Pitches (ملاعب القرب), Gyms, Personal Trainers | Double-bookings over the phone and forgotten subscriptions. | **Engine B: Time Slots (`appointment`)** |
| **Bricolage & SOS** | Plumbers (بلومبي), Electricians (تريسيان), Painters, AC/Fridge Repair | Difficulty finding a trusted artisan nearby quickly with transparent pricing. | **Engine C: Home Dispatch (`ondemand`)** |

---

## 2. BRAND IDENTITY & PRO UI/UX DESIGN SYSTEM

### 2.1 Anti-Generic / Human-Crafted UI Rules
To ensure the application looks and feels like a top-tier consumer product (comparable to Glovo, InDrive, and Careem) and never looks like a generic AI template:
1. **Flat Vector & Clean Surfaces:** Use solid backgrounds, crisp `1px` borders (`#DCE6E6`), and ultra-soft natural shadows (`shadowOpacity: 0.05, shadowRadius: 10`). Never use harsh neon glows or amateur gradients.
2. **Thumb-Zone Ergonomics:** Primary action buttons (*Réserver*, *Prendre mon tour*, *Client Suivant*) are fixed in the bottom 25% of the screen (`height: 54px`, `borderRadius: 16px`) for easy one-handed use.
3. **Strict Card Density:** Each Pro card displays a maximum of **3 scannable data points**:
   - Line 1: Business Name + Verified Badge + Rating (`★ 4.9`)
   - Line 2: Category + Neighborhood/Distance (`Maârif • 1.2 km`)
   - Line 3: Live Status Pill (`Ouvert • 2 en attente` or `À partir de 30 DH`)
4. **Tactile Micro-Feedback:** All touchable elements use `Pressable` with `scale(0.98)` compression and `expo-haptics` vibration on ticket generation, queue advancement, and status toggles.
5. **Visual-First for Artisans:** Every button in Pro Mode pairs clear text with an unmistakable icon so any Moroccan craftsman can use the app effortlessly without reading long instructions.

### 2.2 Official Color Palette (`src/constants/theme.ts`)
| Token | Hex Code | Role & Visual Application |
| :--- | :--- | :--- |
| `primary.DEFAULT` | `#1D4355` | **Deep Slate Blue** — Main headers, vector outlines, primary brand identity, primary headings |
| `accent.DEFAULT` | `#F08A4B` | **Vibrant Coral Orange** — Primary CTAs ("Réserver / حجز"), rotating gears, checkmarks, active badges |
| `secondary.teal` | `#A5C4C4` | **Soft Mint Teal** — Radar waves, secondary pills, selected card borders, icon fills |
| `background.main` | `#F4F7F7` | **Soothing Off-White** — Default screen canvas background (easy on the eye) |
| `background.surface`| `#FFFFFF` | **Pure White** — Elevated cards, bottom sheets, modals |
| `text.primary` | `#1D4355` | **Deep Slate Blue** — High-contrast readable body and title text |
| `text.secondary` | `#607D8B` | **Muted Slate** — Subtitles, neighborhood names, timestamps |
| `status.online` | `#10B981` | **Emerald Green** — Shop Open (`Ouvert / مفتوح`), Confirmed ticket, Paid Kridi |
| `status.busy` | `#F59E0B` | **Amber Gold** — Queue waiting alert, Pending approval |
| `status.offline` | `#EF4444` | **Coral Red** — Shop Closed (`Fermé / مغلق`), Cancelled booking, Unpaid Kridi |

### 2.3 Bilingual Typography & RTL/LTR Architecture (`fr` & `ar`)
- **French Font Family (`LTR`):** `PlusJakartaSans` (`Medium 500`, `SemiBold 600`, `Bold 700`)
- **Arabic Font Family (`RTL`):** `Cairo` or `Tajawal` (`Medium 500`, `Bold 700`)
- **Bidirectional Layout Rules:**
  - Use logical Flexbox properties everywhere (`start`, `end`, `paddingStart`, `marginEnd`).
  - Directional icons (arrows, chevrons, back buttons) automatically mirror horizontally when Arabic is active (`transform: [{ scaleX: isRTL ? -1 : 1 }]`).
  - Phone numbers (`+212 6...`), prices (`50 DH`), ticket numbers (`#14`), and clock times (`15:30`) strictly remain `LTR` in both languages for instant legibility.

---

## 3. MOTION DESIGN, ANIMATIONS & VISUAL ASSETS

All animations run natively at **60 FPS** on the UI thread using `react-native-reanimated` and `react-native-svg` inside `src/components/animations/`.

### 3.1 Custom Native Animation Specifications
1. **Logo Splash Animation (`SplashLogoAnimation.tsx`):**
   - The stylized letter **'A'** (`#1D4355`) scales up from `0.5` to `1.0` with a spring bounce (`damping: 12, stiffness: 100`).
   - Simultaneously, the orange mechanical gear (`#F08A4B`) behind the 'A' rotates `360deg` clockwise continuously (`duration: 4000ms, Easing.linear`).
   - The clock checkmark draws itself in via `strokeDashoffset` over `600ms`.

2. **Radar Matching Animation (`RadarSearchingAnimation.tsx`):**
   - Used when a client requests an SOS Artisan (`ondemand`) or searches nearby Pros on the map.
   - Central dark blue map pin (`#1D4355`) with an orange checkmark (`#F08A4B`) floats gently on the Y-axis (`-5px` to `+5px`, `1500ms` ease-in-out loop).
   - Three concentric teal circles (`#A5C4C4`) expand outward behind the pin from `scale(0.5)` to `scale(2.5)` while fading `opacity` from `0.8` to `0` in a staggered `2000ms` infinite loop.
   - Small floating vector icons (wrench, gear, clock) orbit subtly around the radar perimeter.

3. **Gear Loading & Progress Bar (`GearLoadingProgress.tsx`):**
   - Replaces generic spinners. Features the orange gear (`#F08A4B`) rotating `360deg` in `2000ms` (`linear`), paired with a rounded horizontal progress bar (`height: 8px`, track `#A5C4C4`, fill `#F08A4B`) animating width from `0%` to `100%` with a cubic-bezier ease-out curve.

4. **Success Confetti Pop-up (`SuccessConfettiPopup.tsx`):**
   - Triggered when a client gets a Queue Ticket or confirms a Booking.
   - Central location pin with checkmark scales from `0` to `1.15` then settles at `1.0` (elastic spring bounce).
   - 10 star and dot particles (`#F08A4B` and `#A5C4C4`) burst radially outward from the center and fade out over `800ms`.

### 3.2 AI Illustration Generation Prompts (For `assets/illustrations/`)

- **Master UI/UX Asset Sheet Prompt:**
  > `A modern, clean UI/UX mobile app design asset sheet for a handyman and home services app named "AlloPro". Flat vector illustration style, rounded thick outlines. Color palette: deep slate blue (#1D4355), vibrant orange (#F08A4B), soft mint teal (#A5C4C4), and off-white background (#F4F7F7). The sheet includes: 1. Splash screen illustration with a friendly technician mascot wearing overalls and holding a wrench standing next to a giant stylized letter 'A' with a gear and clock. 2. Map radar searching interface with a pulsing location pin with a checkmark inside, surrounded by floating small gears and wrenches. 3. Micro-interaction icon set: rotating orange gear, fast-ticking clock, floating map pin, and rounded orange progress bar. 4. Service tracking graphic showing a technician running on a map route with a "Pro Arrived" notification badge. 5. Success state badge featuring a map pin with an orange checkmark bursting with celebratory stars and confetti lines. High resolution, Dribbble/Behance UI trend, vector art, isolated on light background --ar 16:9`

- **1. Onboarding Mascot (`onboarding-mascot.png`):**
  > `Flat vector illustration for a mobile app onboarding screen. A friendly handyman character in blue overalls and cap, smiling and giving a thumbs up, leaning against a giant dark blue (#1D4355) letter 'A' combined with an orange (#F08A4B) gear and a clock with a checkmark. Soft teal (#A5C4C4) and orange accents, clean white background, modern tech startup vector style, thick outlines, minimal shadows.`

- **2. Map Radar Graphic (`radar-searching.png`):**
  > `Mobile UI map radar illustration. Top-down minimalist vector city map in soft pastel greens and grays. In the center, a dark blue (#1D4355) map location pin with an orange (#F08A4B) checkmark inside, emitting concentric translucent teal (#A5C4C4) radar waves. Small floating icons of an orange gear, a wrench, and a clock around the radar circles. Clean flat vector style.`

- **3. Micro-Interaction Icon Pack (`micro-icons.png`):**
  > `UI icon pack for a service app, flat vector style with dark blue (#1D4355) outlines and orange (#F08A4B) and teal (#A5C4C4) fills. Includes: a mechanical gear with rotation arrows, a minimalist clock with motion lines, a location pin with a checkmark inside, and a sleek horizontal loading progress bar half-filled with orange. Isolated on a plain white background.`

- **4. Booking Success Badge (`success-badge.png`):**
  > `Flat vector success badge illustration for a mobile app. A central dark blue (#1D4355) location pin with an orange (#F08A4B) checkmark inside, surrounded by celebratory burst lines, small orange stars, and teal (#A5C4C4) dots (confetti effect). Clean, modern UI graphic, isolated on white background.`

---

## 4. FUNCTIONAL ARCHITECTURE & SCREEN FLOWS

### 4.1 Role Switcher (InDrive-Style Dual Mode)
A single installation serves both customers and professionals:
- Users log in once via **Moroccan Phone OTP (`+212 6...` or `+212 7...`)**.
- A prominent button in the Profile/Menu (**"Passer en Mode Pro / التبديل لوضع المهني"**) switches the entire navigation tree instantly between `(client)` and `(pro)`.

### 4.2 Client Mode Screens (`src/app/(client)/`)
1. **Home & Discovery (`index.tsx`):**
   - Top Bar: Moroccan City & Neighborhood selector (`Casablanca - Maârif ▾`) + Language Pill (`FR | ع`).
   - Sticky Search Input: *"Chercher un coiffeur, plombier, dentiste..."*.
   - **Live Active Ticket Widget (Conditional):** If the user holds an active queue ticket or SOS booking, a floating dark-blue card (`#1D4355`) stays pinned at the top showing real-time progress: *"Votre tour : #14 • En cours : #12 (~20 min)"*.
   - Horizontal Category Bar: 5 vector category cards.
   - "Pros Ouverts Près de Vous": List of open professionals sorted by proximity and rating.

2. **Morocco Interactive Map (`map.tsx`):**
   - Full-screen MapView centered on the user's Moroccan city, configured with custom map styling that displays the **complete, undivided map of Morocco** without dashed border lines.
   - Custom Marker Pins showing Category Icon + Live Status Dot (Green = Open, Grey = Closed) + starting price (`30 DH`).
   - Tapping a pin slides up a `@gorhom/bottom-sheet` preview card with distance, wait time, *"Itinéraire (Google Maps / Waze)"*, and *"Réserver"*.

3. **Pro Profile & 3-Engine Booking Screen (`pro/[id].tsx`):**
   - Header: Shop photos, Verified Pro badge, rating stars, address, and Open/Closed pill.
   - Service Catalog: Selectable list of services with clear prices in **MAD (DH)** and duration.
   - Dynamic Sticky Bottom Bar based on `booking_type`:
     - **If `queue`:** Shows current queue count (`3 personnes devant vous`) + Orange CTA **"Prendre mon tour (#15) / شد النوبة"**.
     - **If `appointment`:** Opens horizontal Date Strip + available Time Slot pills (`10:00`, `10:30`, `11:00`) + CTA **"Confirmer le RDV / تأكيد الموعد"**.
     - **If `ondemand`:** Opens GPS Pin confirmation + issue description + optional photo upload + CTA **"Demander l'intervention / طلب تدخل"**, launching `RadarSearchingAnimation`.

4. **My Bookings & Live Tracker (`bookings.tsx`):**
   - Real-time status progression (`En attente` ➔ `Confirmé` ➔ `En route / En cours` ➔ `Terminé`).
   - Direct **WhatsApp** and **Phone Call** buttons unlocked once confirmed.
   - 1-to-5 Star Review modal triggered upon completion.

### 4.3 Pro Mode Screens (`src/app/(pro)/`)
1. **Live Guichet & Today's Controller (`index.tsx`):**
   - Giant Status Switch at top: **`OUVERT / مفتوح`** (`#10B981`) vs **`FERMÉ / مغلق`** (`#EF4444`).
   - **Queue Controller Card (For Barbers / Car Wash):**
     - Huge Display of Current Serving Ticket: **`#12`**.
     - Primary Orange CTA: **`CLIENT SUIVANT / الزبون التالي ➔`** (advances queue and sends push notifications to waiting clients).
     - Secondary Button: **`+ Client sur place (Walk-in) / + زبون حضوري`** (lets the barber add a physical customer who walked in without the app so online clients see an accurate queue).
   - **Incoming Requests List:** Cards for today's appointments or SOS home requests with 1-tap *Accepter*, *WhatsApp*, *Itinéraire GPS*, or *Terminer*.

2. **Service & Price Catalog (`catalog.tsx`):**
   - Simple interface to add/edit services (e.g., *Coupe + Barbe = 50 DH*, *Diagnostic Plomberie = 100 DH*) and toggle availability.

3. **Mini-Caisse & Carnet de Kridi (`caisse.tsx`):**
   - **Daily & Monthly Revenue Counter:** Automatically sums completed bookings in MAD (`DH`).
   - **Carnet de Kridi (الكريدي):** Allows the Pro to record clients who haven't paid yet (`Nom`, `Téléphone`, `Montant DH`), mark debts as paid, or tap **"Rappel WhatsApp"** to send a polite automated payment reminder in Darija/French.

---

## 5. COMPLETE DATABASE SCHEMA (SUPABASE SQL)

Copy and execute this entire script inside the **Supabase SQL Editor**:

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUM TYPES
CREATE TYPE user_role AS ENUM ('client', 'pro', 'admin');
CREATE TYPE booking_engine AS ENUM ('queue', 'appointment', 'ondemand');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');

-- 2. USERS TABLE
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role DEFAULT 'client',
  language TEXT DEFAULT 'fr' CHECK (language IN ('fr', 'ar')),
  city TEXT DEFAULT 'Casablanca',
  avatar_url TEXT,
  push_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SERVICE CATEGORIES TABLE
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name_fr TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  icon TEXT NOT NULL,
  booking_type booking_engine NOT NULL,
  sort_order INT DEFAULT 0
);

-- 4. PRO PROFILES TABLE
CREATE TABLE public.pro_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  category_id UUID REFERENCES public.categories(id),
  business_name TEXT NOT NULL,
  description_fr TEXT,
  description_ar TEXT,
  city TEXT NOT NULL DEFAULT 'Casablanca',
  neighborhood TEXT,
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  cover_url TEXT,
  is_open BOOLEAN DEFAULT true,
  current_queue_number INT DEFAULT 0,
  last_issued_ticket INT DEFAULT 0,
  rating_avg NUMERIC(2,1) DEFAULT 5.0,
  rating_count INT DEFAULT 0,
  subscription_active BOOLEAN DEFAULT true,
  subscription_end_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SERVICES CATALOG TABLE
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pro_id UUID REFERENCES public.pro_profiles(id) ON DELETE CASCADE,
  title_fr TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  price_mad NUMERIC(10,2) NOT NULL,
  duration_minutes INT DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. BOOKINGS & LIVE QUEUE TABLE
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  walkin_name TEXT, -- Populated when Pro adds a non-app walk-in client
  pro_id UUID REFERENCES public.pro_profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  booking_type booking_engine NOT NULL,
  status booking_status DEFAULT 'confirmed',
  queue_number INT, -- Used for 'queue' engine
  scheduled_at TIMESTAMPTZ, -- Used for 'appointment' engine
  client_lat DOUBLE PRECISION, -- Used for 'ondemand' SOS engine
  client_lng DOUBLE PRECISION,
  client_address TEXT,
  issue_notes TEXT,
  issue_photo_url TEXT,
  total_price_mad NUMERIC(10,2) NOT NULL DEFAULT 0,
  booking_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PRO MINI-CAISSE & KRIDI LEDGER
CREATE TABLE public.pro_kridi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pro_id UUID REFERENCES public.pro_profiles(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  amount_mad NUMERIC(10,2) NOT NULL,
  note TEXT,
  is_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. VERIFIED REVIEWS TABLE
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE UNIQUE,
  client_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  pro_id UUID REFERENCES public.pro_profiles(id) ON DELETE CASCADE,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. ATOMIC RPC: TAKE A QUEUE TICKET (CLIENT OR WALK-IN)
CREATE OR REPLACE FUNCTION take_queue_ticket(
  p_pro_id UUID,
  p_client_id UUID,
  p_service_id UUID,
  p_walkin_name TEXT DEFAULT NULL
) RETURNS public.bookings AS $$
DECLARE
  v_next_ticket INT;
  v_price NUMERIC(10,2);
  v_booking public.bookings;
BEGIN
  UPDATE public.pro_profiles
  SET last_issued_ticket = last_issued_ticket + 1
  WHERE id = p_pro_id
  RETURNING last_issued_ticket INTO v_next_ticket;

  SELECT COALESCE(price_mad, 0) INTO v_price FROM public.services WHERE id = p_service_id;

  INSERT INTO public.bookings (
    client_id, walkin_name, pro_id, service_id, booking_type, status, queue_number, total_price_mad
  ) VALUES (
    p_client_id, p_walkin_name, p_pro_id, p_service_id, 'queue', 'confirmed', v_next_ticket, COALESCE(v_price, 0)
  ) RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. ATOMIC RPC: ADVANCE QUEUE TO NEXT CLIENT (PRO CONTROLLER)
CREATE OR REPLACE FUNCTION advance_pro_queue(p_pro_id UUID)
RETURNS INT AS $$
DECLARE
  v_new_current INT;
BEGIN
  -- Mark previous in_progress ticket as completed
  UPDATE public.bookings
  SET status = 'completed'
  WHERE pro_id = p_pro_id
    AND booking_date = CURRENT_DATE
    AND booking_type = 'queue'
    AND status = 'in_progress';

  -- Increment current_queue_number
  UPDATE public.pro_profiles
  SET current_queue_number = LEAST(current_queue_number + 1, last_issued_ticket)
  WHERE id = p_pro_id
  RETURNING current_queue_number INTO v_new_current;

  -- Mark the new ticket as in_progress
  UPDATE public.bookings
  SET status = 'in_progress'
  WHERE pro_id = p_pro_id
    AND booking_date = CURRENT_DATE
    AND booking_type = 'queue'
    AND queue_number = v_new_current;

  RETURN v_new_current;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. SEED INITIAL MOROCCAN CATEGORIES
INSERT INTO public.categories (slug, name_fr, name_ar, icon, booking_type, sort_order) VALUES
('coiffure', 'Coiffure & Beauté', 'حلاقة وتجميل', 'Scissors', 'queue', 1),
('sante', 'Médecins & Dentistes', 'أطباء وعيادات', 'Stethoscope', 'appointment', 2),
('bricolage', 'Plombier & Dépannage', 'بلومبي وإصلاحات', 'Wrench', 'ondemand', 3),
('auto', 'Lavage & Mécanique', 'غسيل وميكانيك السيارات', 'Car', 'queue', 4),
('sport', 'Terrains & Salles', 'ملاعب وقاعات الرياضة', 'Trophy', 'appointment', 5);

-- 12. ENABLE SUPABASE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.pro_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
```

---

## 6. COMPLETE FOLDER & FILE STRUCTURE

```text
allopro/
├── app.json                                   # Android package config, permissions, adaptive icon
├── eas.json                                   # APK & Play Store build profiles
├── tailwind.config.js                         # NativeWind palette (#1D4355, #F08A4B, #A5C4C4, #F4F7F7)
├── package.json
├── assets/
│   ├── images/                                # App icon, splash logo
│   └── illustrations/                         # Onboarding mascot, Radar graphic, Success badge
└── src/
    ├── app/
    │   ├── _layout.tsx                        # Root layout, SplashLogoAnimation, Font & RTL loader
    │   ├── (auth)/
    │   │   ├── welcome.tsx                    # Mascot illustration, FR/AR toggle, Role selection
    │   │   └── login.tsx                      # +212 Phone OTP verification
    │   ├── (client)/
    │   │   ├── _layout.tsx                    # Client Bottom Tab Bar
    │   │   ├── index.tsx                      # Home discovery, categories, sticky active ticket banner
    │   │   ├── map.tsx                        # Undivided Morocco Map, custom pins, bottom sheet
    │   │   ├── bookings.tsx                   # Live queue/SOS tracker & past bookings
    │   │   ├── profile.tsx                    # Client settings, language switch, "Passer en Mode Pro"
    │   │   └── pro/[id].tsx                   # Pro details, 3-Engine booking sheet & SuccessConfettiPopup
    │   └── (pro)/
    │       ├── _layout.tsx                    # Pro Bottom Tab Bar
    │       ├── index.tsx                      # Live Guichet (Open/Close switch, "Suivant", "+ Walk-in")
    │       ├── catalog.tsx                    # Manage services & prices in MAD (DH)
    │       ├── caisse.tsx                     # Daily revenue summary & Kridi WhatsApp ledger
    │       └── settings.tsx                   # Shop GPS pin, hours, subscription status, "Mode Client"
    ├── components/
    │   ├── animations/
    │   │   ├── SplashLogoAnimation.tsx        # Spring 'A' + rotating orange gear + checkmark draw
    │   │   ├── RadarSearchingAnimation.tsx    # Floating pin + 3 concentric teal radar waves
    │   │   ├── GearLoadingProgress.tsx        # Rotating gear + smooth orange progress bar
    │   │   └── SuccessConfettiPopup.tsx       # Elastic bounce pin + radial star burst
    │   ├── ui/
    │   │   ├── PrimaryButton.tsx              # Haptic 54px thumb-zone CTA button
    │   │   ├── StatusBadge.tsx                # Ouvert/Fermé & Queue count pills
    │   │   └── SkeletonCard.tsx               # Shimmer placeholder cards
    │   ├── client/
    │   │   ├── ProCard.tsx                    # 3-data-point scannable card
    │   │   ├── ActiveTicketBanner.tsx         # Realtime floating queue widget
    │   │   └── MoroccoMapView.tsx             # Custom styled map for Moroccan cities
    │   └── pro/
    │       ├── QueueControllerCard.tsx        # Giant ticket display + Suivant / Walk-in controls
    │       └── KridiModal.tsx                 # Add unpaid client debt & trigger WhatsApp reminder
    ├── constants/
    │   ├── theme.ts                           # Official colors, spacing, shadows
    │   ├── moroccoCities.ts                   # Coordinates for Casa, Rabat, Marrakech, Tanger, Fès, Agadir...
    │   └── mapStyleMorocco.json               # Custom Google/OSM style hiding disputed dashed borders
    ├── i18n/
    │   ├── index.ts                           # i18next config + automatic I18nManager RTL switching
    │   ├── fr.json                            # Full French dictionary
    │   └── ar.json                            # Full Moroccan Arabic dictionary
    ├── lib/
    │   ├── supabase.ts                        # Supabase client & Realtime subscription hooks
    │   └── whatsapp.ts                        # Pre-formatted FR/AR WhatsApp templates (Confirmation & Kridi)
    └── store/
        └── useAppStore.ts                     # Zustand store (user, activeMode, language, selectedCity)
```

---

## 7. STEP-BY-STEP MASTER PROMPT FOR CODE GENERATION

Use the following instructions inside **Cursor, Windsurf, Claude, or here in chat** to generate the entire codebase cleanly without skipping any file:

> **EXECUTION PROMPT:**  
> "Read `ALLOPRO_MASTER_SPEC.md` completely. We will build the entire production-ready React Native (Expo Router + TypeScript + NativeWind + Supabase + Reanimated) application across **6 sequential phases**. Do not use `// TODO` placeholders or mock shortcuts. Write complete, copy-pasteable files for each phase and wait for my confirmation (`Next` / `Kmmel`) before moving to the next phase:
> 
> - **PHASE 1: Project Config, Theme & Morocco Constants** (`package.json`, `tailwind.config.js`, `src/constants/theme.ts`, `src/constants/moroccoCities.ts`, `src/constants/mapStyleMorocco.json`, `src/lib/supabase.ts`, `src/lib/whatsapp.ts`).
> - **PHASE 2: Bilingual Engine (FR/AR + RTL) & Global State** (`src/i18n/fr.json`, `src/i18n/ar.json`, `src/i18n/index.ts`, `src/store/useAppStore.ts`).
> - **PHASE 3: The 4 Custom Reanimated & SVG Animation Components** (`SplashLogoAnimation.tsx`, `RadarSearchingAnimation.tsx`, `GearLoadingProgress.tsx`, `SuccessConfettiPopup.tsx`) + Core UI Components (`PrimaryButton.tsx`, `ProCard.tsx`, `ActiveTicketBanner.tsx`).
> - **PHASE 4: Root Layout, Animated Onboarding & +212 Phone OTP Auth** (`src/app/_layout.tsx`, `src/app/(auth)/welcome.tsx`, `src/app/(auth)/login.tsx`).
> - **PHASE 5: Pro Mode Complete Suite** (`src/app/(pro)/_layout.tsx`, `index.tsx` Live Guichet & Walk-in, `catalog.tsx`, `caisse.tsx` Kridi Ledger, `settings.tsx`).
> - **PHASE 6: Client Mode, Interactive Morocco Map, 3 Booking Engines & Android APK Config** (`src/app/(client)/_layout.tsx`, `index.tsx`, `map.tsx`, `pro/[id].tsx`, `bookings.tsx`, `profile.tsx`, `app.json`, `eas.json`)."

---

## 8. GO-TO-MARKET & LAUNCH CHECKLIST IN MOROCCO

1. ** Cost to Launch MVP (Under 300 DH):**
   - **Supabase:** Free Tier (covers up to 50,000 monthly active users & Realtime queues).
   - **Expo / EAS Build:** Free Tier (generates installable Android `.apk` and `.aab` files).
   - **Google Play Console:** $25 one-time fee (~250 DH).
2. **Field Onboarding Strategy (First 30 Days):**
   - Start in **1 city and 1–2 busy neighborhoods** (e.g., 20 barbershops, 10 car washes, and 15 plumbers/electricians).
   - Offer a **90-day free trial** (`subscription_end_date = NOW() + 90 days` is already built into the SQL schema).
   - Print a clean **AlloPro QR Code Sticker** (`#1D4355` & `#F08A4B`) for each shop window: *"Scannez pour prendre votre tour sans attendre / شد نوبتك بلا ما تسنى"*.
3. **Monetization (After Trial):**
   - Fixed monthly subscription for Pros (**99 DH to 149 DH / month**) paid via CIH / Attijari / Barid Bank transfer or CashPlus, activated with 1 click in Supabase.