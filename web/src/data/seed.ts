/**
 * ALLO LM3LM web — realistic Moroccan seed data.
 * Shapes mirror the Supabase schema (pro_profiles, services, bookings, pro_kridi)
 * so the same store logic can later read from Supabase.
 */

export type Lang = 'fr' | 'ar';
export type Engine = 'queue' | 'appointment' | 'ondemand';
export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type CategorySlug = 'coiffure' | 'sante' | 'bricolage' | 'auto' | 'sport' | 'services';

export type CategoryJob = { slug: string; name_fr: string; name_ar: string };
export type Category = { slug: CategorySlug; engine: Engine; name_fr: string; name_ar: string; jobs: CategoryJob[] };

/** Mirrors supabase/categories_seed.sql (categories + category_jobs). */
export const CATEGORIES: Category[] = [
  {
    slug: 'coiffure', engine: 'queue', name_fr: 'Coiffure & Beauté', name_ar: 'حلاقة وتجميل',
    jobs: [
      { slug: 'barber', name_fr: 'Coiffeur Homme / Barber', name_ar: 'حلاق رجال' },
      { slug: 'coiffeuse', name_fr: 'Coiffeuse & Esthéticienne', name_ar: 'حلاقة وتجميل النساء' },
    ],
  },
  {
    slug: 'sante', engine: 'appointment', name_fr: 'Médecins & Dentistes', name_ar: 'أطباء وعيادات',
    jobs: [
      { slug: 'dentiste', name_fr: 'Dentiste', name_ar: 'طبيب الأسنان' },
      { slug: 'generaliste', name_fr: 'Médecin Généraliste', name_ar: 'طبيب العام' },
      { slug: 'kine', name_fr: 'Kinésithérapeute', name_ar: 'مروض طبي' },
      { slug: 'infirmier', name_fr: 'Infirmier à domicile', name_ar: 'ممرض مستقل (للديار)' },
    ],
  },
  {
    slug: 'bricolage', engine: 'ondemand', name_fr: 'Plombier & Dépannage SOS', name_ar: 'بلومبي وإصلاحات منزلية',
    jobs: [
      { slug: 'plombier', name_fr: 'Plombier', name_ar: 'رصاص (بلومبي)' },
      { slug: 'electricien', name_fr: 'Électricien', name_ar: 'كهربائي (تريسيان)' },
      { slug: 'clim-frigo', name_fr: 'Technicien Clim & Frigo', name_ar: 'تقني التبريد والمكيفات' },
      { slug: 'electromenager', name_fr: 'Réparateur Électroménager', name_ar: 'مصلح الآلات المنزلية' },
      { slug: 'parabole-cameras', name_fr: 'Parabole & Caméras', name_ar: 'تقني البارابول والكاميرات' },
      { slug: 'serrurier', name_fr: 'Serrurier', name_ar: 'مصلح الأقفال والسوارت' },
      { slug: 'peintre-platrier', name_fr: 'Peintre & Plâtrier', name_ar: 'صباغ وجباس' },
      { slug: 'menuisier', name_fr: 'Menuisier Alum/Bois', name_ar: 'نجار الألومنيوم والخشب' },
    ],
  },
  {
    slug: 'auto', engine: 'queue', name_fr: 'Lavage & Mécanique Auto', name_ar: 'غسيل وميكانيك السيارات',
    jobs: [
      { slug: 'lavage-auto', name_fr: 'Lavage Auto (Centre / Domicile)', name_ar: 'غسيل السيارات (محطة أو بالدار)' },
      { slug: 'mecanicien', name_fr: 'Mécanicien & Diagnostic', name_ar: 'ميكانيكي وفحص بالـ Scanner' },
      { slug: 'electricien-auto', name_fr: 'Électricien Auto', name_ar: 'كهربائي السيارات' },
    ],
  },
  {
    slug: 'sport', engine: 'appointment', name_fr: 'Terrains & Coaching Sportif', name_ar: 'ملاعب وكوتشينغ رياضي',
    jobs: [
      { slug: 'terrain', name_fr: 'Terrain Mini-Foot / Padel', name_ar: 'ملاعب القرب (ميني فوت / بادل)' },
      { slug: 'coach', name_fr: 'Personal Trainer / Coach', name_ar: 'مدرب رياضي شخصي' },
    ],
  },
  {
    slug: 'services', engine: 'appointment', name_fr: 'Services Quotidiens', name_ar: 'خدمات يومية متنوعة',
    jobs: [
      { slug: 'menage', name_fr: 'Femme de ménage', name_ar: 'عاملة النظافة (بالساعة/بالنهار)' },
      { slug: 'transport', name_fr: 'Transport & Déménagement (Honda)', name_ar: 'ناقل البضائع والرحيل (هوندا/تريبورتور)' },
    ],
  },
];

