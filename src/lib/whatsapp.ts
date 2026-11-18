/**
 * ALLO LM3LM — WhatsApp & phone helpers with pre-filled FR / Darija (ar) templates.
 * Numbers, prices, tickets and times are wrapped in Unicode LTR isolates so they
 * stay readable ("#14", "50 DH", "15:30", "+212 6…") inside Arabic messages.
 */
import { Linking } from 'react-native';

export type MessageLang = 'fr' | 'ar';
export type Engine = 'queue' | 'appointment' | 'ondemand';

/* -------------------------------------------------------------------------- */
/*                              BIDI & FORMATTING                             */
/* -------------------------------------------------------------------------- */

const LRI = '⁦'; // Left-to-Right Isolate
const PDI = '⁩'; // Pop Directional Isolate

/** Forces a fragment to render LTR inside any paragraph direction. */
export const ltr = (value: string | number): string => `${LRI}${value}${PDI}`;

/** 1250 → "1 250 DH", 49.5 → "49,50 DH" (French-style grouping, always LTR digits). */
export const formatMAD = (amount: number): string => {
  const safe = Number.isFinite(amount) ? amount : 0;
  const isInt = Math.abs(safe - Math.round(safe)) < 0.005;
  const fixed = isInt ? String(Math.round(safe)) : safe.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const sign = intPart.startsWith('-') ? '-' : '';
  const digits = sign ? intPart.slice(1) : intPart;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}${grouped}${decPart ? `,${decPart}` : ''} DH`;
};

const pad2 = (n: number) => String(n).padStart(2, '0');

/** "15:30" */
export const formatTime = (date: Date): string => `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

const DAYS = {
  fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
  ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
} as const;

/** Moroccan month names (يناير … دجنبر) as used in daily life in Morocco. */
const MONTHS = {
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر'],
} as const;

/** Short weekday for date strips: "lun." / "الاثنين". */
export const shortDayName = (date: Date, lang: MessageLang): string =>
  lang === 'ar' ? DAYS.ar[date.getDay()] : `${DAYS.fr[date.getDay()].slice(0, 3)}.`;

/** Short month for date strips: "nov." / "نونبر". */
export const shortMonthName = (date: Date, lang: MessageLang): string =>
  lang === 'ar' ? MONTHS.ar[date.getMonth()] : `${MONTHS.fr[date.getMonth()].slice(0, 4).replace(/\.$/, '')}.`;

/** "mardi 12 novembre" / "الثلاثاء 12 نونبر" */
export const formatDayLabel = (date: Date, lang: MessageLang): string =>
  `${DAYS[lang][date.getDay()]} ${lang === 'ar' ? ltr(date.getDate()) : date.getDate()} ${MONTHS[lang][date.getMonth()]}`;

/* -------------------------------------------------------------------------- */
/*                           MOROCCAN PHONE NUMBERS                           */
/* -------------------------------------------------------------------------- */

/**
 * Normalizes any Moroccan number to international digits without "+":
 * "06 12 34 56 78", "+212612345678", "00212 6-12-34-56-78", "612345678" → "212612345678".
 * Returns null if it is not a valid Moroccan number (05/06/07/08 + 8 digits).
 */
export const normalizeMoroccanPhone = (input: string | null | undefined): string | null => {
  if (!input) return null;
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('00212')) digits = digits.slice(5);
  else if (digits.startsWith('212')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  // Some people type "+212 06…": drop the redundant trunk zero once more.
  if (digits.length === 10 && digits.startsWith('0')) digits = digits.slice(1);
  if (!/^[5-8]\d{8}$/.test(digits)) return null;
  return `212${digits}`;
};

/** Mobile lines only (06 / 07) — the ones that can have WhatsApp & receive OTP SMS. */
export const isMoroccanMobile = (input: string | null | undefined): boolean => {
  const n = normalizeMoroccanPhone(input);
  return !!n && /^212[67]/.test(n);
};

/** E.164 for Supabase phone auth: "+212612345678". */
export const toE164 = (input: string | null | undefined): string | null => {
  const n = normalizeMoroccanPhone(input);
  return n ? `+${n}` : null;
};

/** Display format, always LTR: "+212 6 12 34 56 78". */
export const formatMoroccanPhone = (input: string | null | undefined): string => {
  const n = normalizeMoroccanPhone(input);
  if (!n) return input ?? '';
  const local = n.slice(3);
  return `+212 ${local[0]} ${local.slice(1, 3)} ${local.slice(3, 5)} ${local.slice(5, 7)} ${local.slice(7, 9)}`;
};

/* -------------------------------------------------------------------------- */
/*                                 TEMPLATES                                  */
/* -------------------------------------------------------------------------- */

type BaseCtx = {
  lang: MessageLang;
  businessName: string;
};

export type ClientToProCtx = BaseCtx & {
  clientName: string;
  engine: Engine;
  serviceName?: string | null;
  ticketNumber?: number | null;
  scheduledAt?: Date | null;
  address?: string | null;
  issueNotes?: string | null;
};

