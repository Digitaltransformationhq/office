import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table';
import { Badge } from './Badge';
import { Button } from './Button';
import { clientsAPI } from '../services/api';
import { AddClientModal } from './AddClientModal';
import { EditClientModal } from './EditClientModal';
import { ViewClientModal } from './ViewClientModal';
import { useToast } from './Toast';
import { Building2, Search, ChevronDown } from 'lucide-react';

const NAVY = '#1b365d';

export function ClientManagement() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showView, setShowView] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const { showError } = useToast();

  useEffect(() => { load(); }, []);

  // Auto-refresh in the background, replacing the manual refresh button.
  useEffect(() => {
    const interval = setInterval(() => load({ silent: true }), 60000);
    return () => clearInterval(interval);
  }, []);

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

  const q = search.trim().toLowerCase();
  const filtered = clients.filter(c => !q ||
    (c.name || '').toLowerCase().includes(q) ||
    (c.industry || '').toLowerCase().includes(q) ||
    (c.gstin || c.gst || '').toLowerCase().includes(q) ||
    (c.contact || c.mobileNumber || '').toLowerCase().includes(q));

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

      {/* Section */}
      <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#E7EDF4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold" style={{ color: NAVY }}>Client Master</h2>
            <span className="rounded-full bg-[#F4F6F9] px-2 py-0.5 text-xs font-medium text-muted-foreground">{filtered.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, GST, contact…" className="w-full rounded-lg border border-[#E7EDF4] bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Mobile: openable cards */}
            <div className="space-y-2.5 p-4 md:hidden">
              {filtered.map((client) => {
                const open = openCards.has(client.id);
                return (
                  <div key={client.id} className="overflow-hidden rounded-xl border border-[#E7EDF4]">
                    <button onClick={() => toggleCard(client.id)} className="flex w-full items-start gap-2.5 px-3.5 py-3 text-left">
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.85rem] font-medium" style={{ color: NAVY }}>{client.name}</p>
                        <span className="mt-1.5 inline-block"><Badge variant="success">{client.status || 'Active'}</Badge></span>
                      </div>
                      <ChevronDown size={16} className={`mt-0.5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open && (
                      <dl className="divide-y divide-[#F1F4F8] border-t border-[#F1F4F8] px-3.5">
                        <CardRow label="Industry">{client.industry || 'N/A'}</CardRow>
                        <CardRow label="GST Number"><span className="break-all font-mono text-xs">{client.gstin || client.gst || 'N/A'}</span></CardRow>
                        <CardRow label="Contact">{client.contact || client.mobileNumber || 'N/A'}</CardRow>
                        <div className="flex items-center justify-end gap-2 py-2.5">
                          <Button size="sm" variant="secondary" onClick={() => { setSelected(client); setShowEdit(true); }}>Edit</Button>
                          <Button size="sm" variant="secondary" onClick={() => { setSelected(client); setShowView(true); }}>View</Button>
                        </div>
                      </dl>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>GST Number</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>{client.name}</TableCell>
                      <TableCell>{client.industry || 'N/A'}</TableCell>
                      <TableCell className="font-mono text-xs">{client.gstin || client.gst || 'N/A'}</TableCell>
                      <TableCell>{client.contact || client.mobileNumber || 'N/A'}</TableCell>
                      <TableCell><Badge variant="success">{client.status || 'Active'}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => { setSelected(client); setShowEdit(true); }}>Edit</Button>
                          <Button size="sm" variant="secondary" onClick={() => { setSelected(client); setShowView(true); }}>View</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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

function CardRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="shrink-0 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-[0.8rem] font-medium text-foreground/80">{children}</dd>
    </div>
  );
}