export const categoryOf = (slug: CategorySlug) => CATEGORIES.find((c) => c.slug === slug) as Category;

export type Neighborhood = { id: string; name_fr: string; name_ar: string; lat: number; lng: number };
export type City = { id: string; name_fr: string; name_ar: string; coastal: boolean; neighborhoods: Neighborhood[] };

export const CITIES: City[] = [
  {
    id: 'casablanca', name_fr: 'Casablanca', name_ar: 'الدار البيضاء', coastal: true,
    neighborhoods: [
      { id: 'maarif', name_fr: 'Maârif', name_ar: 'المعاريف', lat: 33.586, lng: -7.63 },
      { id: 'gauthier', name_fr: 'Gauthier', name_ar: 'غوتييه', lat: 33.593, lng: -7.626 },
      { id: 'anfa', name_fr: 'Anfa', name_ar: 'أنفا', lat: 33.596, lng: -7.655 },
      { id: 'racine', name_fr: 'Racine', name_ar: 'راسين', lat: 33.5905, lng: -7.639 },
      { id: 'bourgogne', name_fr: 'Bourgogne', name_ar: 'بوركون', lat: 33.599, lng: -7.642 },
      { id: 'hay-hassani', name_fr: 'Hay Hassani', name_ar: 'الحي الحسني', lat: 33.56, lng: -7.665 },
    ],
  },
  {
    id: 'rabat', name_fr: 'Rabat', name_ar: 'الرباط', coastal: true,
    neighborhoods: [
      { id: 'agdal', name_fr: 'Agdal', name_ar: 'أكدال', lat: 34.0, lng: -6.85 },
      { id: 'hassan', name_fr: 'Hassan', name_ar: 'حسان', lat: 34.02, lng: -6.835 },
      { id: 'hay-riad', name_fr: 'Hay Riad', name_ar: 'حي الرياض', lat: 33.96, lng: -6.87 },
    ],
  },
  {
    id: 'marrakech', name_fr: 'Marrakech', name_ar: 'مراكش', coastal: false,
    neighborhoods: [
      { id: 'gueliz', name_fr: 'Guéliz', name_ar: 'كليز', lat: 31.634, lng: -8.008 },
      { id: 'hivernage', name_fr: 'Hivernage', name_ar: 'الحي الشتوي', lat: 31.623, lng: -8.015 },
      { id: 'medina', name_fr: 'Médina', name_ar: 'المدينة القديمة', lat: 31.6295, lng: -7.989 },
    ],
  },
  {
    id: 'tanger', name_fr: 'Tanger', name_ar: 'طنجة', coastal: true,
    neighborhoods: [
      { id: 'malabata', name_fr: 'Malabata', name_ar: 'مالاباطا', lat: 35.776, lng: -5.78 },
      { id: 'centre', name_fr: 'Centre-Ville', name_ar: 'وسط المدينة', lat: 35.77, lng: -5.81 },
      { id: 'iberia', name_fr: 'Iberia', name_ar: 'إيبيريا', lat: 35.78, lng: -5.825 },
    ],
  },
  {
    id: 'fes', name_fr: 'Fès', name_ar: 'فاس', coastal: false,
    neighborhoods: [
      { id: 'ville-nouvelle', name_fr: 'Ville Nouvelle', name_ar: 'المدينة الجديدة', lat: 34.033, lng: -5.0 },
      { id: 'fes-el-bali', name_fr: 'Fès El Bali', name_ar: 'فاس البالي', lat: 34.064, lng: -4.973 },
    ],
  },
  {
    id: 'agadir', name_fr: 'Agadir', name_ar: 'أكادير', coastal: true,
    neighborhoods: [
      { id: 'talborjt', name_fr: 'Talborjt', name_ar: 'تالبرجت', lat: 30.425, lng: -9.595 },
      { id: 'founty', name_fr: 'Founty', name_ar: 'فونتي', lat: 30.405, lng: -9.6 },
    ],
  },
];

