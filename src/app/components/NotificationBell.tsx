import React, { useEffect, useRef, useState } from 'react';
import { Bell, BellRing, ClipboardList, Megaphone, CheckCheck } from 'lucide-react';
import { notificationsAPI } from '../services/api';
import { enablePush, pushPermission } from '../services/push';

const NAVY = '#1b365d';

interface Notif {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  if (!d) return '';
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function NotificationBell({ userId }: { userId: string }) {
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [pushState, setPushState] = useState<string>('default');
  const [enabling, setEnabling] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setPushState(pushPermission()); }, []);

  const handleEnable = async () => {
    setEnabling(true);
    await enablePush(userId);
    setPushState(pushPermission());
    setEnabling(false);
  };

  const load = async () => {
    try {
      const r = await notificationsAPI.getMyNotifications(userId);
      if (r?.success) setItems(r.data || []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!userId) return;
    load();
    const t = setInterval(load, 45000);
    return () => clearInterval(t);
  }, [userId]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const unread = items.filter(n => !n.is_read).length;

  const openPanel = () => {
    setOpen(o => !o);
    if (!open) load();
  };

  const markOne = async (n: Notif) => {
    if (n.is_read) return;
    setItems(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    try { await notificationsAPI.markAsRead(n.id); } catch { /* ignore */ }
  };

  const markAll = async () => {
    if (unread === 0) return;
    setItems(prev => prev.map(x => ({ ...x, is_read: true })));
    try { await notificationsAPI.markAllAsRead(userId); } catch { /* ignore */ }
  };

  const iconFor = (t: string) => t === 'announcement'
    ? <Megaphone size={15} />
    : <ClipboardList size={15} />;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={openPanel}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-[#1b365d]"
      >
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#ef4444] px-1 text-[0.6rem] font-semibold text-white ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-[320px] overflow-hidden rounded-xl border border-[#E7EDF4] bg-white shadow-[0_20px_50px_-20px_rgba(10,23,40,0.45)]">
          <div className="flex items-center justify-between border-b border-[#E7EDF4] px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold" style={{ color: NAVY }}>Notifications</p>
              {unread > 0 && <span className="rounded-full bg-[#FDECEC] px-1.5 py-0.5 text-[0.62rem] font-semibold text-[#c0392b]">{unread}</span>}
            </div>
            {unread > 0 && (
              <button onClick={markAll} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-[#1b365d]">
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          {pushState === 'default' && (
            <div className="border-b border-[#E7EDF4] bg-[#F9FAFB] px-4 py-3">
              <p className="text-xs text-muted-foreground">Get notified even when this tab is closed.</p>
              <button onClick={handleEnable} disabled={enabling} className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#1b365d] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#142a4a] disabled:opacity-60">
                <BellRing size={13} /> {enabling ? 'Enabling…' : 'Enable browser notifications'}
              </button>
            </div>
          )}
          {pushState === 'denied' && (
            <div className="border-b border-[#E7EDF4] bg-[#FDECEC] px-4 py-2.5">
              <p className="text-xs text-[#c0392b]">Browser notifications are blocked. Enable them in your browser's site settings.</p>
            </div>
          )}

          <div className="max-h-[380px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#F4F6F9] text-muted-foreground"><Bell size={18} /></span>
                <p className="text-sm font-medium" style={{ color: NAVY }}>You're all caught up</p>
                <p className="mt-0.5 text-xs text-muted-foreground">No notifications yet.</p>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markOne(n)}
                  className={`flex w-full items-start gap-3 border-b border-[#F1F4F8] px-4 py-3 text-left transition-colors hover:bg-[#F9FBFD] ${n.is_read ? '' : 'bg-[rgba(27,54,93,0.03)]'}`}
                >
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${n.type === 'announcement' ? 'bg-[rgba(245,158,11,0.12)] text-[#b7791f]' : 'bg-[rgba(27,54,93,0.08)] text-[#1b365d]'}`}>
                    {iconFor(n.type)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[0.82rem] font-medium" style={{ color: NAVY }}>{n.title}</span>
                      {!n.is_read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#ef4444]" />}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{n.message}</span>
                    <span className="mt-1 block text-[0.62rem] text-muted-foreground/70">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
