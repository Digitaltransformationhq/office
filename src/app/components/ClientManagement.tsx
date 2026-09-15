import React, { useEffect, useMemo, useState } from 'react';
import { clientsAPI } from '../services/api';
import { AddClientModal } from './AddClientModal';
import { EditClientModal } from './EditClientModal';
import { ViewClientModal } from './ViewClientModal';
import { useToast } from './Toast';
import { Building2, Search, ChevronDown, ChevronLeft, ChevronRight, Eye, Pencil, Download, Filter, Users } from 'lucide-react';
import { sortByText } from '../utils/sorting';
import { useLiveData } from '../hooks/useLiveData';
import { isApproverRole } from '../utils/roles';
import { exportClientsToExcel } from '../utils/exportClients';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from './ui/dropdown-menu';

const NAVY = '#1b365d';

/** 606 clients is too many to paint at once, and nobody reads past a screenful. */
const PAGE_SIZE = 25;

function initials(name?: string) {
  if (!name) return '—';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '—';
}

/**
 * A tint per client, derived from the name so it is stable across reloads.
 *
 * Purely to break up a long list of near-identical rows — the eye finds a row it
 * has seen before by colour far faster than by reading it. Carries no meaning,
 * so the palette is deliberately quiet.
 */
const AVATAR_TINTS = [
  { bg: 'rgba(27,54,93,0.08)', fg: '#1b365d' },
  { bg: 'rgba(37,99,235,0.10)', fg: '#1d4ed8' },
  { bg: 'rgba(22,163,74,0.10)', fg: '#15803d' },
  { bg: 'rgba(217,119,6,0.10)', fg: '#b45309' },
  { bg: 'rgba(124,58,237,0.10)', fg: '#6d28d9' },
  { bg: 'rgba(8,145,178,0.10)', fg: '#0e7490' },
];

function tintFor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
}

/** Blank fields are shown as a faint dash. Six columns of "N/A" read as broken. */
function Dash() {
  return <span className="text-slate-300">—</span>;
}

