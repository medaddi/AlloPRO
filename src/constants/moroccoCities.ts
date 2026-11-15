/**
 * AlloPro — Moroccan cities, neighborhoods & geo helpers.
 * Coordinates are city-center (WGS84). Map regions cover the whole Kingdom,
 * from Tanger to Lagouira, as one undivided territory.
 */

export type LatLng = { latitude: number; longitude: number };

export type MapRegion = LatLng & { latitudeDelta: number; longitudeDelta: number };

export type Neighborhood = {
  slug: string;
  name_fr: string;
  name_ar: string;
};

export type MoroccoCity = {
  slug: string;
  name_fr: string;
  name_ar: string;
  region_fr: string;
  region_ar: string;
  coords: LatLng;
  /** Zoom level used when the map centers on this city. */
  delta: number;
  neighborhoods: Neighborhood[];
  /** Cities where AlloPro is actively onboarding pros (shown first in the selector). */
  launch: boolean;
};

const centre = (): Neighborhood => ({ slug: 'centre-ville', name_fr: 'Centre-Ville', name_ar: 'وسط المدينة' });

export const MOROCCO_CITIES: MoroccoCity[] = [
  {
    slug: 'casablanca',
    name_fr: 'Casablanca',
    name_ar: 'الدار البيضاء',
    region_fr: 'Casablanca-Settat',
    region_ar: 'الدار البيضاء-سطات',
    coords: { latitude: 33.5731, longitude: -7.5898 },
    delta: 0.18,
    launch: true,
    neighborhoods: [
      { slug: 'maarif', name_fr: 'Maârif', name_ar: 'المعاريف' },
      { slug: 'gauthier', name_fr: 'Gauthier', name_ar: 'غوتييه' },
      { slug: 'racine', name_fr: 'Racine', name_ar: 'راسين' },
      { slug: 'bourgogne', name_fr: 'Bourgogne', name_ar: 'بوركون' },
      { slug: 'anfa', name_fr: 'Anfa', name_ar: 'أنفا' },
      { slug: 'ain-diab', name_fr: 'Aïn Diab', name_ar: 'عين الذئاب' },
      { slug: 'californie', name_fr: 'Californie', name_ar: 'كاليفورنيا' },
      { slug: 'belvedere', name_fr: 'Belvédère', name_ar: 'بلفدير' },
      { slug: 'hay-hassani', name_fr: 'Hay Hassani', name_ar: 'الحي الحسني' },
      { slug: 'oulfa', name_fr: 'Oulfa', name_ar: 'الألفة' },
      { slug: 'sidi-maarouf', name_fr: 'Sidi Maârouf', name_ar: 'سيدي معروف' },
      { slug: 'derb-sultan', name_fr: 'Derb Sultan', name_ar: 'درب السلطان' },
      { slug: 'hay-mohammadi', name_fr: 'Hay Mohammadi', name_ar: 'الحي المحمدي' },
      { slug: 'ain-sebaa', name_fr: 'Aïn Sebaâ', name_ar: 'عين السبع' },
      { slug: 'sidi-bernoussi', name_fr: 'Sidi Bernoussi', name_ar: 'سيدي البرنوصي' },
    ],
  },
  {
    slug: 'rabat',
    name_fr: 'Rabat',
    name_ar: 'الرباط',
    region_fr: 'Rabat-Salé-Kénitra',
    region_ar: 'الرباط-سلا-القنيطرة',
    coords: { latitude: 34.0209, longitude: -6.8416 },
    delta: 0.12,
    launch: true,
    neighborhoods: [
      { slug: 'agdal', name_fr: 'Agdal', name_ar: 'أكدال' },
      { slug: 'hay-riad', name_fr: 'Hay Riad', name_ar: 'حي الرياض' },
      { slug: 'hassan', name_fr: 'Hassan', name_ar: 'حسان' },
      { slug: 'souissi', name_fr: 'Souissi', name_ar: 'السويسي' },
      { slug: 'ocean', name_fr: 'Océan', name_ar: 'المحيط' },
      { slug: 'yacoub-el-mansour', name_fr: 'Yacoub El Mansour', name_ar: 'يعقوب المنصور' },
      { slug: 'akkari', name_fr: 'Akkari', name_ar: 'العكاري' },
      { slug: 'takaddoum', name_fr: 'Takaddoum', name_ar: 'التقدم' },
    ],
  },
  {
    slug: 'sale',
    name_fr: 'Salé',
    name_ar: 'سلا',
    region_fr: 'Rabat-Salé-Kénitra',
    region_ar: 'الرباط-سلا-القنيطرة',
    coords: { latitude: 34.0531, longitude: -6.7985 },
    delta: 0.12,
    launch: false,
    neighborhoods: [
      centre(),
      { slug: 'tabriquet', name_fr: 'Tabriquet', name_ar: 'تابريكت' },
      { slug: 'hay-salam', name_fr: 'Hay Salam', name_ar: 'حي السلام' },
      { slug: 'bettana', name_fr: 'Bettana', name_ar: 'بطانة' },
      { slug: 'sidi-moussa', name_fr: 'Sidi Moussa', name_ar: 'سيدي موسى' },
    ],
  },
  {
    slug: 'temara',
    name_fr: 'Témara',
    name_ar: 'تمارة',
    region_fr: 'Rabat-Salé-Kénitra',
    region_ar: 'الرباط-سلا-القنيطرة',
    coords: { latitude: 33.9287, longitude: -6.9063 },
    delta: 0.1,
    launch: false,
    neighborhoods: [centre(), { slug: 'harhoura', name_fr: 'Harhoura', name_ar: 'الهرهورة' }],
  },
  {
    slug: 'marrakech',
    name_fr: 'Marrakech',
    name_ar: 'مراكش',
    region_fr: 'Marrakech-Safi',
    region_ar: 'مراكش-آسفي',
    coords: { latitude: 31.6295, longitude: -7.9811 },
    delta: 0.14,
    launch: true,
    neighborhoods: [
      { slug: 'gueliz', name_fr: 'Guéliz', name_ar: 'كليز' },
      { slug: 'hivernage', name_fr: 'Hivernage', name_ar: 'الحي الشتوي' },
      { slug: 'medina', name_fr: 'Médina', name_ar: 'المدينة القديمة' },
      { slug: 'daoudiate', name_fr: 'Daoudiate', name_ar: 'الداوديات' },
      { slug: 'massira', name_fr: 'Massira', name_ar: 'المسيرة' },
      { slug: 'targa', name_fr: 'Targa', name_ar: 'تاركة' },
      { slug: 'mhamid', name_fr: "M'hamid", name_ar: 'امحاميد' },
      { slug: 'sidi-youssef-ben-ali', name_fr: 'Sidi Youssef Ben Ali', name_ar: 'سيدي يوسف بن علي' },
    ],
  },
  {
    slug: 'tanger',
    name_fr: 'Tanger',
    name_ar: 'طنجة',
    region_fr: 'Tanger-Tétouan-Al Hoceïma',
    region_ar: 'طنجة-تطوان-الحسيمة',
    coords: { latitude: 35.7595, longitude: -5.834 },
    delta: 0.14,
    launch: true,
    neighborhoods: [
      centre(),
      { slug: 'malabata', name_fr: 'Malabata', name_ar: 'مالاباطا' },
      { slug: 'iberia', name_fr: 'Iberia', name_ar: 'إيبيريا' },
      { slug: 'marshan', name_fr: 'Marshan', name_ar: 'مرشان' },
      { slug: 'mesnana', name_fr: 'Mesnana', name_ar: 'مسنانة' },
      { slug: 'branes', name_fr: 'Branes', name_ar: 'البرانص' },
      { slug: 'beni-makada', name_fr: 'Beni Makada', name_ar: 'بني مكادة' },
    ],
  },
  {
    slug: 'fes',
    name_fr: 'Fès',
    name_ar: 'فاس',
    region_fr: 'Fès-Meknès',
    region_ar: 'فاس-مكناس',
    coords: { latitude: 34.0181, longitude: -5.0078 },
    delta: 0.14,
    launch: false,
    neighborhoods: [
      { slug: 'ville-nouvelle', name_fr: 'Ville Nouvelle', name_ar: 'المدينة الجديدة' },
      { slug: 'fes-el-bali', name_fr: 'Fès El Bali', name_ar: 'فاس البالي' },
      { slug: 'saiss', name_fr: 'Saïss', name_ar: 'سايس' },
      { slug: 'narjiss', name_fr: 'Narjiss', name_ar: 'النرجس' },
      { slug: 'zouagha', name_fr: 'Zouagha', name_ar: 'زواغة' },
      { slug: 'atlas', name_fr: 'Atlas', name_ar: 'الأطلس' },
    ],
  },
  {
    slug: 'meknes',
    name_fr: 'Meknès',
    name_ar: 'مكناس',
    region_fr: 'Fès-Meknès',
    region_ar: 'فاس-مكناس',
    coords: { latitude: 33.8935, longitude: -5.5473 },
    delta: 0.12,
    launch: false,
    neighborhoods: [
      { slug: 'hamria', name_fr: 'Hamria', name_ar: 'حمرية' },
      { slug: 'medina', name_fr: 'Médina', name_ar: 'المدينة القديمة' },
      { slug: 'bassatine', name_fr: 'Bassatine', name_ar: 'البساتين' },
      { slug: 'zitoune', name_fr: 'Zitoune', name_ar: 'الزيتون' },
      { slug: 'marjane', name_fr: 'Marjane', name_ar: 'مرجان' },
    ],
  },
  {
    slug: 'agadir',
    name_fr: 'Agadir',
    name_ar: 'أكادير',
    region_fr: 'Souss-Massa',
    region_ar: 'سوس-ماسة',
    coords: { latitude: 30.4278, longitude: -9.5981 },
    delta: 0.14,
    launch: false,
    neighborhoods: [
      { slug: 'talborjt', name_fr: 'Talborjt', name_ar: 'تالبرجت' },
      { slug: 'founty', name_fr: 'Founty', name_ar: 'فونتي' },
      { slug: 'charaf', name_fr: 'Charaf', name_ar: 'الشرف' },
      { slug: 'hay-salam', name_fr: 'Hay Salam', name_ar: 'حي السلام' },
      { slug: 'hay-mohammadi', name_fr: 'Hay Mohammadi', name_ar: 'الحي المحمدي' },
      { slug: 'tikiouine', name_fr: 'Tikiouine', name_ar: 'تيكيوين' },
    ],
  },
  {
    slug: 'oujda',
    name_fr: 'Oujda',
    name_ar: 'وجدة',
    region_fr: "L'Oriental",
    region_ar: 'جهة الشرق',
    coords: { latitude: 34.6814, longitude: -1.9086 },
    delta: 0.12,
    launch: false,
    neighborhoods: [
      centre(),
      { slug: 'lazaret', name_fr: 'Lazaret', name_ar: 'لازاري' },
      { slug: 'al-qods', name_fr: 'Al Qods', name_ar: 'القدس' },
      { slug: 'sidi-maafa', name_fr: 'Sidi Maâfa', name_ar: 'سيدي معافة' },
    ],
  },
  {
    slug: 'tetouan',
    name_fr: 'Tétouan',
    name_ar: 'تطوان',
    region_fr: 'Tanger-Tétouan-Al Hoceïma',
    region_ar: 'طنجة-تطوان-الحسيمة',
    coords: { latitude: 35.5785, longitude: -5.3684 },
    delta: 0.1,
    launch: false,
    neighborhoods: [
      centre(),
      { slug: 'medina', name_fr: 'Médina', name_ar: 'المدينة العتيقة' },
      { slug: 'mhannech', name_fr: "M'hannech", name_ar: 'امهنش' },
      { slug: 'touabel', name_fr: 'Touabel', name_ar: 'الطوابل' },
    ],
  },
  {
    slug: 'kenitra',
    name_fr: 'Kénitra',
    name_ar: 'القنيطرة',
    region_fr: 'Rabat-Salé-Kénitra',
    region_ar: 'الرباط-سلا-القنيطرة',
    coords: { latitude: 34.261, longitude: -6.5802 },
    delta: 0.1,
    launch: false,
    neighborhoods: [centre(), { slug: 'mimosas', name_fr: 'Mimosas', name_ar: 'الميموزا' }, { slug: 'bir-rami', name_fr: 'Bir Rami', name_ar: 'بئر الرامي' }],
  },
  {
    slug: 'mohammedia',
    name_fr: 'Mohammedia',
    name_ar: 'المحمدية',
    region_fr: 'Casablanca-Settat',
    region_ar: 'الدار البيضاء-سطات',
    coords: { latitude: 33.6866, longitude: -7.383 },
    delta: 0.08,
    launch: false,
    neighborhoods: [centre(), { slug: 'la-colline', name_fr: 'La Colline', name_ar: 'لاكولين' }],
  },
  {
    slug: 'el-jadida',
    name_fr: 'El Jadida',
    name_ar: 'الجديدة',
    region_fr: 'Casablanca-Settat',
    region_ar: 'الدار البيضاء-سطات',
    coords: { latitude: 33.2316, longitude: -8.5007 },
    delta: 0.08,
    launch: false,
    neighborhoods: [centre()],
  },
  {
    slug: 'safi',
    name_fr: 'Safi',
    name_ar: 'آسفي',
    region_fr: 'Marrakech-Safi',
    region_ar: 'مراكش-آسفي',
    coords: { latitude: 32.2994, longitude: -9.2372 },
    delta: 0.08,
    launch: false,
    neighborhoods: [centre()],
  },
  {
    slug: 'essaouira',
    name_fr: 'Essaouira',
    name_ar: 'الصويرة',
    region_fr: 'Marrakech-Safi',
    region_ar: 'مراكش-آسفي',
    coords: { latitude: 31.5085, longitude: -9.7595 },
    delta: 0.06,
    launch: false,
    neighborhoods: [centre()],
  },
  {
    slug: 'beni-mellal',
    name_fr: 'Béni Mellal',
    name_ar: 'بني ملال',
    region_fr: 'Béni Mellal-Khénifra',
    region_ar: 'بني ملال-خنيفرة',
    coords: { latitude: 32.3373, longitude: -6.3498 },
    delta: 0.08,
    launch: false,
    neighborhoods: [centre()],
  },
  {
    slug: 'nador',
    name_fr: 'Nador',
    name_ar: 'الناظور',
    region_fr: "L'Oriental",
    region_ar: 'جهة الشرق',
    coords: { latitude: 35.1681, longitude: -2.9335 },
    delta: 0.08,
    launch: false,
    neighborhoods: [centre()],
  },
  {
    slug: 'ouarzazate',
    name_fr: 'Ouarzazate',
    name_ar: 'ورزازات',
    region_fr: 'Drâa-Tafilalet',
    region_ar: 'درعة-تافيلالت',
    coords: { latitude: 30.9189, longitude: -6.8934 },
    delta: 0.08,
    launch: false,
    neighborhoods: [centre()],
  },
  {
    slug: 'laayoune',
    name_fr: 'Laâyoune',
    name_ar: 'العيون',
    region_fr: 'Laâyoune-Sakia El Hamra',
    region_ar: 'العيون-الساقية الحمراء',
    coords: { latitude: 27.1253, longitude: -13.1625 },
    delta: 0.1,
    launch: false,
    neighborhoods: [centre()],
  },
  {
    slug: 'dakhla',
    name_fr: 'Dakhla',
    name_ar: 'الداخلة',
    region_fr: 'Dakhla-Oued Ed-Dahab',
    region_ar: 'الداخلة-وادي الذهب',
    coords: { latitude: 23.6848, longitude: -15.958 },
    delta: 0.1,
    launch: false,
    neighborhoods: [centre()],
  },
];