export const cityById = (id: string) => CITIES.find((c) => c.id === id) ?? CITIES[0];

export type Service = { id: string; title_fr: string; title_ar: string; price: number; duration: number; active: boolean };

export type Pro = {
  id: string;
  name: string;
  category: CategorySlug;
  cityId: string;
  neighborhood_fr: string;
  neighborhood_ar: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  verified: boolean;
  isOpen: boolean;
  currentQueue: number;
  lastTicket: number;
  rating: number;
  ratingCount: number;
  services: Service[];
  /** Revenue already collected this month before today (DH). */
  monthBase: number;
  /** Subscription end (ISO) — 90-day free trial. */
  subscriptionEnd: string;
};

export type Booking = {
  id: string;
  proId: string;
  serviceId: string | null;
  type: Engine;
  status: BookingStatus;
  ticket?: number;
  scheduledAt?: string;
  address?: string;
  notes?: string;
  photo?: string;
  lat?: number;
  lng?: number;
  price: number;
  clientName: string;
  clientPhone?: string;
  walkin?: boolean;
  /** Booked by the demo client (you). */
  mine?: boolean;
  createdAt: string;
};

export type Kridi = {
  id: string;
  proId: string;
  name: string;
  phone: string;
  amount: number;
  note: string;
  paid: boolean;
  createdAt: string;
};

const DAY = 86_400_000;
const trialEnd = () => new Date(Date.now() + 90 * DAY).toISOString();

