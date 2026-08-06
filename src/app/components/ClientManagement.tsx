import React, { useEffect, useMemo, useState } from 'react';
import { clientsAPI } from '../services/api';
import { AddClientModal } from './AddClientModal';
import { EditClientModal } from './EditClientModal';
import { ViewClientModal } from './ViewClientModal';
import { useToast } from './Toast';
import { Building2, Search, ChevronDown, ChevronLeft, ChevronRight, Eye, Pencil } from 'lucide-react';
import { useLiveData } from '../hooks/useLiveData';

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

export function ClientManagement() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'all' | 'Filing' | 'Non-filer'>('all');
  const [page, setPage] = useState(1);
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showView, setShowView] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const { showError } = useToast();

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter(c => {
      if (type !== 'all' && (c.clientType || 'Filing') !== type) return false;
      if (!q) return true;
      return [
        c.name, c.firmName, c.industry, c.pan, c.gstin || c.gst,
        c.contact || c.mobileNumber, c.email || c.emailId, c.fileNumber,
      ].some(v => (v || '').toString().toLowerCase().includes(q));
    });
  }, [clients, search, type]);

  // A search that shortens the list must not leave you stranded on page 20.
  useEffect(() => { setPage(1); }, [search, type]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const paged = filtered.slice(pageStart, pageStart + PAGE_SIZE);

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
        <div className="flex flex-col gap-3 border-b border-[#E7EDF4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold" style={{ color: NAVY }}>Client Master</h2>
            <span className="rounded-full bg-[#F4F6F9] px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {filtered.length}
              {filtered.length !== clients.length && <span className="text-muted-foreground/60"> / {clients.length}</span>}
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {nonFilerCount > 0 && (
            <div className="flex rounded-lg border border-[#E7EDF4] p-0.5">
              {([['all', 'All'], ['Filing', 'Filing'], ['Non-filer', 'Non-filers']] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setType(key)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    type === key ? 'text-white' : 'text-muted-foreground hover:bg-[#F4F6F9]'
                  }`}
                  style={type === key ? { backgroundColor: NAVY } : undefined}
                >
                  {label}
                  {key === 'Non-filer' && <span className={`ml-1 ${type === key ? 'text-white/60' : 'text-muted-foreground/60'}`}>{nonFilerCount}</span>}
                </button>
              ))}
            </div>
          )}
          <div className="relative w-full sm:w-[260px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, PAN, GSTIN, contact…"
              className="w-full rounded-lg border border-[#E7EDF4] bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15"
            />
          </div>
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
                          {client.pan || <Dash />}
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

      {showAdd && <AddClientModal onClose={() => setShowAdd(false)} onSuccess={() => { load(); setShowAdd(false); }} />}
      {showEdit && selected && (
        <EditClientModal client={selected} onClose={() => { setShowEdit(false); setSelected(null); }} onSuccess={() => { load(); setShowEdit(false); setSelected(null); }} />
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
