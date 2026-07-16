import React, { useState, useEffect } from 'react';
import { loginAPI } from '../services/api';
import { History, MapPin, Globe, Check, X } from 'lucide-react';

interface LoginHistoryProps {
  userId: string;
}

const NAVY = '#1b365d';
const thCls = 'px-4 py-2.5 text-left text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground';

function browserName(ua?: string) {
  if (!ua) return 'Unknown';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  return 'Browser';
}

export function LoginHistory({ userId }: LoginHistoryProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expanded) loadHistory();
  }, [expanded, userId]);

  // Auto-refresh only while the panel is open — no point polling a collapsed one.
  useEffect(() => {
    if (!expanded) return;
    const interval = setInterval(() => loadHistory({ silent: true }), 60000);
    return () => clearInterval(interval);
  }, [expanded, userId]);

  const loadHistory = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setLoading(true);
      const response = await loginAPI.getLoginHistory(userId);
      setHistory(response.data || []);
    } catch (error) {
      console.error('Error loading login history:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-[#E7EDF4] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}>
            <History size={16} />
          </span>
          <h2 className="text-sm font-semibold" style={{ color: NAVY }}>Login History</h2>
        </div>
        {!expanded ? (
          <button onClick={() => setExpanded(true)} className="rounded-full bg-[#1b365d] px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#142a4a]">
            View history
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => setExpanded(false)} className="rounded-full border border-[#E7EDF4] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground">
              Close
            </button>
          </div>
        )}
      </div>

      {!expanded ? (
        <div className="px-5 py-4">
          <p className="text-sm text-muted-foreground">Track all login attempts and locations for security monitoring.</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" />
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F4F6F9] text-muted-foreground">
            <MapPin size={22} />
          </span>
          <p className="text-sm font-medium" style={{ color: NAVY }}>No login history yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Login history will appear here after your first login.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-[0.8rem]">
            <thead>
              <tr className="border-b border-[#E7EDF4] bg-[#F9FAFB]">
                {['Date & Time', 'Location', 'IP Address', 'Device', 'Status'].map(h => <th key={h} className={thCls}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {history.map((login) => {
                const ok = login.status === 'success';
                return (
                  <tr key={login.id} className="border-b border-[#EFF3F8] transition-colors hover:bg-[#F9FBFD]">
                    <td className="px-4 py-3">
                      <p className="text-[0.82rem] font-medium" style={{ color: NAVY }}>
                        {new Date(login.login_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(login.login_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[0.8rem] text-foreground/80">{login.location || 'Not available'}</p>
                      {login.latitude && login.longitude && (
                        <p className="text-xs text-muted-foreground">{login.latitude.toFixed(4)}, {login.longitude.toFixed(4)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3"><span className="font-mono text-xs text-muted-foreground">{login.ip_address || 'N/A'}</span></td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-foreground/80">
                        <Globe size={13} className="text-muted-foreground" /> {browserName(login.user_agent)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[0.68rem] font-medium ${ok ? 'bg-[rgba(78,167,46,0.12)] text-[#3d8a22]' : 'bg-[#FDECEC] text-[#c0392b]'}`}>
                        {ok ? <Check size={11} /> : <X size={11} />} {ok ? 'Success' : 'Failed'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