export function seedPros(): Pro[] {
  return [
    {
      id: 'p1', name: 'Salon Élégance & Barber Pro', category: 'coiffure', cityId: 'casablanca',
      neighborhood_fr: 'Maârif', neighborhood_ar: 'المعاريف', address: 'Bd Al Massira Al Khadra, Maârif',
      lat: 33.5885, lng: -7.6275, phone: '+212661000111', verified: true, isOpen: true,
      currentQueue: 12, lastTicket: 14, rating: 4.9, ratingCount: 128, monthBase: 9370, subscriptionEnd: trialEnd(),
      services: [
        { id: 's11', title_fr: 'Coupe + Barbe', title_ar: 'حلاقة + لحية', price: 50, duration: 45, active: true },
        { id: 's12', title_fr: 'Coupe Simple', title_ar: 'حلاقة عادية', price: 30, duration: 30, active: true },
        { id: 's13', title_fr: 'Soin Visage', title_ar: 'عناية بالوجه', price: 40, duration: 30, active: true },
      ],
    },
    {
      id: 'p2', name: 'Cabinet Dentaire Dr. Bennani', category: 'sante', cityId: 'rabat',
      neighborhood_fr: 'Agdal', neighborhood_ar: 'أكدال', address: 'Avenue de France, Agdal',
      lat: 34.001, lng: -6.852, phone: '+212537000222', verified: true, isOpen: true,
      currentQueue: 0, lastTicket: 0, rating: 4.9, ratingCount: 86, monthBase: 21450, subscriptionEnd: trialEnd(),
      services: [
        { id: 's21', title_fr: 'Consultation & Détartrage', title_ar: 'فحص وتنظيف الأسنان', price: 250, duration: 30, active: true },
        { id: 's22', title_fr: 'Blanchiment', title_ar: 'تبييض الأسنان', price: 1200, duration: 60, active: true },
      ],
    },
    {
      id: 'p3', name: 'Maâlem Youssef — Plomberie & Chauffage', category: 'bricolage', cityId: 'marrakech',
      neighborhood_fr: 'Guéliz', neighborhood_ar: 'كليز', address: 'Rue Mohammed El Beqal, Guéliz',
      lat: 31.643, lng: -8.0175, phone: '+212662000333', verified: true, isOpen: true,
      currentQueue: 0, lastTicket: 0, rating: 4.8, ratingCount: 64, monthBase: 6200, subscriptionEnd: trialEnd(),
      services: [
        { id: 's31', title_fr: "Réparation fuite d'eau", title_ar: 'إصلاح تسريب الماء', price: 100, duration: 60, active: true },
        { id: 's32', title_fr: 'Installation Chauffe-eau', title_ar: 'تركيب سخان الماء', price: 200, duration: 120, active: true },
        { id: 's33', title_fr: 'Débouchage urgent', title_ar: 'تسريح القنوات المستعجل', price: 150, duration: 45, active: true },
      ],
    },
    {
      id: 'p4', name: 'Lavage Auto Express Anfa', category: 'auto', cityId: 'casablanca',
      neighborhood_fr: 'Anfa', neighborhood_ar: 'أنفا', address: 'Bd d’Anfa, Anfa',
      lat: 33.588, lng: -7.655, phone: '+212663000444', verified: true, isOpen: true,
      currentQueue: 5, lastTicket: 7, rating: 4.7, ratingCount: 92, monthBase: 7480, subscriptionEnd: trialEnd(),
      services: [
        { id: 's41', title_fr: 'Lavage Complet Int/Ext', title_ar: 'غسيل كامل داخل وخارج', price: 60, duration: 40, active: true },
        { id: 's42', title_fr: 'Lavage Express', title_ar: 'غسيل سريع', price: 35, duration: 20, active: true },
      ],
    },
    {
      id: 'p5', name: 'Arena Foot 5x5', category: 'sport', cityId: 'tanger',
      neighborhood_fr: 'Malabata', neighborhood_ar: 'مالاباطا', address: 'Route de Malabata',
      lat: 35.7745, lng: -5.785, phone: '+212664000555', verified: true, isOpen: true,
      currentQueue: 0, lastTicket: 0, rating: 4.9, ratingCount: 51, monthBase: 11800, subscriptionEnd: trialEnd(),
      services: [
        { id: 's51', title_fr: 'Location Terrain 1 Heure (Soir)', title_ar: 'كراء الملعب ساعة (الليل)', price: 250, duration: 60, active: true },
        { id: 's52', title_fr: 'Location Jour', title_ar: 'كراء الملعب (النهار)', price: 150, duration: 60, active: true },
      ],
    },
    {
      id: 'p6', name: 'Hammam & Spa Nour', category: 'coiffure', cityId: 'casablanca',
      neighborhood_fr: 'Gauthier', neighborhood_ar: 'غوتييه', address: 'Rue Jean Jaurès, Gauthier',
      lat: 33.595, lng: -7.62, phone: '+212665000666', verified: false, isOpen: true,
      currentQueue: 3, lastTicket: 4, rating: 4.6, ratingCount: 40, monthBase: 5200, subscriptionEnd: trialEnd(),
      services: [
        { id: 's61', title_fr: 'Hammam traditionnel', title_ar: 'حمام بلدي', price: 70, duration: 60, active: true },
        { id: 's62', title_fr: 'Brushing', title_ar: 'براشينغ', price: 60, duration: 40, active: true },
      ],
    },
    {
      id: 'p7', name: 'Dr. Alaoui — Médecin généraliste', category: 'sante', cityId: 'casablanca',
      neighborhood_fr: 'Racine', neighborhood_ar: 'راسين', address: 'Bd Ghandi, Racine',
      lat: 33.594, lng: -7.639, phone: '+212522000777', verified: true, isOpen: true,
      currentQueue: 0, lastTicket: 0, rating: 4.8, ratingCount: 73, monthBase: 14300, subscriptionEnd: trialEnd(),
      services: [
        { id: 's71', title_fr: 'Consultation générale', title_ar: 'فحص عام', price: 200, duration: 30, active: true },
        { id: 's72', title_fr: 'Certificat médical', title_ar: 'شهادة طبية', price: 150, duration: 15, active: true },
      ],
    },
    {
      id: 'p8', name: 'Électricité Rapide Karim', category: 'bricolage', cityId: 'casablanca',
      neighborhood_fr: 'Hay Hassani', neighborhood_ar: 'الحي الحسني', address: 'Hay Hassani',
      lat: 33.567, lng: -7.648, phone: '+212666000888', verified: true, isOpen: true,
      currentQueue: 0, lastTicket: 0, rating: 4.7, ratingCount: 38, monthBase: 4100, subscriptionEnd: trialEnd(),
      services: [
        { id: 's81', title_fr: 'Dépannage électrique', title_ar: 'إصلاح الكهرباء', price: 120, duration: 60, active: true },
        { id: 's82', title_fr: 'Installation luminaire', title_ar: 'تركيب الإضاءة', price: 90, duration: 45, active: true },
      ],
    },
    {
      id: 'p9', name: 'City Foot Bourgogne', category: 'sport', cityId: 'casablanca',
      neighborhood_fr: 'Bourgogne', neighborhood_ar: 'بوركون', address: 'Rue Ibnou Katir, Bourgogne',
      lat: 33.604, lng: -7.633, phone: '+212667000999', verified: false, isOpen: true,
      currentQueue: 0, lastTicket: 0, rating: 4.6, ratingCount: 29, monthBase: 6600, subscriptionEnd: trialEnd(),
      services: [
        { id: 's91', title_fr: 'Terrain 1 Heure', title_ar: 'الملعب ساعة', price: 200, duration: 60, active: true },
      ],
    },
    {
      id: 'p10', name: 'Garage Vidange Pro', category: 'auto', cityId: 'casablanca',
      neighborhood_fr: 'Hay Hassani', neighborhood_ar: 'الحي الحسني', address: 'Route d’Azemmour',
      lat: 33.57, lng: -7.612, phone: '+212668000101', verified: true, isOpen: false,
      currentQueue: 0, lastTicket: 0, rating: 4.5, ratingCount: 47, monthBase: 8900, subscriptionEnd: trialEnd(),
      services: [
        { id: 's101', title_fr: 'Vidange complète', title_ar: 'فيدانج كامل', price: 250, duration: 30, active: true },
      ],
    },
    {
      id: 'p11', name: 'Salon Lalla Fès', category: 'coiffure', cityId: 'fes',
      neighborhood_fr: 'Ville Nouvelle', neighborhood_ar: 'المدينة الجديدة', address: 'Av. Hassan II',
      lat: 34.0345, lng: -5.002, phone: '+212669000112', verified: true, isOpen: true,
      currentQueue: 2, lastTicket: 4, rating: 4.7, ratingCount: 33, monthBase: 3900, subscriptionEnd: trialEnd(),
      services: [{ id: 's111', title_fr: 'Coiffure femme', title_ar: 'حلاقة نساء', price: 80, duration: 45, active: true }],
    },
    {
      id: 'p12', name: 'Kiné Atlas — Dr. Amrani', category: 'sante', cityId: 'agadir',
      neighborhood_fr: 'Talborjt', neighborhood_ar: 'تالبرجت', address: 'Av. du Prince Héritier',
      lat: 30.4235, lng: -9.593, phone: '+212528000113', verified: true, isOpen: true,
      currentQueue: 0, lastTicket: 0, rating: 4.8, ratingCount: 22, monthBase: 7100, subscriptionEnd: trialEnd(),
      services: [{ id: 's121', title_fr: 'Séance de kinésithérapie', title_ar: 'حصة الترويض', price: 180, duration: 45, active: true }],
    },
  ];
}

