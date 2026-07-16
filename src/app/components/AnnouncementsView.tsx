import React, { useEffect, useState } from 'react';
import { announcementsAPI } from '../services/api';
import { Loader2, Megaphone } from 'lucide-react';

const NAVY = '#1b365d';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  target_roles: string[];
  created_at?: string;
}

const TONE: Record<string, { chip: string; label: string; bar: string }> = {
  urgent: { chip: 'bg-[#FDECEC] text-[#c0392b]', label: 'Urgent', bar: '#ef4444' },
  warning: { chip: 'bg-[#FEF3E2] text-[#b7791f]', label: 'Warning', bar: '#f59e0b' },
  success: { chip: 'bg-[#E9F7E4] text-[#3d8a22]', label: 'Update', bar: '#4ea72e' },
  info: { chip: 'bg-[#EAF1FB] text-[#1b365d]', label: 'Info', bar: '#1b365d' },
};
const toneFor = (t: string) => TONE[t] || TONE.info;

const longDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

/**
 * Read-only announcements for non-admins. Admins get AnnouncementManagement
 * instead — this deliberately has no create/edit/delete, and shows only what
 * the AnnouncementBar would show this user: active, and targeted at their role.
 */
export function AnnouncementsView({ user }: { user: { role: string } }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setLoading(true);
      const res = await announcementsAPI.getActive();
      if (res?.success) {
        // Same rule the AnnouncementBar applies: an empty target_roles means
        // everyone, otherwise the user's role must be listed.
        const mine = (res.data || []).filter((a: Announcement) =>
          !a.target_roles?.length || a.target_roles.includes(user.role)
        );
        setItems(mine);
      }
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user.role]);

  useEffect(() => {
    const interval = setInterval(() => load({ silent: true }), 60000);
    return () => clearInterval(interval);
  }, [user.role]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin" style={{ color: NAVY }} />
          <p className="text-sm">Loading announcements…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.5rem] font-semibold tracking-tight" style={{ color: NAVY }}>
          Announcements
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {items.length === 0
            ? 'Messages from the office'
            : `${items.length} active message${items.length === 1 ? '' : 's'}`}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-[#E7EDF4] bg-white py-14 text-center">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#F4F6F9] text-muted-foreground">
            <Megaphone size={20} />
          </span>
          <p className="text-sm font-medium" style={{ color: NAVY }}>No announcements</p>
          <p className="mt-0.5 text-xs text-muted-foreground">You're all caught up.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(a => {
            const tone = toneFor(a.type);
            const until = longDate(a.end_date);
            return (
              <article
                key={a.id}
                className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white"
                style={{ borderLeftWidth: '3px', borderLeftColor: tone.bar }}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.06em] ${tone.chip}`}>
                      {tone.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {longDate(a.start_date || a.created_at)}
                    </span>
                  </div>
                  <h2 className="mt-2 text-sm font-semibold" style={{ color: NAVY }}>{a.title}</h2>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/75">
                    {a.message}
                  </p>
                  {until && (
                    <p className="mt-3 text-xs text-muted-foreground">Shown until {until}</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