export const DEFAULT_CITY_SLUG = 'casablanca';
export const DEFAULT_NEIGHBORHOOD_SLUG = 'maarif';

/** Whole Kingdom of Morocco, Tanger (35.9°N) to Lagouira (20.8°N). */
export const MOROCCO_BOUNDS = {
  north: 35.95,
  south: 20.75,
  west: -17.15,
  east: -0.95,
} as const;

export const MOROCCO_REGION: MapRegion = {
  latitude: (MOROCCO_BOUNDS.north + MOROCCO_BOUNDS.south) / 2,
  longitude: (MOROCCO_BOUNDS.west + MOROCCO_BOUNDS.east) / 2,
  latitudeDelta: MOROCCO_BOUNDS.north - MOROCCO_BOUNDS.south + 1,
  longitudeDelta: MOROCCO_BOUNDS.east - MOROCCO_BOUNDS.west + 1,
};

/* -------------------------------------------------------------------------- */
/*                                   LOOKUPS                                  */
/* -------------------------------------------------------------------------- */

const citiesBySlug = new Map(MOROCCO_CITIES.map((c) => [c.slug, c]));

export const getCity = (slug: string | null | undefined): MoroccoCity =>
  (slug ? citiesBySlug.get(slug) : undefined) ?? (citiesBySlug.get(DEFAULT_CITY_SLUG) as MoroccoCity);

