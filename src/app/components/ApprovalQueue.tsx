import React, { useEffect, useMemo, useState } from 'react';
import { ReviewLeaveModal } from './ReviewLeaveModal';
import { useToast } from './Toast';
import { leaveAPI } from '../services/api';
import { useLiveData } from '../hooks/useLiveData';
import { CalendarCheck, CheckCircle2, Search, ChevronDown } from 'lucide-react';

interface ApprovalQueueProps {
  /** Real user id ('user:7'), not a numeric extraction: it is written to
   *  leave_applications.approved_by_id, which carries a foreign key. */
  userId: string;
  userName: string;
  userRole: string;
  /** False inside the dashboard modal, which supplies its own title. */
  showHeading?: boolean;
}

const NAVY = '#1b365d';
const thCls =
  'px-4 py-2.5 text-left text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground';
const selectCls =
  'appearance-none rounded-lg border border-[#E7EDF4] bg-white py-2 pl-3 pr-9 text-sm text-foreground/80 outline-none transition focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15';

/** Stored as codes; expanded only for reading. */
const LEAVE_LABEL: Record<string, string> = {
  CL: 'Casual',
  SL: 'Sick',
  EL: 'Earned',
};

const LEAVE_CHIP: Record<string, string> = {
  CL: 'border border-blue-200 bg-blue-50 text-blue-700',
  SL: 'border border-amber-300 bg-amber-100 text-amber-700',
  EL: 'border border-purple-300 bg-purple-100 text-purple-700',
};

const shortDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export function ApprovalQueue({ userId, userName, userRole, showHeading = true }: ApprovalQueueProps) {
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const { showError } = useToast();

  useEffect(() => { loadData(); }, []);
  useLiveData(['users'], () => loadData({ silent: true }));

  const loadData = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setLoading(true);
      const response = await leaveAPI.getPending();
      setPendingLeaves(response.data || []);
    } catch (error) {
      console.error('Error loading pending leaves:', error);
      if (!silent) showError('Failed to load pending approvals');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const rows = useMemo(() => pendingLeaves
    .filter(l => typeFilter === 'all' || l.leaveType === typeFilter)
    .filter(l => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return [l.userName, l.reason].some(v => (v || '').toLowerCase().includes(q));
    }), [pendingLeaves, typeFilter, search]);

  const totalDays = useMemo(
    () => pendingLeaves.reduce((sum, l) => sum + (Number(l.totalDays) || 0), 0),
    [pendingLeaves],
  );

  return (
    <div className="flex flex-col gap-4">
      {showHeading && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[1.4rem] font-semibold tracking-tight" style={{ color: NAVY }}>
              Approvals
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {pendingLeaves.length === 0
                ? 'No leave waiting on you'
                : `${pendingLeaves.length} leave request${pendingLeaves.length === 1 ? '' : 's'} · ${totalDays} day${totalDays === 1 ? '' : 's'} total`}
            </p>
          </div>

          {pendingLeaves.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search person or reason…"
                  className="w-52 rounded-lg border border-[#E7EDF4] bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15"
                />
              </div>
              <div className="relative inline-flex">
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={selectCls}>
                  <option value="all">All types</option>
                  <option value="CL">Casual</option>
                  <option value="SL">Sick</option>
                  <option value="EL">Earned</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-[#E7EDF4] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}
            >
              <CalendarCheck size={16} />
            </span>
            <h2 className="text-sm font-semibold" style={{ color: NAVY }}>Leave awaiting approval</h2>
          </div>
          {pendingLeaves.length > 0 && (
            <span className="rounded-md border border-amber-300 bg-amber-100 px-2 py-0.5 text-[0.68rem] font-medium text-amber-700">
              {rows.length} pending
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <span
              className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(78,167,46,0.12)', color: '#4ea72e' }}
            >
              <CheckCircle2 size={24} />
            </span>
            <p className="text-sm font-medium" style={{ color: NAVY }}>
              {pendingLeaves.length === 0 ? 'All caught up' : 'Nothing matches those filters'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {pendingLeaves.length === 0
                ? 'Leave requests will appear here for you to review.'
                : 'Try clearing the search or type filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-[0.8rem]">
              <thead>
                <tr className="border-b border-[#E7EDF4] bg-[#F9FAFB]">
                  {['Employee', 'Type', 'Dates', 'Days', 'Reason', 'Applied', ''].map((h, i) => (
                    <th key={i} className={thCls}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((leave) => (
                  <tr key={leave.id} className="border-b border-[#EFF3F8] transition-colors hover:bg-[#F9FBFD]">
                    <td className="px-4 py-3">
                      <p className="text-[0.82rem] font-medium" style={{ color: NAVY }}>{leave.userName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[0.68rem] font-medium ${
                        LEAVE_CHIP[leave.leaveType] || 'border border-slate-300 bg-slate-100 text-slate-600'
                      }`}>
                        {LEAVE_LABEL[leave.leaveType] || leave.leaveType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="whitespace-nowrap text-[0.8rem] text-foreground/80">
                        {shortDate(leave.fromDate)}
                      </p>
                      {leave.fromDate !== leave.toDate && (
                        <p className="whitespace-nowrap text-xs text-muted-foreground">
                          to {shortDate(leave.toDate)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums" style={{ color: NAVY }}>
                      {leave.totalDays}
                      {leave.isHalfDay && <span className="ml-1 text-xs text-muted-foreground">half</span>}
                    </td>
                    <td className="max-w-[240px] px-4 py-3">
                      <p className="truncate text-[0.8rem] text-foreground/80" title={leave.reason}>
                        {leave.reason}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {shortDate(leave.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedLeave(leave)}
                        className="whitespace-nowrap rounded-md bg-[#1b365d] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-[#142a4a]"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedLeave && (
        <ReviewLeaveModal
          leave={selectedLeave}
          approverId={userId}
          approverName={userName}
          onClose={() => setSelectedLeave(null)}
          onSuccess={() => {
            loadData();
            setSelectedLeave(null);
          }}
        />
      )}
    </div>
  );
}
