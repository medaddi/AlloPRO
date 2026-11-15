/**
 * Global overlays: success confetti popup, SOS radar (watches the request live,
 * so a pro accepting from Pro Mode — even in another tab — resolves it), toast.
 */
import { useEffect, useState } from 'react';
import { Check, Store, X } from 'lucide-react';

import { useT } from '../i18n';
import { haptic } from '../lib/utils';
import { useStore } from '../store';
import { RadarSearchingAnimation, SuccessBurst } from './anim';
import { Button } from './ui';

const AUTO_ACCEPT_S = 12;

export default function Overlays() {
  return (
    <>
      <SuccessPopup />
      <RadarOverlay />
      <Toast />
    </>
  );
}

function SuccessPopup() {
  const { t } = useT();
  const success = useStore((s) => s.ui.success);
  const close = useStore((s) => s.closeSuccess);
  const setClientTab = useStore((s) => s.setClientTab);

  useEffect(() => {
    if (success) haptic(40);
  }, [success]);
  if (!success) return null;

  const title = success.kind === 'ticket' ? t('success.ticketTitle') : success.kind === 'rdv' ? t('success.rdvTitle') : t('success.sosTitle');
  const sub =
    success.kind === 'ticket' ? t('success.ticketSub') : success.kind === 'rdv' ? t('success.rdvSub') : t('success.sosSub', { name: success.proName });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal aria-label={title}>
      <button className="animate-fade absolute inset-0 bg-primary/45" onClick={close} aria-label={t('common.close')} />
      <div className="animate-sheet relative w-full rounded-t-sheet bg-white px-6 pb-6 pt-3 text-center shadow-raised sm:max-w-md sm:rounded-sheet">
        <div className="mx-auto h-1 w-10 rounded-full bg-hair sm:hidden" />
        <div className="mx-auto w-fit">
          <SuccessBurst />
        </div>
        <h2 className="text-[22px] font-bold">{title}</h2>
        <p className="mt-1.5 text-[15px] text-muted">{sub}</p>
        <p className="mt-1 text-xs font-semibold text-faint">{success.proName}</p>
        {success.kind === 'ticket' && (
          <div className="mt-4 rounded-card border border-hair bg-canvas py-3">
            <p className="text-[13px] font-semibold text-muted">{t('success.ticketLabel')}</p>
            <p className="ltr text-5xl font-bold">#{success.ticket}</p>
          </div>
        )}
        {success.kind === 'rdv' && <p className="mx-auto mt-4 w-fit rounded-full bg-open-soft px-4 py-2 text-sm font-semibold text-open-ink">{success.highlight}</p>}
        <div className="mt-5 space-y-1.5">
          <Button icon={Check} onClick={close}>
            {t('success.ok')}
          </Button>
          <Button
            variant="ghost"
            compact
            onClick={() => {
              close();
              setClientTab('bookings');
            }}
          >
            {t('success.viewBookings')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RadarOverlay() {
  const { t } = useT();
  const id = useStore((s) => s.ui.radarBookingId);
  const booking = useStore((s) => s.bookings.find((b) => b.id === id));
  const pro = useStore((s) => s.pros.find((p) => p.id === booking?.proId));
  const setRadar = useStore((s) => s.setRadar);
  const setStatus = useStore((s) => s.setBookingStatus);
  const cancel = useStore((s) => s.cancelBooking);
  const setMode = useStore((s) => s.setMode);
  const setProTab = useStore((s) => s.setProTab);
  const setActivePro = useStore((s) => s.setActivePro);
  const showToast = useStore((s) => s.showToast);
  const [left, setLeft] = useState(AUTO_ACCEPT_S);

  // Resolve when the pro answers (this tab or another one).
  useEffect(() => {
    if (!booking || !id) return;
    if (booking.status === 'confirmed' || booking.status === 'in_progress') {
      setRadar(null);
      useStore.setState((s) => ({ ui: { ...s.ui, success: { kind: 'sos', proName: pro?.name ?? '' } } }));
    } else if (booking.status === 'cancelled') {
      setRadar(null);
      showToast(t('status.cancelled'));
    }
  }, [booking?.status, id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Demo: auto-accept after a short delay if nobody answers from Pro Mode.
  useEffect(() => {
    if (!id) return;
    setLeft(AUTO_ACCEPT_S);
    const timer = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [id]);
  useEffect(() => {
    if (id && left <= 0 && useStore.getState().bookings.find((b) => b.id === id)?.status === 'pending') setStatus(id, 'confirmed');
  }, [left, id, setStatus]);

  if (!id || !booking || !pro) return null;
  return (
    <div className="animate-fade fixed inset-0 z-50 flex flex-col items-center justify-between bg-canvas px-6 py-10" role="dialog" aria-modal aria-label={t('radar.title')}>
      <div />
      <div className="flex flex-col items-center gap-4 text-center">
        <RadarSearchingAnimation size={Math.min(320, window.innerWidth - 48)} />
        <h2 className="text-xl font-bold">{t('radar.title')}</h2>
        <p className="max-w-sm text-sm text-muted">{t('radar.waiting', { name: pro.name })}</p>
        <p className="ltr text-xs font-semibold text-faint">{Math.max(0, left)} s</p>
      </div>
      <div className="w-full max-w-md space-y-2">
        <Button
          variant="secondary"
          icon={Store}
          onClick={() => {
            setActivePro(pro.id);
            setProTab('guichet');
            setMode('pro');
            setRadar(null);
          }}
        >
          {t('radar.openPro')}
        </Button>
        <Button
          variant="outline"
          icon={X}
          onClick={() => {
            cancel(id);
            setRadar(null);
          }}
        >
          {t('radar.cancel')}
        </Button>
      </div>
    </div>
  );
}

function Toast() {
  const toast = useStore((s) => s.ui.toast);
  if (!toast) return null;
  return (
    <div className="animate-sheet fixed inset-x-0 top-20 z-[60] mx-auto flex w-fit max-w-[92vw] items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-raised" role="status">
      <Check size={16} strokeWidth={3} /> {toast}
    </div>
  );
}
