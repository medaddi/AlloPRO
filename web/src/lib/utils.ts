import type { Booking, Lang, Pro } from '../data/seed';

/** Left-to-right isolate for numbers/prices/phones inside Arabic sentences. */
export const ltr = (v: string | number) => `⁦${v}⁩`;

export const formatMAD = (amount: number) => {
  const n = Math.round(amount * 100) / 100;
  const [i, d] = n.toFixed(Number.isInteger(n) ? 0 : 2).split('.');
  return `${i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}${d ? `,${d}` : ''} DH`;
};

export const distanceKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

export const formatDistance = (km: number) =>
  km < 1 ? `${Math.max(10, Math.round(km * 100) * 10)} m` : km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;

const pad = (n: number) => String(n).padStart(2, '0');
export const formatTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const isSameDay = (a: Date, b: Date) => isoDate(a) === isoDate(b);

const DAYS = {
  fr: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'],
  ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
};
const MONTHS = {
  fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر'],
};
export const shortDay = (d: Date, lang: Lang) => DAYS[lang][d.getDay()];
export const dayLabel = (d: Date, lang: Lang) => `${DAYS[lang][d.getDay()]} ${d.getDate()} ${MONTHS[lang][d.getMonth()]}`;

/** "Aujourd'hui 15:30" / "mar. 18 nov. 10:00" */
export const whenLabel = (d: Date, lang: Lang, todayWord: string, tomorrowWord: string) => {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86_400_000);
  const day = isSameDay(d, now) ? todayWord : isSameDay(d, tomorrow) ? tomorrowWord : dayLabel(d, lang);
  return `${day} ${ltr(formatTime(d))}`;
};

export const formatPhone = (e164: string) => {
  const d = e164.replace(/\D/g, '').replace(/^212/, '');
  if (d.length !== 9) return e164;
  return `+212 ${d[0]}${d.slice(1, 3)}-${d.slice(3)}`;
};

export const normalizePhone = (input: string): string | null => {
  let d = input.replace(/\D/g, '');
  if (d.startsWith('00212')) d = d.slice(5);
  else if (d.startsWith('212')) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  return /^[5-8]\d{8}$/.test(d) ? `+212${d}` : null;
};

export const waLink = (phone: string, text: string) =>
  `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;

export const directionsLink = (lat: number, lng: number, app: 'google' | 'waze') =>
  app === 'waze'
    ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

/** Tactile feedback where supported (Android Chrome). */
export const haptic = (ms = 12) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* not supported */
  }
};

export const kridiReminder = (lang: Lang, name: string, business: string, amount: number, since: Date) =>
  lang === 'ar'
    ? `السلام عليكم ${name} 👋\nهادي غير تذكير صغير من ${business}:\nباقي عندك ${ltr(formatMAD(amount))} ديال الكريدي من ${dayLabel(since, 'ar')}.\nإلا خلصتي ولا عندك شي سؤال، جاوبني هنا بلا حرج.\nالله يخليك وشكرا على الثقة 🙏`
    : `Bonjour ${name} 👋\nPetit rappel amical de ${business} :\nil reste ${formatMAD(amount)} à régler depuis le ${dayLabel(since, 'fr')}.\nSi c'est déjà fait ou si vous avez une question, répondez simplement ici.\nMerci pour votre confiance 🙏`;

export const clientToProMessage = (lang: Lang, pro: Pro, b: Booking, clientName: string) => {
  const ticket = b.ticket ? (lang === 'ar' ? `\nالنوبة ديالي: ${ltr(`#${b.ticket}`)}` : `\nMon ticket : #${b.ticket}`) : '';
  const when = b.scheduledAt ? (lang === 'ar' ? `\nالموعد: ${dayLabel(new Date(b.scheduledAt), 'ar')} ${ltr(formatTime(new Date(b.scheduledAt)))}` : `\nRDV : ${dayLabel(new Date(b.scheduledAt), 'fr')} à ${formatTime(new Date(b.scheduledAt))}`) : '';
  return lang === 'ar'
    ? `السلام عليكم ${pro.name} 👋\nأنا ${clientName}، درت حجز عن طريق ALLO LM3LM.${ticket}${when}\nشكرا 🙏`
    : `Bonjour ${pro.name} 👋\nC'est ${clientName}, j'ai réservé via ALLO LM3LM.${ticket}${when}\nMerci 🙏`;
};

/** Shrinks a picked image to keep it light in localStorage (cross-tab sync). */
export const downscaleImage = (file: File, max = 640): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('image'));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
