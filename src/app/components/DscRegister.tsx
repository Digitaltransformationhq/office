import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, ChevronDown, Copy, Eye, EyeOff, FileText, KeyRound, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { dscRegisterAPI, type DscInput, type DscMovement, type DscRecord } from '../services/api';
import { useLiveData } from '../hooks/useLiveData';
import { useToast } from './Toast';
import { sortByText } from '../utils/sorting';
import { normalizeRole } from '../utils/roles';

const NAVY = '#1b365d';
/** A DSC expiring within this many days is flagged amber. */
const EXPIRING_SOON_DAYS = 90;

type ClientRow = { id: string; name: string; firmName?: string };
type Status = 'expired' | 'soon' | 'valid' | 'none';
type StatusFilter = '' | Status | 'review' | 'inOffice';
type Direction = 'IN' | 'OUT';

const formatDateTime = (value: string) => new Date(value).toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

const indiaToday = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

/** Whole days from today (IST) to a YYYY-MM-DD date; negative once expired. */
const daysUntil = (date: string, today: string) =>
  Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);

const statusOf = (record: DscRecord, today: string): Status => {
  if (!record.expiryDate) return 'none';
  const days = daysUntil(record.expiryDate, today);
  if (days < 0) return 'expired';
  return days <= EXPIRING_SOON_DAYS ? 'soon' : 'valid';
};

const formatDate = (date: string) => {
  const [y, m, d] = date.split('-');
  return `${d}-${m}-${y}`;
};

