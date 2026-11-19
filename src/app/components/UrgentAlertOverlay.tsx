import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { announcementsAPI } from '../services/api';
import { onChanges } from '../services/realtime';
import { isNativeApp } from '../services/push';

interface UrgentAnnouncement {
  id: string;
  title: string;
  message: string;
  created_by?: string;
  created_at?: string;
}

/**
 * Urgent announcements, full-screen, over every screen of the app.
 *
 * Ordinary announcements sit in a list nobody opens. An announcement the admin
 * marks Urgent instead covers the whole app for everyone it is aimed at, and
 * stays until they click "I've read this". The click is recorded on the server,
 * so it does not come back on another device, and the admin can see who has
 * not read it yet (AnnouncementManagement).
 *
 * A browser page cannot un-minimise its window or pull itself in front of
 * another program, so when the app is not in view this does what it can:
 * a Windows notification that stays until clicked, an alert sound, and a
 * flashing tab title. The server sends the same notification as a push (same
 * tag, so the two merge into one) for when the tab is closed altogether.
 */
export function UrgentAlertOverlay({ user }: { user: { id: string } }) {
  const [pending, setPending] = useState<UrgentAnnouncement[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const seen = useRef<Set<string>>(new Set());
  const buttonRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await announcementsAPI.getPendingUrgent(user.id);
      if (!res?.success) return;
      const list: UrgentAnnouncement[] = res.data || [];
      const fresh = list.filter(a => !seen.current.has(a.id));
      fresh.forEach(a => seen.current.add(a.id));
      if (fresh.length) alertNewArrivals(fresh);
      setPending(list);
    } catch {
      // Best-effort: the next poll or ping tries again.
    }
  }, [user.id]);

  // Not useLiveData: that skips refreshes while the tab is hidden, and a hidden
  // tab is exactly when the notification and sound are needed.
  useEffect(() => {
    load();
    const unsubscribe = onChanges(['announcements'], load);
    const timer = setInterval(load, 60_000);
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', load);
    return () => {
      unsubscribe();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', load);
    };
  }, [load]);

  const current = pending[0];

  useFlashingTitle(!!current);

  useEffect(() => {
    if (current) buttonRef.current?.focus();
    setError('');
  }, [current?.id]);

  if (!current) return null;

  const acknowledge = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await announcementsAPI.acknowledge(current.id, user.id);
      if (!res?.success) throw new Error(res?.error);
      setPending(p => p.filter(a => a.id !== current.id));
      closeSystemNotification(current.id);
    } catch {
      setError('Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const sent = current.created_at
    ? new Date(current.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#2a0a0a]/75 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="urgent-alert-title"
      aria-describedby="urgent-alert-message"
    >
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_40px_120px_-20px_rgba(0,0,0,0.7)] ring-4 ring-[#ef4444]/60">
        <div className="flex items-center gap-3 bg-[#c0392b] px-6 py-4 text-white">
          <span className="flex h-10 w-10 shrink-0 animate-pulse items-center justify-center rounded-full bg-white/15">
            <AlertTriangle size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/85">Urgent message from the office</p>
            {pending.length > 1 && <p className="text-xs text-white/75">1 of {pending.length}</p>}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <h2 id="urgent-alert-title" className="text-xl font-semibold text-[#1b365d]">{current.title}</h2>
          <p id="urgent-alert-message" className="mt-3 whitespace-pre-wrap text-[0.98rem] leading-relaxed text-foreground/85">
            {current.message}
          </p>
          {(current.created_by || sent) && (
            <p className="mt-4 text-xs text-muted-foreground">
              {current.created_by && <>From {current.created_by}</>}
              {current.created_by && sent && ' · '}
              {sent}
            </p>
          )}
        </div>

        <div className="border-t border-[#F1F4F8] px-6 py-4">
          {error && <p className="mb-2 text-sm text-[#c0392b]">{error}</p>}
          <button
            ref={buttonRef}
            onClick={acknowledge}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#c0392b] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#a93226] disabled:opacity-70"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {saving ? 'Saving…' : "I've read this"}
          </button>
        </div>
      </div>
    </div>
  );
}

const tagFor = (id: string) => `urgent-${id}`;

/** Sound, plus a system notification when the app is not what they're looking at. */
function alertNewArrivals(items: UrgentAnnouncement[]) {
  playAlertSound();
  const outOfView = document.visibilityState !== 'visible' || !document.hasFocus();
  if (!outOfView || isNativeApp()) return; // the phone app gets native push instead
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.getRegistration().then(reg => {
    if (!reg) return;
    for (const a of items) {
      // Same tag as the server's push, so the two collapse into one.
      reg.showNotification(`🔴 URGENT: ${a.title}`, {
        body: a.message,
        icon: '/ca-india-logo.png',
        badge: '/ca-india-logo.png',
        tag: tagFor(a.id),
        requireInteraction: true,
        data: { url: '/?notif=announcement' },
      } as NotificationOptions).catch(() => {});
    }
  }).catch(() => {});
}

/** Once read here, clear the Windows notification too. */
function closeSystemNotification(id: string) {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.getRegistration()
    .then(reg => reg?.getNotifications({ tag: tagFor(id) }))
    .then(list => list?.forEach(n => n.close()))
    .catch(() => {});
}

/**
 * Three short tones. Browsers block sound until the person has clicked
 * somewhere on the page at least once, so this can stay silent right after a
 * reload — the notification still shows.
 */
function playAlertSound() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    ctx.resume?.().catch(() => {});
    [0, 0.35, 0.7].forEach(offset => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      const t = ctx.currentTime + offset;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1500);
  } catch {
    // No audio is fine.
  }
}

/** Flash the tab title while an alert is waiting, so it stands out in the taskbar. */
function useFlashingTitle(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const original = document.title;
    let on = false;
    const timer = setInterval(() => {
      on = !on;
      document.title = on ? '🔴 URGENT message' : original;
    }, 1000);
    return () => {
      clearInterval(timer);
      document.title = original;
    };
  }, [active]);
}