const today = (h: number, m: number) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export function seedBookings(): Booking[] {
  const now = new Date().toISOString();
  const list: Booking[] = [];
  // Salon Élégance: 11 served today, #12 in chair, #13 walk-in waiting, #14 = you.
  const names = ['Hamza', 'Omar', 'Mehdi', 'Ilyas', 'Reda', 'Anas', 'Soufiane', 'Adam', 'Zakaria', 'Nabil', 'Hicham'];
  names.forEach((n, i) =>
    list.push({ id: `b1-${i + 1}`, proId: 'p1', serviceId: i % 2 ? 's12' : 's11', type: 'queue', status: 'completed', ticket: i + 1, price: i % 2 ? 30 : 50, clientName: n, walkin: i % 3 === 0, createdAt: now }),
  );
  list.push({ id: 'b1-12', proId: 'p1', serviceId: 's11', type: 'queue', status: 'in_progress', ticket: 12, price: 50, clientName: 'Amine', createdAt: now });
  list.push({ id: 'b1-13', proId: 'p1', serviceId: 's12', type: 'queue', status: 'confirmed', ticket: 13, price: 30, clientName: 'Client sur place', walkin: true, createdAt: now });
  list.push({ id: 'b1-14', proId: 'p1', serviceId: 's11', type: 'queue', status: 'confirmed', ticket: 14, price: 50, clientName: 'Youssef', clientPhone: '+212600000001', mine: true, createdAt: now });
  // Lavage Anfa: #5 serving, #6 #7 waiting
  list.push({ id: 'b4-5', proId: 'p4', serviceId: 's41', type: 'queue', status: 'in_progress', ticket: 5, price: 60, clientName: 'Rachid', createdAt: now });
  list.push({ id: 'b4-6', proId: 'p4', serviceId: 's42', type: 'queue', status: 'confirmed', ticket: 6, price: 35, clientName: 'Client sur place', walkin: true, createdAt: now });
  list.push({ id: 'b4-7', proId: 'p4', serviceId: 's41', type: 'queue', status: 'confirmed', ticket: 7, price: 60, clientName: 'Salma', createdAt: now });
  // Hammam Nour
  list.push({ id: 'b6-3', proId: 'p6', serviceId: 's61', type: 'queue', status: 'in_progress', ticket: 3, price: 70, clientName: 'Nadia', createdAt: now });
  list.push({ id: 'b6-4', proId: 'p6', serviceId: 's62', type: 'queue', status: 'confirmed', ticket: 4, price: 60, clientName: 'Imane', createdAt: now });
  // Salon Lalla Fès
  list.push({ id: 'b11-2', proId: 'p11', serviceId: 's111', type: 'queue', status: 'in_progress', ticket: 2, price: 80, clientName: 'Khadija', createdAt: now });
  list.push({ id: 'b11-3', proId: 'p11', serviceId: 's111', type: 'queue', status: 'confirmed', ticket: 3, price: 80, clientName: 'Hajar', createdAt: now });
  list.push({ id: 'b11-4', proId: 'p11', serviceId: 's111', type: 'queue', status: 'confirmed', ticket: 4, price: 80, clientName: 'Sanae', createdAt: now });
  // Dr. Bennani: booked slots today + one pending request
  list.push({ id: 'b2-1', proId: 'p2', serviceId: 's21', type: 'appointment', status: 'confirmed', scheduledAt: today(11, 0), price: 250, clientName: 'Fatima Zahra', clientPhone: '+212661234567', createdAt: now });
  list.push({ id: 'b2-2', proId: 'p2', serviceId: 's22', type: 'appointment', status: 'confirmed', scheduledAt: today(14, 0), price: 1200, clientName: 'Mouad', clientPhone: '+212662345678', createdAt: now });
  list.push({ id: 'b2-3', proId: 'p2', serviceId: 's21', type: 'appointment', status: 'pending', scheduledAt: today(17, 0), price: 250, clientName: 'Laila', clientPhone: '+212663456789', createdAt: now });
  // Dr. Alaoui
  list.push({ id: 'b7-1', proId: 'p7', serviceId: 's71', type: 'appointment', status: 'confirmed', scheduledAt: today(10, 0), price: 200, clientName: 'Said', clientPhone: '+212664567890', createdAt: now });
  // Arena Foot
  list.push({ id: 'b5-1', proId: 'p5', serviceId: 's51', type: 'appointment', status: 'confirmed', scheduledAt: today(20, 0), price: 250, clientName: 'Équipe Malabata FC', clientPhone: '+212665678901', createdAt: now });
  return list;
}

export function seedKridi(): Kridi[] {
  const week = new Date(Date.now() - 7 * DAY).toISOString();
  const three = new Date(Date.now() - 3 * DAY).toISOString();
  return [
    { id: 'k1', proId: 'p1', name: 'Amine Tazi', phone: '+212661123456', amount: 80, note: 'Coupe + Soin - Semaine dernière', paid: false, createdAt: week },
    { id: 'k2', proId: 'p1', name: 'Yassine Idrissi', phone: '+212662987654', amount: 50, note: 'Coupe + Barbe', paid: false, createdAt: three },
  ];
}
