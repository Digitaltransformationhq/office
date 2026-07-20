import React, { useEffect, useMemo, useState } from 'react';
import { ApplyLeaveModal } from './ApplyLeaveModal';
import { useToast } from './Toast';
import { leaveAPI } from '../services/api';
import { useLiveData } from '../hooks/useLiveData';
import { LEAVE_TYPES, leaveLabel, leaveChip, leaveStatusChip } from '../utils/leave';
import { CalendarDays, Plus, Inbox } from 'lucide-react';

interface LeaveManagementProps {
  /** Real user id ('user:7') — written to a column with a foreign key. */
  userId: string;
  userName: string;
  userRole: string;
}

const NAVY = '#1b365d';
const thCls =
  'px-4 py-2.5 text-left text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground';

const shortDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export function LeaveManagement({ userId, userName }: LeaveManagementProps) {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [balance, setBalance] = useState({ casualLeave: 10, sickLeave: 7, earnedLeave: 15 });
  const [loading, setLoading] = useState(true);
  const [showApplyLeave, setShowApplyLeave] = useState(false);
  const { showError } = useToast();

  useEffect(() => { loadData(); }, [userId]);
  useLiveData(['users'], () => loadData({ silent: true }));

  const loadData = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setLoading(true);
      const [leavesResponse, balanceResponse] = await Promise.all([
        leaveAPI.getByUser(userId),
        leaveAPI.getBalance(userId),
      ]);

      setLeaves(leavesResponse.data || []);

      if (balanceResponse.success && balanceResponse.data) {
        setBalance({
          casualLeave: balanceResponse.data.casualLeaveBalance ?? 10,
          sickLeave: balanceResponse.data.sickLeaveBalance ?? 7,
          earnedLeave: balanceResponse.data.earnedLeaveBalance ?? 15,
        });
      }
    } catch (error) {
      console.error('Error loading leave data:', error);
      if (!silent) showError('Failed to load leave data');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const pendingCount = useMemo(
    () => leaves.filter(l => l.status === 'Pending').length, [leaves]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[1.4rem] font-semibold tracking-tight" style={{ color: NAVY }}>
            Leave
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {leaves.length === 0
              ? 'You have not applied for any leave yet'
              : `${leaves.length} application${leaves.length === 1 ? '' : 's'}${pendingCount ? ` · ${pendingCount} awaiting approval` : ''}`}
          </p>
        </div>
        <button
          onClick={() => setShowApplyLeave(true)}
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-[#1b365d] px-4 py-2 text-sm font-medium text-white shadow-[0_8px_20px_-10px_rgba(27,54,93,0.6)] transition-all hover:bg-[#142a4a] sm:self-auto"
        >
          <Plus size={15} /> Apply for leave
        </button>
      </div>

      {/* Balances, read from one definition so these labels and the form's
          cannot drift apart. */}
      <div className="grid grid-cols-3 gap-4">
        {LEAVE_TYPES.map(t => {
          const days = (balance as any)[t.balanceKey] ?? 0;
          return (
            <div key={t.code} className="rounded-xl border border-[#E7EDF4] bg-white p-4">
              <span className={`inline-block rounded-md px-2 py-0.5 text-[0.68rem] font-medium ${leaveChip(t.code)}`}>
                {t.label}
              </span>
              <p className="mt-2 text-[1.7rem] font-semibold leading-none tabular-nums" style={{ color: NAVY }}>
                {days}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                day{days === 1 ? '' : 's'} left this year
              </p>
            </div>
          );
        })}
      </div>

      {/* Applications */}
      <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
        <div className="flex items-center gap-2.5 border-b border-[#E7EDF4] px-5 py-4">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}
          >
            <CalendarDays size={16} />
          </span>
          <h2 className="text-sm font-semibold" style={{ color: NAVY }}>My applications</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" />
          </div>
        ) : leaves.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F4F6F9] text-muted-foreground">
              <Inbox size={22} />
            </span>
            <p className="text-sm font-medium" style={{ color: NAVY }}>No leave applied for</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Anything you apply for shows here with its approval status.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-[0.8rem]">
              <thead>
                <tr className="border-b border-[#E7EDF4] bg-[#F9FAFB]">
                  {['Type', 'Dates', 'Days', 'Reason', 'Status', 'Applied'].map(h => (
                    <th key={h} className={thCls}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaves.map((leave) => (
                  <tr key={leave.id} className="border-b border-[#EFF3F8] transition-colors hover:bg-[#F9FBFD]">
                    <td className="px-4 py-3">
                      <span className={`inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[0.68rem] font-medium ${leaveChip(leave.leaveType)}`}>
                        {leaveLabel(leave.leaveType)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="whitespace-nowrap text-[0.8rem] text-foreground/80">
                        {shortDate(leave.fromDate)}
                      </p>
                      {/* Second date only when it differs — a single-day leave
                          printing the same date twice reads as an error. */}
                      {leave.fromDate !== leave.toDate && (
                        <p className="whitespace-nowrap text-xs text-muted-foreground">
                          to {shortDate(leave.toDate)}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums" style={{ color: NAVY }}>
                      {leave.totalDays}
                      {leave.isHalfDay && <span className="ml-1 text-xs text-muted-foreground">half</span>}
                    </td>
                    <td className="max-w-[260px] px-4 py-3">
                      <p className="truncate text-[0.8rem] text-foreground/80" title={leave.reason}>
                        {leave.reason}
                      </p>
                      {leave.status === 'Rejected' && leave.rejectionReason && (
                        <p className="truncate text-xs text-[#c0392b]" title={leave.rejectionReason}>
                          Reason: {leave.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[0.68rem] font-medium ${leaveStatusChip(leave.status)}`}>
                        {leave.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {shortDate(leave.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showApplyLeave && (
        <ApplyLeaveModal
          userId={userId}
          userName={userName}
          balance={balance}
          onClose={() => setShowApplyLeave(false)}
          onSuccess={() => {
            loadData();
            setShowApplyLeave(false);
          }}
        />
      )}
    </div>
  );
}