export function ClientManagement({ user }: { user?: { role?: string } | null }) {
  // The whole client book, fees included, in one file: admin, partners and
  // directors only. The desks that can open this page do not get the button.
  const canExport = isApproverRole(user?.role);
  const [exporting, setExporting] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  // One filter at a time. "No PAN" sits with the client types because it is
  // read the same way: a slice of the client master to work through.
  const [type, setType] = useState<'all' | 'Filing' | 'Non-filer' | 'no-pan'>('all');
  const [page, setPage] = useState(1);
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showView, setShowView] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const { showError, showSuccess } = useToast();

  useEffect(() => { load(); }, []);

  useLiveData(['clients'], () => load({ silent: true }));

  const load = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setLoading(true);
      const r = await clientsAPI.getAll();
      setClients(r.data || []);
    } catch {
      if (!silent) showError('Failed to load clients');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const toggleCard = (id: string) => setOpenCards(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const nonFilerCount = useMemo(
    () => clients.filter(c => c.clientType === 'Non-filer').length,
    [clients],
  );
  const noPanCount = useMemo(() => clients.filter(c => !c.pan).length, [clients]);

  // A–Z by client name. Paged at twenty-five a screen, an unsorted list means
  // knowing which page a client is on before you can look them up.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortByText(clients.filter(c => {
      if (type === 'no-pan') { if (c.pan) return false; }
      else if (type !== 'all' && (c.clientType || 'Filing') !== type) return false;
      if (!q) return true;
      return [
        c.name, c.firmName, c.industry, c.pan, c.gstin || c.gst,
        c.contact || c.mobileNumber, c.email || c.emailId, c.fileNumber,
      ].some(v => (v || '').toString().toLowerCase().includes(q));
    }), c => c.name);
  }, [clients, search, type]);

  // A search that shortens the list must not leave you stranded on page 20.
  useEffect(() => { setPage(1); }, [search, type]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const paged = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const isFiltered = type !== 'all' || search.trim() !== '';

  const openExisting = (clientId: string) => {
    const existing = clients.find(c => c.id === clientId);
    if (existing) { setSelected(existing); setShowView(true); }
  };

  const runExport = async (list: any[], label: string) => {
    if (list.length === 0) { showError('No clients to export'); return; }
    try {
      setExporting(true);
      await exportClientsToExcel(sortByText(list, c => c.name), label);
      showSuccess(`Exported ${list.length} client${list.length === 1 ? '' : 's'}`);
    } catch (e) {
      console.error('Client export failed:', e);
      showError('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const openView = (client: any) => { setSelected(client); setShowView(true); };
  const openEdit = (client: any) => { setSelected(client); setShowEdit(true); };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[1.5rem] font-semibold tracking-tight" style={{ color: NAVY }}>Clients</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Your client master and fee schedules</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#1b365d] px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_20px_-10px_rgba(27,54,93,0.6)] transition-all hover:bg-[#142a4a]"
        >
          <Building2 size={16} /> Add Client
        </button>
      </div>

      <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
        {/* Toolbar: title on the left, search taking the middle, filters and
            export on the right. Wraps to rows on narrow screens. */}
        <div className="flex flex-col gap-3 border-b border-[#E7EDF4] px-5 py-4 lg:flex-row lg:items-center lg:gap-4">
          <div className="flex shrink-0 items-center gap-2.5">
            <h2 className="text-sm font-semibold" style={{ color: NAVY }}>Client Master</h2>
            <span className="rounded-full bg-[#F4F6F9] px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {filtered.length}
              {filtered.length !== clients.length && <span className="text-muted-foreground/60"> / {clients.length}</span>}
            </span>
          </div>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, PAN, GSTIN, contact, email or file number…"
              className="w-full rounded-lg border border-[#E7EDF4] bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15"
            />
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-[#E7EDF4] p-0.5">
            {([
              ['all', 'All', null],
              ['Filing', 'Filing', null],
              ['Non-filer', 'Non-filers', nonFilerCount],
              ['no-pan', 'No PAN', noPanCount],
            ] as const).map(([key, label, count]) => (
              <button
                key={key}
                onClick={() => setType(key)}
                title={key === 'no-pan' ? 'Clients with no PAN on record' : undefined}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  type === key ? 'text-white' : 'text-muted-foreground hover:bg-[#F4F6F9]'
                }`}
                style={type === key ? { backgroundColor: NAVY } : undefined}
              >
                {label}
                {count !== null && <span className={`ml-1 ${type === key ? 'text-white/60' : 'text-muted-foreground/60'}`}>{count}</span>}
              </button>
            ))}
          </div>
          {canExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  disabled={loading || exporting || clients.length === 0}
                  title="Export to Excel"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7EDF4] bg-white px-3 py-2 text-xs font-medium transition-colors hover:bg-[#F4F6F9] disabled:opacity-50"
                  style={{ color: NAVY }}
                >
                  <Download size={14} /> {exporting ? 'Exporting…' : 'Export'}
                  <ChevronDown size={13} className="text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              {/* Styled to the app's own surfaces: the UI kit's default accent is
                  the gold theme colour, which reads as a warning here. */}
              <DropdownMenuContent
                align="end"
                sideOffset={6}
                className="w-72 rounded-xl border border-[#E7EDF4] bg-white p-1.5 shadow-[0_16px_40px_-16px_rgba(10,23,40,0.35)]"
              >
                <p className="px-2.5 pb-1.5 pt-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Export to Excel
                </p>
                <ExportOption
                  icon={<Filter size={15} className="text-[#1b365d]" />}
                  title="With current filters"
                  count={filtered.length}
                  note={isFiltered ? 'Only the clients shown by the search and filters' : 'Search or pick a filter first'}
                  disabled={!isFiltered}
                  onSelect={() => runExport(filtered, 'filtered')}
                />
                <ExportOption
                  icon={<Users size={15} className="text-[#1b365d]" />}
                  title="All clients"
                  count={clients.length}
                  note="The whole client master"
                  onSelect={() => runExport(clients, 'all')}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {clients.length === 0 ? 'No clients yet.' : `No client matches “${search.trim()}”.`}
          </p>
        ) : (
          <>
            {/* Mobile: openable cards */}
            <div className="space-y-2.5 p-3 md:hidden">
              {paged.map(client => {
                const open = openCards.has(client.id);
                const tint = tintFor(client.name);
                return (
                  <div key={client.id} className="overflow-hidden rounded-xl border border-[#E7EDF4]">
                    <button onClick={() => toggleCard(client.id)} className="flex w-full items-center gap-3 px-3.5 py-3 text-left">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-semibold"
                        style={{ backgroundColor: tint.bg, color: tint.fg }}
                      >
                        {initials(client.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.85rem] font-medium" style={{ color: NAVY }}>{client.name}</p>
                        <div className="flex items-center gap-1.5">
                          <p className="truncate identifier text-[0.72rem] text-muted-foreground/70">
                            {client.pan || 'No PAN'}
                          </p>
                          <NonFilerTag type={client.clientType} />
                        </div>
                      </div>
                      <StatusDot status={client.status} />
                      <ChevronDown size={16} className={`shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open && (
                      <dl className="divide-y divide-[#F1F4F8] border-t border-[#F1F4F8] px-3.5">
                        <CardRow label="Industry">{client.industry || <Dash />}</CardRow>
                        <CardRow label="GSTIN">
                          <span className="identifier break-all text-[0.8rem]">{client.gstin || client.gst || <Dash />}</span>
                        </CardRow>
                        <CardRow label="Contact">{client.contact || client.mobileNumber || <Dash />}</CardRow>
                        <div className="flex items-center justify-end gap-2 py-2.5">
                          <button onClick={() => openEdit(client)} className="rounded-full border border-[#E7EDF4] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[#F4F6F9]" style={{ color: NAVY }}>Edit</button>
                          <button onClick={() => openView(client)} className="rounded-full bg-[#1b365d] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#142a4a]">View</button>
                        </div>
                      </dl>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E7EDF4] bg-[#FAFBFD]">
                    <Th className="pl-5">Client</Th>
                    <Th>PAN</Th>
                    <Th>GSTIN</Th>
                    <Th>Contact</Th>
                    <Th>Status</Th>
                    <Th className="pr-5 text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map(client => {
                    const tint = tintFor(client.name);
                    return (
                      <tr
                        key={client.id}
                        onClick={() => openView(client)}
                        // The whole row opens the client, so reaching the record
                        // is not a hunt for a small button at the far right.
                        className="group cursor-pointer border-b border-[#F1F4F8] transition-colors last:border-0 hover:bg-[#F7FAFF]"
                      >
                        <td className="max-w-[340px] py-2.5 pl-5 pr-3">
                          <div className="flex items-center gap-3">
                            <span
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.66rem] font-semibold"
                              style={{ backgroundColor: tint.bg, color: tint.fg }}
                            >
                              {initials(client.name)}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="truncate text-[0.84rem] font-medium" style={{ color: NAVY }} title={client.name}>
                                  {client.name}
                                </p>
                                <NonFilerTag type={client.clientType} />
                              </div>
                              {/* Industry rides under the name rather than
                                  holding a column of its own — it is blank for
                                  most clients, and an empty column reads as a
                                  fault in the data. */}
                              <p className="truncate text-[0.7rem] text-muted-foreground">
                                {client.industry || client.firmName || '—'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 identifier text-[0.78rem] text-foreground/75">
                          {client.pan || <NoPan reason={client.panMissingReason} />}
                        </td>
                        <td className="px-3 py-2.5 identifier text-[0.78rem] text-foreground/75">
                          {client.gstin || client.gst || <Dash />}
                        </td>
                        <td className="px-3 py-2.5 text-[0.8rem] text-foreground/75">
                          {client.contact || client.mobileNumber || <Dash />}
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusPill status={client.status} />
                        </td>
                        <td className="py-2.5 pl-3 pr-5" onClick={e => e.stopPropagation()}>
                          {/* Faint until the row is hovered, so 25 rows do not
                              carry 50 competing buttons. Kept at full opacity on
                              touch, where there is no hover to reveal them. */}
                          <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                            <IconBtn label="Edit client" onClick={() => openEdit(client)}><Pencil size={14} /></IconBtn>
                            <IconBtn label="View client" onClick={() => openView(client)}><Eye size={14} /></IconBtn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 border-t border-[#E7EDF4] px-5 py-3">
                <p className="text-xs text-muted-foreground">
                  {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1.5">
                  <PageBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} label="Previous page">
                    <ChevronLeft size={15} />
                  </PageBtn>
                  <span className="px-2 text-xs font-medium" style={{ color: NAVY }}>{safePage} / {totalPages}</span>
                  <PageBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} label="Next page">
                    <ChevronRight size={15} />
                  </PageBtn>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {showAdd && <AddClientModal onClose={() => setShowAdd(false)} onSuccess={() => { load(); setShowAdd(false); }} onOpenExisting={openExisting} />}
      {showEdit && selected && (
        <EditClientModal
          client={selected}
          onClose={() => { setShowEdit(false); setSelected(null); }}
          onSuccess={() => { load(); setShowEdit(false); setSelected(null); }}
          onOpenExisting={openExisting}
        />
      )}
      {showView && selected && (
        <ViewClientModal client={selected} onClose={() => { setShowView(false); setSelected(null); }} onEdit={() => { setShowView(false); setShowEdit(true); }} />
      )}
    </div>
  );
}

/**
 * Marks a client the firm does not file for.
 *
 * Only ever drawn for non-filers — a matching "Filing" badge on the other 605
 * rows would be noise, since that is the norm. Amber rather than red: this is a
 * standing arrangement, not a problem to fix.
 */
function NonFilerTag({ type }: { type?: string }) {
  if (type !== 'Non-filer') return null;
  return (
    <span
      className="shrink-0 whitespace-nowrap rounded-md border border-[#FDE68A] bg-[#FFFBEB] px-1.5 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.06em] text-[#92400E]"
      title="On record, but this firm does not file their return"
    >
      Non-filer
    </span>
  );
}

function ExportOption({ icon, title, count, note, disabled, onSelect }: {
  icon: React.ReactNode; title: string; count: number; note: string; disabled?: boolean; onSelect: () => void;
}) {
  return (
    <DropdownMenuItem
      disabled={disabled}
      onSelect={onSelect}
      className="group cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2.5 focus:bg-[#F4F6F9] focus:text-[#1b365d] data-[disabled]:opacity-45"
    >
      <span
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors group-focus:bg-white"
        style={{ backgroundColor: 'rgba(27,54,93,0.07)', color: NAVY }}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium" style={{ color: NAVY }}>{title}</span>
          <span className="rounded-full bg-[#F4F6F9] px-2 py-0.5 text-[0.68rem] font-medium text-muted-foreground group-focus:bg-white">
            {count}
          </span>
        </span>
        <span className="mt-0.5 text-xs leading-snug text-muted-foreground">{note}</span>
      </span>
    </DropdownMenuItem>
  );
}

/** A missing PAN, said as what it is rather than a dash that reads as "fine". */
function NoPan({ reason }: { reason?: string }) {
  const label = reason === 'Client has no PAN' ? 'No PAN' : reason === 'Foreign / non-resident entity' ? 'Foreign entity' : 'PAN Awaited';
  return (
    <span className="whitespace-nowrap rounded-md border border-[#FDE68A] bg-[#FFFBEB] px-1.5 py-0.5 font-sans text-[0.68rem] font-medium text-[#92400E]" title={reason || 'PAN awaited from client'}>
      {label}
    </span>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-3 py-2.5 text-left text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground ${className}`}>
      {children}
    </th>
  );
}

/**
 * Status as a tinted dot and a word.
 *
 * A solid green badge on every row of 606 shouts the least interesting fact on
 * the screen — almost every client is active. The dot keeps it legible while
 * letting the inactive ones be the ones that stand out.
 */
function StatusPill({ status }: { status?: string }) {
  const inactive = status === 'Inactive';
  return (
    <span className={`inline-flex items-center gap-1.5 text-[0.75rem] font-medium ${inactive ? 'text-slate-400' : 'text-[#3d8a22]'}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: inactive ? '#cbd5e1' : '#4ea72e' }} />
      {status || 'Active'}
    </span>
  );
}

function StatusDot({ status }: { status?: string }) {
  const inactive = status === 'Inactive';
  return (
    <span
      className="h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: inactive ? '#cbd5e1' : '#4ea72e' }}
      title={status || 'Active'}
    />
  );
}

function IconBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E7EDF4] bg-white text-muted-foreground transition-colors hover:border-[#1b365d] hover:text-[#1b365d]"
    >
      {children}
    </button>
  );
}

function PageBtn({ children, label, onClick, disabled }: {
  children: React.ReactNode; label: string; onClick: () => void; disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E7EDF4] text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function CardRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="shrink-0 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-[0.8rem] font-medium text-foreground/80">{children}</dd>
    </div>
  );
}