/** Matches the free-text `city` column in Supabase ('Casablanca', 'Fès', …). */
export const findCityByName = (name: string | null | undefined): MoroccoCity | undefined => {
  if (!name) return undefined;
  const needle = normalizeLatin(name);
  return MOROCCO_CITIES.find(
    (c) => normalizeLatin(c.name_fr) === needle || c.slug === needle || c.name_ar === name.trim(),
  );
};

export const getNeighborhood = (city: MoroccoCity, slug: string | null | undefined): Neighborhood =>
  city.neighborhoods.find((n) => n.slug === slug) ?? city.neighborhoods[0];

export const getCityName = (city: MoroccoCity, lang: 'fr' | 'ar'): string =>
  lang === 'ar' ? city.name_ar : city.name_fr;

export const getNeighborhoodName = (n: Neighborhood, lang: 'fr' | 'ar'): string =>
  lang === 'ar' ? n.name_ar : n.name_fr;

/** "Casablanca - Maârif" / "الدار البيضاء - المعاريف" */
export const formatLocationLabel = (city: MoroccoCity, n: Neighborhood | undefined, lang: 'fr' | 'ar'): string =>
  n ? `${getCityName(city, lang)} - ${getNeighborhoodName(n, lang)}` : getCityName(city, lang);

/** Launch cities first, then alphabetical in the active language. */
export const getSortedCities = (lang: 'fr' | 'ar'): MoroccoCity[] =>
  [...MOROCCO_CITIES].sort((a, b) => {
    if (a.launch !== b.launch) return a.launch ? -1 : 1;
    return getCityName(a, lang).localeCompare(getCityName(b, lang), lang);
  });

