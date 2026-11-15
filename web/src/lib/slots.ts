import type { Booking, Pro } from '../data/seed';
import { isSameDay } from './utils';

export const OPEN_HOUR = 9;
export const CLOSE_HOUR = 20;
export const SLOT_STEP = 30;

export type Slot = { time: Date; available: boolean };

/** 30-min grid 09:00 → 20:00; past (with 15 min lead) and overlapping slots are unavailable. */
export function buildSlots(day: Date, durationMin: number, pro: Pro, bookings: Booking[]): Slot[] {
  const booked = bookings
    .filter((b) => b.proId === pro.id && b.type === 'appointment' && b.scheduledAt && b.status !== 'cancelled' && isSameDay(new Date(b.scheduledAt), day))
    .map((b) => ({ start: new Date(b.scheduledAt as string).getTime(), minutes: pro.services.find((s) => s.id === b.serviceId)?.duration ?? SLOT_STEP }));
  const start = new Date(day);
  start.setHours(OPEN_HOUR, 0, 0, 0);
  const end = new Date(day);
  end.setHours(CLOSE_HOUR, 0, 0, 0);
  const minStart = Date.now() + 15 * 60_000;
  const slots: Slot[] = [];
  for (let t = start.getTime(); t + durationMin * 60_000 <= end.getTime(); t += SLOT_STEP * 60_000) {
    const slotEnd = t + durationMin * 60_000;
    const clash = booked.some((b) => t < b.start + b.minutes * 60_000 && b.start < slotEnd);
    slots.push({ time: new Date(t), available: t >= minStart && !clash });
  }
  return slots;
}

/** First free slot today or tomorrow (for the card's "Prochain créneau"). */
export function nextAvailableSlot(pro: Pro, bookings: Booking[]): Date | null {
  const duration = pro.services.find((s) => s.active)?.duration ?? SLOT_STEP;
  for (let offset = 0; offset < 3; offset++) {
    const day = new Date();
    day.setDate(day.getDate() + offset);
    day.setHours(0, 0, 0, 0);
    const free = buildSlots(day, duration, pro, bookings).find((s) => s.available);
    if (free) return free.time;
  }
  return null;
}
