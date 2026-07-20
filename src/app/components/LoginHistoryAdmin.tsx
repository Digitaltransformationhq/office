import React, { useMemo, useState } from 'react';
import { useEffect } from 'react';
import { loginAPI } from '../services/api';
import { useLiveData } from '../hooks/useLiveData';
import { History, MapPin, Globe, Check, X, Search, ChevronDown } from 'lucide-react';

/**
 * Every user's sign-ins, for the admin.
 *
 * The per-user panel that used to sit in Settings only ever showed you your own
 * logins, which is not much use: the point of this data is spotting a sign-in
 * that should not have happened, and nobody audits themselves. It is now here
 * and admin-only, covering the whole firm.
 *
 * Access is enforced by App.tsx and the sidebar, like every other permission in
 * this app — the endpoint itself is reachable by anyone holding the anon key.
 */

const NAVY = '#1b365d';
const thCls =
  'px-4 py-2.5 text-left text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground';
const selectCls =
  'appearance-none rounded-lg border border-[#E7EDF4] bg-white py-2 pl-3 pr-9 text-sm text-foreground/80 outline-none transition focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15';

function browserName(ua?: string) {
  if (!ua) return 'Unknown';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  return 'Browser';
}

export function LoginHistoryAdmin() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { load(); }, []);
  useLiveData(['users'], () => load({ silent: true }));

  const load = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setLoading(true);
      const res = await loginAPI.getAllLoginHistory();
      setHistory(res.data || []);
    } catch (e) {
      console.error('Error loading login history:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const people = useMemo(
    () => Array.from(new Set(history.map(h => h.user_name).filter(Boolean))).sort(),
    [history],
  );

  const rows = useMemo(() => history
    .filter(h => userFilter === 'all' || h.user_name === userFilter)
    .filter(h => statusFilter === 'all' || (statusFilter === 'success'
      ? h.status === 'success'
      : h.status !== 'success'))
    .filter(h => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return [h.user_name, h.user_email, h.location, h.ip_address]
        .some(v => (v || '').toLowerCase().includes(q));
    }), [history, userFilter, statusFilter, search]);

  const failedCount = useMemo(
    () => history.filter(h => h.status !== 'success').length, [history]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[1.4rem] font-semibold tracking-tight" style={{ color: NAVY }}>
          Login History
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {rows.length} of {history.length} sign-ins
          {failedCount > 0 && ` · ${failedCount} failed`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search person, location or IP…"
            className="w-60 rounded-lg border border-[#E7EDF4] bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15"
          />
        </div>
        <div className="relative inline-flex">
          <select value={userFilter} onChange={e => setUserFilter(e.target.value)} className={selectCls}>
            <option value="all">Everyone</option>
            {people.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        <div className="relative inline-flex">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls}>
            <option value="all">All attempts</option>
            <option value="success">Successful</option>
            <option value="failed">Failed</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
        <div className="flex items-center gap-2.5 border-b border-[#E7EDF4] px-5 py-4">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}
          >
            <History size={16} />
          </span>
          <h2 className="text-sm font-semibold" style={{ color: NAVY }}>All sign-ins</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F4F6F9] text-muted-foreground">
              <MapPin size={22} />
            </span>
            <p className="text-sm font-medium" style={{ color: NAVY }}>
              {history.length === 0 ? 'No login history yet' : 'Nothing matches those filters'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-[0.8rem]">
              <thead>
                <tr className="border-b border-[#E7EDF4] bg-[#F9FAFB]">
                  {['User', 'Date & Time', 'Location', 'IP Address', 'Device', 'Status'].map(h => (
                    <th key={h} className={thCls}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((login) => {
                  const ok = login.status === 'success';
                  return (
                    <tr key={login.id} className="border-b border-[#EFF3F8] transition-colors hover:bg-[#F9FBFD]">
                      <td className="px-4 py-3">
                        <p className="text-[0.82rem] font-medium" style={{ color: NAVY }}>
                          {login.user_name || 'Unknown'}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{login.user_email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="whitespace-nowrap text-[0.82rem] font-medium" style={{ color: NAVY }}>
                          {new Date(login.login_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(login.login_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[0.8rem] text-foreground/80">{login.location || 'Not available'}</p>
                        {login.latitude && login.longitude && (
                          <p className="text-xs text-muted-foreground">
                            {Number(login.latitude).toFixed(4)}, {Number(login.longitude).toFixed(4)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-muted-foreground">{login.ip_address || 'N/A'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-foreground/80">
                          <Globe size={13} className="text-muted-foreground" /> {browserName(login.user_agent)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-[0.68rem] font-medium ${
                          ok
                            ? 'border border-[#c9e6ba] bg-[rgba(78,167,46,0.12)] text-[#3d8a22]'
                            : 'border border-[#f3c9c4] bg-[#FDECEC] text-[#c0392b]'
                        }`}>
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
    </div>
  );
}