export function DscRegister({ user, clients }: {
  user: { id: string; name: string; role: string };
  clients: ClientRow[];
}) {
  const { showSuccess, showError } = useToast();
  const isAdmin = normalizeRole(user.role) === 'admin';
  const [records, setRecords] = useState<DscRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [editing, setEditing] = useState<DscRecord | 'new' | null>(null);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [moving, setMoving] = useState<{ record: DscRecord; direction: Direction } | null>(null);
  const [historyOf, setHistoryOf] = useState<DscRecord | null>(null);

  const load = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setLoading(true);
      const result = await dscRegisterAPI.getAll();
      if (!result.success) throw new Error(result.error || 'Could not load the DSC register.');
      setRecords(result.data || []);
    } catch (error) {
      if (!silent) showError(error instanceof Error ? error.message : 'Could not load the DSC register.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useLiveData(['dsc-register'], () => load({ silent: true }));

  const today = indiaToday();
  const clientName = useMemo(() => new Map(clients.map(client => [client.id, client.name])), [clients]);

  const counts = useMemo(() => {
    const result = { expired: 0, soon: 0, valid: 0, none: 0, review: 0, inOffice: 0 };
    records.forEach(record => {
      result[statusOf(record, today)] += 1;
      if (record.needsReview) result.review += 1;
      if (record.lastMovement?.direction === 'IN') result.inOffice += 1;
    });
    return result;
  }, [records, today]);

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return sortByText(records.filter(record => {
      if (statusFilter === 'review') { if (!record.needsReview) return false; }
      else if (statusFilter === 'inOffice') { if (record.lastMovement?.direction !== 'IN') return false; }
      else if (statusFilter && statusOf(record, today) !== statusFilter) return false;
      if (!query) return true;
      return [record.holderName, record.companyName, clientName.get(record.clientId), record.notes]
        .some(value => String(value || '').toLocaleLowerCase().includes(query));
    }), record => record.holderName);
  }, [records, search, statusFilter, today, clientName]);

  const reveal = async (record: DscRecord) => {
    if (revealed[record.id] !== undefined) {
      setRevealed(({ [record.id]: _, ...rest }) => rest);
      return;
    }
    const result = await dscRegisterAPI.getPassword(record.id);
    if (!result.success) { showError(result.error || 'Could not load the password.'); return; }
    setRevealed(previous => ({ ...previous, [record.id]: result.data }));
  };

  const copyPassword = async (record: DscRecord) => {
    const result = revealed[record.id] !== undefined
      ? { success: true, data: revealed[record.id] }
      : await dscRegisterAPI.getPassword(record.id);
    if (!result.success) { showError('Could not load the password.'); return; }
    try {
      await navigator.clipboard.writeText(result.data);
      showSuccess(`Password for ${record.holderName} copied.`);
    } catch {
      showError('Could not copy to the clipboard.');
    }
  };

  const chip = (value: StatusFilter, label: string, count: number, tone: string) => (
    <button
      type="button"
      onClick={() => setStatusFilter(statusFilter === value ? '' : value)}
      className={`rounded-xl border px-4 py-3 text-left transition ${statusFilter === value ? 'border-[#1b365d] ring-2 ring-[#1b365d]/10' : 'border-[#E7EDF4] hover:border-[#C9D4E2]'} bg-white`}
    >
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold" style={{ color: tone }}>{count.toLocaleString('en-IN')}</p>
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {chip('', 'All DSCs', records.length, NAVY)}
        {chip('valid', 'Valid', counts.valid, '#15803d')}
        {chip('soon', `Expiring ≤ ${EXPIRING_SOON_DAYS} days`, counts.soon, '#b45309')}
        {chip('expired', 'Expired', counts.expired, '#b91c1c')}
        {chip('none', 'No expiry date', counts.none, '#64748b')}
        {chip('review', 'Needs review', counts.review, '#b45309')}
        {chip('inOffice', 'Token in office', counts.inOffice, '#15803d')}
      </div>

      <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#E7EDF4] p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search holder, company or client"
              aria-label="Search DSCs"
              className="h-10 w-full rounded-lg border border-[#D9E1EA] bg-white pl-9 pr-9 text-sm outline-none transition placeholder:text-muted-foreground focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/10"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-[#F4F6F9]"><X size={14} /></button>
            )}
          </div>
          <button type="button" onClick={() => setEditing('new')} className="flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white" style={{ background: NAVY }}>
            <Plus size={16} /> Add DSC
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" /></div>
        ) : records.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-muted-foreground">No DSCs recorded yet. Use “Add DSC” to add the first one.</div>
        ) : visible.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-muted-foreground">No DSCs match this search or filter.</div>
        ) : (
          <div className="max-h-[64vh] overflow-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-[#F9FAFB]">
                <tr className="border-b border-[#E7EDF4]">
                  <Head className="w-[34%]">DSC holder</Head>
                  <Head>Expiry</Head>
                  <Head>Password</Head>
                  <Head>Token status</Head>
                  <Head align="center">In / Out</Head>
                  <Head align="center" className="w-[70px]">Edit</Head>
                </tr>
              </thead>
              <tbody>
                {visible.map(record => {
                  const linked = clientName.get(record.clientId);
                  return (
                    <tr key={record.id} className="border-b border-[#EFF3F8] align-top hover:bg-[#FAFBFD]">
                      {/* Who: name, firm, class, client link, notes and any review flag. */}
                      <td className="px-4 py-3">
                        <p className="font-medium" style={{ color: NAVY }}>{record.holderName}</p>
                        {(record.companyName || record.dscClass) && (
                          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            {record.companyName && <span>{record.companyName}</span>}
                            {record.dscClass && <span className="rounded bg-[#EEF3FA] px-1.5 py-0.5 text-[0.65rem] font-medium text-[#1b365d]">{record.dscClass}</span>}
                          </p>
                        )}
                        {linked && <p className="mt-0.5 text-[0.68rem] font-medium text-[#4f7cc4]">Client: {linked}</p>}
                        {record.notes && <p className="mt-1 text-[0.7rem] text-foreground/60">{record.notes}</p>}
                        {record.needsReview && (
                          <p className="mt-1.5 flex items-start gap-1 rounded-md bg-amber-50 px-2 py-1 text-[0.7rem] text-amber-800">
                            <AlertTriangle size={12} className="mt-0.5 shrink-0" /> <span>{record.reviewNote || 'Needs review'}</span>
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3"><ExpiryCell record={record} today={today} /></td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {!record.hasPassword ? <span className="text-xs text-muted-foreground">Not recorded</span>
                          : !isAdmin ? <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><KeyRound size={12} /> Admin only</span>
                          : (
                            <span className="inline-flex items-center gap-1">
                              <code className="min-w-[90px] rounded bg-[#F4F6F9] px-2 py-1 text-xs">{revealed[record.id] ?? '••••••••'}</code>
                              <IconButton label={revealed[record.id] !== undefined ? 'Hide password' : 'Show password'} onClick={() => reveal(record)}>
                                {revealed[record.id] !== undefined ? <EyeOff size={14} /> : <Eye size={14} />}
                              </IconButton>
                              <IconButton label="Copy password" onClick={() => copyPassword(record)}><Copy size={14} /></IconButton>
                            </span>
                          )}
                      </td>
                      {/* Where the token is right now. */}
                      <td className="px-4 py-3">
                        {record.lastMovement ? (
                          <div>
                            <DirectionBadge direction={record.lastMovement.direction} />
                            <p className="mt-1 text-[0.68rem] text-muted-foreground">{formatDateTime(record.lastMovement.recordedAt)}</p>
                            <p className="text-[0.68rem] text-foreground/70">{record.lastMovement.transferMethod}</p>
                            <button type="button" onClick={() => setHistoryOf(record)} className="mt-0.5 text-[0.68rem] font-medium text-[#4f7cc4] hover:underline">View history</button>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">Not recorded</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button type="button" onClick={() => setMoving({ record, direction: 'IN' })} className="inline-flex items-center gap-1 rounded-md border border-green-200 bg-green-50 px-2.5 py-1 text-[0.7rem] font-semibold text-green-700 transition hover:bg-green-100"><ArrowDownToLine size={12} /> In</button>
                          <button type="button" onClick={() => setMoving({ record, direction: 'OUT' })} className="inline-flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-[0.7rem] font-semibold text-orange-700 transition hover:bg-orange-100"><ArrowUpFromLine size={12} /> Out</button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <IconButton label={`Edit ${record.holderName}`} onClick={() => setEditing(record)}><Pencil size={14} /></IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {moving && (
        <DscMovementModal
          record={moving.record}
          direction={moving.direction}
          onClose={() => setMoving(null)}
          onSave={async values => {
            const result = await dscRegisterAPI.recordMovement(moving.record.id, { direction: moving.direction, ...values });
            if (!result.success || !result.data) throw new Error(result.error || 'Could not save the DSC In/Out.');
            const movement = result.data;
            setRecords(previous => previous.map(item => item.id === moving.record.id ? { ...item, lastMovement: movement } : item));
            setMoving(null);
            showSuccess(`DSC of ${moving.record.holderName} marked ${moving.direction === 'IN' ? 'in' : 'out'}.`);
          }}
        />
      )}

      {historyOf && <DscHistoryModal record={historyOf} onClose={() => setHistoryOf(null)} />}

      {editing && (
        <DscModal
          record={editing === 'new' ? null : editing}
          clients={clients}
          isAdmin={isAdmin}
          onClose={() => setEditing(null)}
          onSave={async input => {
            const result = editing === 'new'
              ? await dscRegisterAPI.create(input)
              : await dscRegisterAPI.update(editing.id, input);
            if (!result.success || !result.data) throw new Error(result.error || 'Could not save the DSC.');
            // Saving details does not return In/Out status, so keep what the row had.
            const saved = { ...result.data, lastMovement: editing === 'new' ? null : editing.lastMovement };
            setRecords(previous => editing === 'new' ? [...previous, saved] : previous.map(item => item.id === saved.id ? saved : item));
            if (input.password !== undefined) setRevealed(({ [saved.id]: _, ...rest }) => rest);
            setEditing(null);
            showSuccess(editing === 'new' ? 'DSC added.' : 'DSC updated.');
          }}
          onDelete={editing === 'new' || !isAdmin ? undefined : async () => {
            const result = await dscRegisterAPI.remove(editing.id);
            if (!result.success) throw new Error(result.error || 'Could not delete the DSC.');
            setRecords(previous => previous.filter(item => item.id !== editing.id));
            setEditing(null);
            showSuccess('DSC deleted.');
          }}
        />
      )}
    </div>
  );
}

function DscMovementModal({ record, direction, onClose, onSave }: {
  record: DscRecord;
  direction: Direction;
  onClose: () => void;
  onSave: (values: { transferMethod: string; details: string }) => Promise<void>;
}) {
  const incoming = direction === 'IN';
  const [transferMethod, setTransferMethod] = useState('');
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [saving, onClose]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!transferMethod.trim()) { setError(incoming ? 'Say how the token was received.' : 'Say how the token was sent.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({ transferMethod: transferMethod.trim(), details: details.trim() });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save.');
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 sm:p-8" onMouseDown={event => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="dsc-move-title" className="m-auto w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#E7EDF4] px-5 py-4">
          <div className="flex items-start gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${incoming ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
              {incoming ? <ArrowDownToLine size={20} /> : <ArrowUpFromLine size={20} />}
            </span>
            <div>
              <h2 id="dsc-move-title" className="font-semibold" style={{ color: NAVY }}>DSC token {direction}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{record.holderName}{record.companyName ? ` · ${record.companyName}` : ''}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-[#F4F6F9]"><X size={17} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-5">
          <Field label={incoming ? 'How was it received?' : 'How was it sent?'} required>
            <input autoFocus value={transferMethod} onChange={event => setTransferMethod(event.target.value)} placeholder={incoming ? 'e.g. Hand delivered by client, courier' : 'e.g. Collected by client, courier'} className={inputCls} />
          </Field>
          <Field label="Notes"><textarea value={details} onChange={event => setDetails(event.target.value)} rows={2} placeholder="Who brought / collected it, purpose, etc." className={`${inputCls} resize-y`} /></Field>
          <div className="flex items-center gap-2 rounded-lg bg-[#F7F9FC] px-3 py-2 text-xs text-muted-foreground"><FileText size={14} /> Date and time will be recorded automatically when saved.</div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-[#EFF3F8] pt-4">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-[#D9E1EA] px-4 py-2 text-sm font-medium text-foreground/75 hover:bg-[#F7F9FC] disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={saving} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${incoming ? 'bg-green-700 hover:bg-green-800' : 'bg-orange-600 hover:bg-orange-700'}`}>{saving ? 'Saving…' : `Save DSC ${direction}`}</button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function DscHistoryModal({ record, onClose }: { record: DscRecord; onClose: () => void }) {
  const [movements, setMovements] = useState<DscMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    let active = true;
    dscRegisterAPI.getMovements(record.id).then(result => {
      if (!active) return;
      if (!result.success) setLoadError(result.error || 'Could not load the In/Out history.');
      else setMovements(result.data || []);
    }).catch(() => { if (active) setLoadError('Could not load the In/Out history.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [record.id]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 sm:p-8" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="dsc-history-title" className="m-auto flex max-h-[82vh] flex-col overflow-hidden rounded-xl bg-white shadow-2xl" style={{ width: 'min(820px, calc(100vw - 32px))' }}>
        <div className="flex items-start justify-between border-b border-[#E7EDF4] px-5 py-4">
          <div>
            <h2 id="dsc-history-title" className="text-lg font-semibold" style={{ color: NAVY }}>{record.holderName}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">DSC token In/Out history</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close history" className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-[#F4F6F9]"><X size={17} /></button>
        </div>
        {loading ? (
          <div className="flex flex-1 items-center justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" /></div>
        ) : loadError ? (
          <div className="px-5 py-16 text-center text-sm text-red-600">{loadError}</div>
        ) : movements.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-muted-foreground">No In/Out recorded for this DSC yet.</div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-[#F9FAFB]">
                <tr className="border-b border-[#E7EDF4]"><Head>Date &amp; time</Head><Head>In / Out</Head><Head>How received / sent</Head><Head>Notes</Head><Head>Recorded by</Head></tr>
              </thead>
              <tbody>
                {movements.map(item => (
                  <tr key={item.id} className="border-b border-[#EFF3F8] hover:bg-[#FAFBFD]">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDateTime(item.recordedAt)}</td>
                    <td className="px-4 py-3"><DirectionBadge direction={item.direction} /></td>
                    <td className="px-4 py-3 text-foreground/75">{item.transferMethod}</td>
                    <td className="max-w-[260px] px-4 py-3 text-foreground/70">{item.details || '—'}</td>
                    <td className="px-4 py-3 text-xs text-foreground/70">{item.recordedByName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-end border-t border-[#E7EDF4] px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-[#D9E1EA] px-4 py-2 text-sm font-medium text-foreground/75 hover:bg-[#F7F9FC]">Close</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function DirectionBadge({ direction }: { direction: Direction }) {
  return <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[0.68rem] font-semibold ${direction === 'IN' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{direction === 'IN' ? 'IN office' : 'OUT'}</span>;
}

function ExpiryCell({ record, today }: { record: DscRecord; today: string }) {
  if (!record.expiryDate) return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.68rem] font-semibold text-slate-600">No date</span>;
  const days = daysUntil(record.expiryDate, today);
  const status = statusOf(record, today);
  const badge = status === 'expired'
    ? { cls: 'bg-red-100 text-red-700', text: `Expired ${-days} day${days === -1 ? '' : 's'} ago` }
    : status === 'soon'
      ? { cls: 'bg-amber-100 text-amber-800', text: days === 0 ? 'Expires today' : `${days} day${days === 1 ? '' : 's'} left` }
      : { cls: 'bg-green-100 text-green-700', text: 'Valid' };
  return (
    <div>
      <p className="text-sm text-foreground/85">{formatDate(record.expiryDate)}</p>
      <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[0.68rem] font-semibold ${badge.cls}`}>{badge.text}</span>
    </div>
  );
}

function DscModal({ record, clients, isAdmin, onClose, onSave, onDelete }: {
  record: DscRecord | null;
  clients: ClientRow[];
  isAdmin: boolean;
  onClose: () => void;
  onSave: (input: DscInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [holderName, setHolderName] = useState(record?.holderName || '');
  const [companyName, setCompanyName] = useState(record?.companyName || '');
  const [clientId, setClientId] = useState(record?.clientId || '');
  const [dscClass, setDscClass] = useState(record?.dscClass || '');
  const [expiryDate, setExpiryDate] = useState(record?.expiryDate || '');
  const [password, setPassword] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [notes, setNotes] = useState(record?.notes || '');
  const [needsReview, setNeedsReview] = useState(record?.needsReview || false);
  const [reviewNote, setReviewNote] = useState(record?.reviewNote || '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  // Load the current password so an admin edits it rather than retyping it.
  useEffect(() => {
    if (!isAdmin || !record?.hasPassword) return;
    let active = true;
    dscRegisterAPI.getPassword(record.id).then(result => {
      if (active && result.success && !passwordTouched) setPassword(result.data);
    });
    return () => { active = false; };
  }, [record?.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [saving, onClose]);

  const run = async (action: () => Promise<void>) => {
    setSaving(true);
    setError('');
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.');
      setSaving(false);
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!holderName.trim()) { setError('Holder name is required.'); return; }
    const input: DscInput = {
      holderName, companyName, clientId, dscClass, expiryDate, notes,
      needsReview, reviewNote: needsReview ? reviewNote : '',
    };
    if (isAdmin && (passwordTouched || !record)) input.password = password;
    run(() => onSave(input));
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 sm:p-8" onMouseDown={event => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="dsc-title" className="m-auto flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#E7EDF4] px-5 py-4">
          <div>
            <h2 id="dsc-title" className="font-semibold" style={{ color: NAVY }}>{record ? 'Edit DSC' : 'Add DSC'}</h2>
            {record?.source && <p className="mt-0.5 text-xs text-muted-foreground">Imported from {record.source}</p>}
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-[#F4F6F9]"><X size={17} /></button>
        </div>

        <form onSubmit={submit} className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Holder name" required><input autoFocus value={holderName} onChange={event => setHolderName(event.target.value)} className={inputCls} /></Field>
            <Field label="Company / firm"><input value={companyName} onChange={event => setCompanyName(event.target.value)} className={inputCls} /></Field>
            <Field label="Linked client">
              <span className="relative block">
                <select value={clientId} onChange={event => setClientId(event.target.value)} className={`${inputCls} appearance-none pr-9`}>
                  <option value="">Not linked</option>
                  {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </span>
            </Field>
            <Field label="DSC class"><input value={dscClass} onChange={event => setDscClass(event.target.value)} placeholder="e.g. Class 3" className={inputCls} /></Field>
            <Field label="Expiry date"><input type="date" value={expiryDate} onChange={event => setExpiryDate(event.target.value)} className={inputCls} /></Field>
            {isAdmin ? (
              <Field label="Token password"><input value={password} onChange={event => { setPassword(event.target.value); setPasswordTouched(true); }} autoComplete="off" className={inputCls} /></Field>
            ) : (
              <Field label="Token password"><p className="py-2.5 text-xs text-muted-foreground">Only admins can view or change passwords.</p></Field>
            )}
          </div>
          <Field label="Notes"><textarea value={notes} onChange={event => setNotes(event.target.value)} rows={2} className={`${inputCls} resize-y`} /></Field>
          <div className="rounded-lg border border-[#E7EDF4] p-3">
            <label className="flex items-center gap-2 text-sm font-medium" style={{ color: NAVY }}>
              <input type="checkbox" checked={needsReview} onChange={event => setNeedsReview(event.target.checked)} className="accent-amber-600" />
              Needs review
            </label>
            {needsReview && <textarea value={reviewNote} onChange={event => setReviewNote(event.target.value)} rows={2} placeholder="What needs checking?" className={`${inputCls} mt-2 resize-y`} />}
            {!needsReview && record?.needsReview && <p className="mt-1 text-xs text-green-700">The review flag will be cleared when you save.</p>}
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center justify-between gap-2 border-t border-[#EFF3F8] pt-4">
            <div>
              {onDelete && (confirmDelete ? (
                <span className="flex items-center gap-2 text-sm">
                  <span className="text-red-700">Delete this DSC?</span>
                  <button type="button" disabled={saving} onClick={() => run(onDelete)} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">Delete</button>
                  <button type="button" disabled={saving} onClick={() => setConfirmDelete(false)} className="text-xs text-muted-foreground hover:underline">Cancel</button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className="flex items-center gap-1 text-xs font-medium text-red-600 hover:underline"><Trash2 size={13} /> Delete</button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-[#D9E1EA] px-4 py-2 text-sm font-medium text-foreground/75 hover:bg-[#F7F9FC] disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ background: NAVY }}>{saving ? 'Saving…' : 'Save DSC'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

const inputCls = 'w-full rounded-lg border border-[#D9E1EA] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/10';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>{label}{required && <span className="text-red-600"> *</span>}</span>
      {children}
    </label>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-[#EEF3FA] hover:text-[#1b365d]">
      {children}
    </button>
  );
}

function Head({ children, className = '', align = 'left' }: { children: React.ReactNode; className?: string; align?: 'left' | 'center' }) {
  return <th className={`px-4 py-2.5 ${align === 'center' ? 'text-center' : 'text-left'} text-[0.62rem] font-semibold uppercase tracking-[0.07em] text-muted-foreground ${className}`}>{children}</th>;
}