export const cityRegion = (city: MoroccoCity): MapRegion => ({
  ...city.coords,
  latitudeDelta: city.delta,
  longitudeDelta: city.delta,
});

/* -------------------------------------------------------------------------- */
/*                                GEO HELPERS                                 */
/* -------------------------------------------------------------------------- */

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in kilometers (Haversine). */
export const distanceKm = (a: LatLng, b: LatLng): number => {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
};

/** "350 m" / "1.2 km" / "12 km" — always LTR digits. */
export const formatDistance = (km: number): string => {
  if (!Number.isFinite(km)) return '';
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
};

/** Closest AlloPro city to a GPS position (used after expo-location permission). */
export const nearestCity = (pos: LatLng): MoroccoCity => {
  let best = MOROCCO_CITIES[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const city of MOROCCO_CITIES) {
    const d = distanceKm(pos, city.coords);
    if (d < bestDist) {
      bestDist = d;
      best = city;
    }
  }
  return best;
};

export const isInsideMorocco = (pos: LatLng): boolean =>
  pos.latitude <= MOROCCO_BOUNDS.north &&
  pos.latitude >= MOROCCO_BOUNDS.south &&
  pos.longitude >= MOROCCO_BOUNDS.west &&
  pos.longitude <= MOROCCO_BOUNDS.east;

function normalizeLatin(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