/** Client → Pro: "I booked via ALLO LM3LM" (sent from the booking tracker once confirmed). */
export const buildClientToProMessage = (c: ClientToProCtx): string => {
  const svc = c.serviceName?.trim();
  if (c.lang === 'ar') {
    const lines = [`السلام عليكم ${c.businessName} 👋`, `أنا ${c.clientName}، درت حجز عن طريق ALLO LM3LM.`];
    if (svc) lines.push(`الخدمة: ${svc}`);
    if (c.engine === 'queue' && c.ticketNumber != null) lines.push(`النوبة ديالي: ${ltr(`#${c.ticketNumber}`)}`);
    if (c.engine === 'appointment' && c.scheduledAt)
      lines.push(`الموعد: ${formatDayLabel(c.scheduledAt, 'ar')} مع ${ltr(formatTime(c.scheduledAt))}`);
    if (c.engine === 'ondemand') {
      if (c.address) lines.push(`العنوان: ${c.address}`);
      if (c.issueNotes) lines.push(`المشكل: ${c.issueNotes}`);
    }
    lines.push('شكرا 🙏');
    return lines.join('\n');
  }
  const lines = [`Bonjour ${c.businessName} 👋`, `C'est ${c.clientName}, j'ai réservé via ALLO LM3LM.`];
  if (svc) lines.push(`Service : ${svc}`);
  if (c.engine === 'queue' && c.ticketNumber != null) lines.push(`Mon ticket : #${c.ticketNumber}`);
  if (c.engine === 'appointment' && c.scheduledAt)
    lines.push(`Rendez-vous : ${formatDayLabel(c.scheduledAt, 'fr')} à ${formatTime(c.scheduledAt)}`);
  if (c.engine === 'ondemand') {
    if (c.address) lines.push(`Adresse : ${c.address}`);
    if (c.issueNotes) lines.push(`Problème : ${c.issueNotes}`);
  }
  lines.push('Merci 🙏');
  return lines.join('\n');
};

export type ProConfirmationCtx = BaseCtx & {
  clientName: string;
  engine: Engine;
  serviceName?: string | null;
  price?: number | null;
  ticketNumber?: number | null;
  peopleAhead?: number | null;
  scheduledAt?: Date | null;
  etaMinutes?: number | null;
  address?: string | null;
};

/** Pro → Client: booking confirmation (queue ticket, appointment or SOS dispatch). */
export const buildProConfirmationMessage = (c: ProConfirmationCtx): string => {
  const svc = c.serviceName?.trim();
  const hasPrice = c.price != null && c.price > 0;
  if (c.lang === 'ar') {
    const lines = [`السلام عليكم ${c.clientName} 👋`, `${c.businessName} أكد الحجز ديالك ✅`];
    if (svc) lines.push(`الخدمة: ${svc}${hasPrice ? ` — ${ltr(formatMAD(c.price as number))}` : ''}`);
    if (c.engine === 'queue' && c.ticketNumber != null) {
      lines.push(`النوبة ديالك: ${ltr(`#${c.ticketNumber}`)}`);
      if (c.peopleAhead != null)
        lines.push(c.peopleAhead > 0 ? `قدامك ${ltr(c.peopleAhead)} ديال الناس.` : 'نوبتك جات، مرحبا بيك!');
      lines.push('غادي يوصلك إشعار فاش تقرب نوبتك.');
    }
    if (c.engine === 'appointment' && c.scheduledAt)
      lines.push(`الموعد: ${formatDayLabel(c.scheduledAt, 'ar')} مع ${ltr(formatTime(c.scheduledAt))}. عافاك جي قبل بـ ${ltr(10)} دقايق.`);
    if (c.engine === 'ondemand') {
      if (c.etaMinutes != null) lines.push(`المعلم جاي فالطريق، غادي يوصل تقريبا فـ ${ltr(c.etaMinutes)} دقيقة 🛠️`);
      if (c.address) lines.push(`العنوان: ${c.address}`);
    }
    lines.push('شكرا على الثقة — ALLO LM3LM');
    return lines.join('\n');
  }
  const lines = [`Bonjour ${c.clientName} 👋`, `${c.businessName} a confirmé votre réservation ✅`];
  if (svc) lines.push(`Service : ${svc}${hasPrice ? ` — ${formatMAD(c.price as number)}` : ''}`);
  if (c.engine === 'queue' && c.ticketNumber != null) {
    lines.push(`Votre ticket : #${c.ticketNumber}`);
    if (c.peopleAhead != null)
      lines.push(
        c.peopleAhead > 0
          ? `${c.peopleAhead} personne${c.peopleAhead > 1 ? 's' : ''} devant vous.`
          : "C'est votre tour, bienvenue !",
      );
    lines.push('Vous recevrez une notification quand votre tour approche.');
  }
  if (c.engine === 'appointment' && c.scheduledAt)
    lines.push(
      `Rendez-vous : ${formatDayLabel(c.scheduledAt, 'fr')} à ${formatTime(c.scheduledAt)}. Merci d'arriver 10 min en avance.`,
    );
  if (c.engine === 'ondemand') {
    if (c.etaMinutes != null) lines.push(`L'artisan est en route, arrivée estimée dans ~${c.etaMinutes} min 🛠️`);
    if (c.address) lines.push(`Adresse : ${c.address}`);
  }
  lines.push('Merci pour votre confiance — ALLO LM3LM');
  return lines.join('\n');
};

export type QueueTurnCtx = BaseCtx & { clientName: string; ticketNumber: number };

/** Pro → Client: "your turn is next" nudge (used if push notification is not delivered). */
export const buildQueueTurnMessage = (c: QueueTurnCtx): string =>
  c.lang === 'ar'
    ? `السلام عليكم ${c.clientName} 👋\nنوبتك ${ltr(`#${c.ticketNumber}`)} قربات عند ${c.businessName}. عافاك قرب للمحل دابا 🙏`
    : `Bonjour ${c.clientName} 👋\nVotre tour (#${c.ticketNumber}) approche chez ${c.businessName}. Merci de vous rapprocher du salon maintenant 🙏`;

export type KridiReminderCtx = BaseCtx & {
  clientName: string;
  amount: number;
  since?: Date | null;
  note?: string | null;
};

/** Pro → Client: polite Kridi (unpaid balance) reminder. */
export const buildKridiReminderMessage = (c: KridiReminderCtx): string => {
  const note = c.note?.trim();
  if (c.lang === 'ar') {
    const since = c.since ? ` من ${formatDayLabel(c.since, 'ar')}` : '';
    return [
      `السلام عليكم ${c.clientName} 👋`,
      `هادي غير تذكير صغير من ${c.businessName}:`,
      `باقي عندك ${ltr(formatMAD(c.amount))} ديال الكريدي${since}.`,
      ...(note ? [`(${note})`] : []),
      'إلا خلصتي ولا عندك شي سؤال، جاوبني هنا بلا حرج.',
      'الله يخليك وشكرا على الثقة 🙏',
    ].join('\n');
  }
  const since = c.since ? ` depuis le ${formatDayLabel(c.since, 'fr')}` : '';
  return [
    `Bonjour ${c.clientName} 👋`,
    `Petit rappel amical de ${c.businessName} :`,
    `il reste ${formatMAD(c.amount)} à régler${since}.`,
    ...(note ? [`(${note})`] : []),
    "Si c'est déjà fait ou si vous avez une question, répondez simplement ici.",
    'Merci pour votre confiance 🙏',
  ].join('\n');
};

/** Pro → Client: thank-you once the Kridi is marked as paid. */
export const buildKridiPaidMessage = (c: BaseCtx & { clientName: string; amount: number }): string =>
  c.lang === 'ar'
    ? `السلام عليكم ${c.clientName} 👋\nتوصلنا بـ ${ltr(formatMAD(c.amount))}، الكريدي تخلص ✅\nبارك الله فيك — ${c.businessName}`
    : `Bonjour ${c.clientName} 👋\nPaiement de ${formatMAD(c.amount)} bien reçu, votre crédit est soldé ✅\nMerci beaucoup — ${c.businessName}`;

/* -------------------------------------------------------------------------- */
/*                                  LAUNCHERS                                 */
/* -------------------------------------------------------------------------- */

export const buildWhatsAppUrl = (phone: string, message?: string): string | null => {
  const n = normalizeMoroccanPhone(phone);
  if (!n) return null;
  return message ? `https://wa.me/${n}?text=${encodeURIComponent(message)}` : `https://wa.me/${n}`;
};

/**
 * Opens WhatsApp (app first, then wa.me web fallback).
 * Returns false when the number is invalid or nothing could be opened.
 */
export async function openWhatsApp(phone: string, message?: string): Promise<boolean> {
  const n = normalizeMoroccanPhone(phone);
  if (!n) return false;
  const text = message ? `&text=${encodeURIComponent(message)}` : '';
  try {
    await Linking.openURL(`whatsapp://send?phone=${n}${text}`);
    return true;
  } catch {
    const web = buildWhatsAppUrl(n, message);
    if (!web) return false;
    try {
      await Linking.openURL(web);
      return true;
    } catch {
      return false;
    }
  }
}

/** Opens the native dialer with the number pre-filled. */
export async function callPhone(phone: string): Promise<boolean> {
  const e164 = toE164(phone);
  if (!e164) return false;
  try {
    await Linking.openURL(`tel:${e164}`);
    return true;
  } catch {
    return false;
  }
}

/** Shortcut used by the Kridi ledger "Rappel WhatsApp" button. */
export const sendKridiReminder = (phone: string, ctx: KridiReminderCtx): Promise<boolean> =>
  openWhatsApp(phone, buildKridiReminderMessage(ctx));
