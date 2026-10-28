import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDownToLine, ArrowUpFromLine, Clock3, FileText, Search, X } from 'lucide-react';
import { clientsAPI, documentMovementsAPI, type DocumentMovement } from '../services/api';
import { useLiveData } from '../hooks/useLiveData';
import { useToast } from './Toast';
import { sortByText } from '../utils/sorting';

const NAVY = '#1b365d';

interface DocumentMovementManagerProps {
  user: { id: string; name: string; email: string; role: string };
}

type Direction = 'IN' | 'OUT';
type ClientRow = { id: string; name: string; status?: string; firmName?: string };

const formatDateTime = (value: string) => new Date(value).toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const indiaDateKey = (value: Date | string) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(value));

export function DocumentMovementManager({ user }: DocumentMovementManagerProps) {
  const { showSuccess, showError } = useToast();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [movements, setMovements] = useState<DocumentMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState<{ client: ClientRow; direction: Direction } | null>(null);
  const [historyClient, setHistoryClient] = useState<ClientRow | null>(null);

  const load = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setLoading(true);
      const [clientsResult, movementsResult] = await Promise.all([
        clientsAPI.getAll(),
        documentMovementsAPI.getAll(),
      ]);
      if (!clientsResult.success) throw new Error(clientsResult.error || 'Could not load clients.');
      if (!movementsResult.success) throw new Error(movementsResult.error || 'Could not load document history.');
      setClients(sortByText(clientsResult.data || [], client => client.name));
      setMovements(movementsResult.data || []);
    } catch (error) {
      if (!silent) showError(error instanceof Error ? error.message : 'Could not load Docs Manager.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useLiveData(['document-movements'], () => load({ silent: true }));

  const latestByClient = useMemo(() => {
    const latest = new Map<string, DocumentMovement>();
    movements.forEach(movement => {
      if (!latest.has(movement.clientId)) latest.set(movement.clientId, movement);
    });
    return latest;
  }, [movements]);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return clients;
    return clients.filter(client => [client.name, client.firmName]
      .some(value => String(value || '').toLocaleLowerCase().includes(query)));
  }, [clients, search]);

  const today = indiaDateKey(new Date());
  const todayIn = movements.filter(item => item.direction === 'IN' && indiaDateKey(item.recordedAt) === today).length;
  const todayOut = movements.filter(item => item.direction === 'OUT' && indiaDateKey(item.recordedAt) === today).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[1.5rem] font-semibold tracking-tight" style={{ color: NAVY }}>Docs Manager</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Record every client document received and released by the office · Managed by {user.name}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Clients" value={clients.length} />
        <Stat label="In today" value={todayIn} tone="in" />
        <Stat label="Out today" value={todayOut} tone="out" />
        <Stat label="History shown" value={movements.length} />
      </div>

      <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
        <div className="border-b border-[#E7EDF4] p-4">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search all clients"
              aria-label="Search clients"
              className="h-10 w-full rounded-lg border border-[#D9E1EA] bg-white pl-9 pr-9 text-sm outline-none transition placeholder:text-muted-foreground focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/10"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-[#F4F6F9] hover:text-[#1b365d]">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" /></div>
        ) : filteredClients.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-muted-foreground">No clients match this search.</div>
        ) : (
          <div className="max-h-[58vh] overflow-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-[#F9FAFB]">
                <tr className="border-b border-[#E7EDF4]">
                  <Head>Client</Head>
                  <Head>Last movement</Head>
                  <Head className="w-[210px] text-center">Record document</Head>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map(client => {
                  const latest = latestByClient.get(client.id);
                  return (
                    <tr key={client.id} className="border-b border-[#EFF3F8] hover:bg-[#FAFBFD]">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setHistoryClient(client)}
                          className="group max-w-full text-left"
                          aria-label={`View document history for ${client.name}`}
                        >
                          <span className="block font-medium underline-offset-2 group-hover:underline" style={{ color: NAVY }}>{client.name}</span>
                          {client.firmName && client.firmName !== client.name && <span className="mt-0.5 block text-xs text-muted-foreground">{client.firmName}</span>}
                          <span className="mt-1 block text-[0.66rem] font-medium text-[#4f7cc4]">View In/Out history</span>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {latest ? (
                          <div className="flex items-start gap-2">
                            <DirectionBadge direction={latest.direction} />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-foreground/80">{latest.documentType}</p>
                              <p className="mt-0.5 text-[0.68rem] text-muted-foreground">{formatDateTime(latest.recordedAt)}</p>
                            </div>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">No movement recorded</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button type="button" onClick={() => setAction({ client, direction: 'IN' })} className="inline-flex min-w-[82px] items-center justify-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 transition hover:bg-green-100">
                            <ArrowDownToLine size={14} /> In
                          </button>
                          <button type="button" onClick={() => setAction({ client, direction: 'OUT' })} className="inline-flex min-w-[82px] items-center justify-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-100">
                            <ArrowUpFromLine size={14} /> Out
                          </button>
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

      <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
        <div className="flex items-center gap-2 border-b border-[#E7EDF4] px-5 py-4">
          <Clock3 size={17} style={{ color: NAVY }} />
          <h2 className="font-semibold" style={{ color: NAVY }}>Recent document history</h2>
        </div>
        {movements.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">No document movement has been recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-sm">
              <thead className="bg-[#F9FAFB]"><tr className="border-b border-[#E7EDF4]"><Head>Date &amp; time</Head><Head>Client</Head><Head>In / Out</Head><Head>Document</Head><Head>How received / sent</Head><Head>Details</Head></tr></thead>
              <tbody>
                {movements.slice(0, 100).map(item => (
                  <tr key={item.id} className="border-b border-[#EFF3F8] hover:bg-[#FAFBFD]">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDateTime(item.recordedAt)}</td>
                    <td className="px-4 py-3 font-medium" style={{ color: NAVY }}>{item.clientName}</td>
                    <td className="px-4 py-3"><DirectionBadge direction={item.direction} /></td>
                    <td className="px-4 py-3">{item.documentType}</td>
                    <td className="px-4 py-3 text-foreground/75">{item.transferMethod}</td>
                    <td className="max-w-[300px] px-4 py-3 text-foreground/70">{item.details || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {action && (
        <MovementModal
          client={action.client}
          direction={action.direction}
          onClose={() => setAction(null)}
          onSave={async values => {
            const response = await documentMovementsAPI.create({
              clientId: action.client.id,
              direction: action.direction,
              ...values,
            });
            if (!response.success || !response.data) throw new Error(response.error || 'Could not save document movement.');
            setMovements(previous => [response.data!, ...previous]);
            setAction(null);
            showSuccess(`Document ${action.direction === 'IN' ? 'received' : 'released'} and timestamped.`);
          }}
        />
      )}

      {historyClient && (
        <ClientHistoryModal
          client={historyClient}
          initialMovements={movements.filter(item => item.clientId === historyClient.id)}
          onClose={() => setHistoryClient(null)}
        />
      )}
    </div>
  );
}

function ClientHistoryModal({ client, initialMovements, onClose }: {
  client: ClientRow;
  initialMovements: DocumentMovement[];
  onClose: () => void;
}) {
  const [movements, setMovements] = useState(initialMovements);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    let active = true;
    documentMovementsAPI.getByClient(client.id).then(result => {
      if (!active) return;
      if (!result.success) {
        setLoadError(result.error || 'Could not load the complete client history.');
      } else {
        setMovements(result.data || []);
      }
    }).catch(() => {
      if (active) setLoadError('Could not load the complete client history.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [client.id]);

  const incoming = movements.filter(item => item.direction === 'IN').length;
  const outgoing = movements.filter(item => item.direction === 'OUT').length;

  return (
    <ViewportModal>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 sm:p-8" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-title"
        className="m-auto flex max-h-[82vh] flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        style={{ width: 'min(900px, calc(100vw - 32px))' }}
      >
        <div className="flex items-start justify-between border-b border-[#E7EDF4] px-5 py-4">
          <div>
            <h2 id="history-title" className="text-lg font-semibold" style={{ color: NAVY }}>{client.name}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Complete document In/Out history</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close history" className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-[#F4F6F9]"><X size={17} /></button>
        </div>

        <div className="grid grid-cols-3 gap-3 border-b border-[#E7EDF4] bg-[#FAFBFD] px-5 py-3">
          <HistoryStat label="Total" value={movements.length} />
          <HistoryStat label="Documents in" value={incoming} tone="in" />
          <HistoryStat label="Documents out" value={outgoing} tone="out" />
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" /></div>
        ) : loadError ? (
          <div className="flex flex-1 items-center justify-center px-5 py-16 text-center text-sm text-red-600">{loadError}</div>
        ) : movements.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-5 py-16 text-center">
            <FileText size={32} className="mb-3 text-muted-foreground/50" />
            <p className="text-sm font-medium" style={{ color: NAVY }}>No document history yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Use In or Out beside this client to create the first record.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-[#F9FAFB]">
                <tr className="border-b border-[#E7EDF4]"><Head>Date &amp; time</Head><Head>In / Out</Head><Head>Document type</Head><Head>How received / sent</Head><Head>Contents / notes</Head></tr>
              </thead>
              <tbody>
                {movements.map(item => (
                  <tr key={item.id} className="border-b border-[#EFF3F8] hover:bg-[#FAFBFD]">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDateTime(item.recordedAt)}</td>
                    <td className="px-4 py-3"><DirectionBadge direction={item.direction} /></td>
                    <td className="px-4 py-3 font-medium" style={{ color: NAVY }}>{item.documentType}</td>
                    <td className="px-4 py-3 text-foreground/75">{item.transferMethod}</td>
                    <td className="max-w-[320px] px-4 py-3 text-foreground/70">{item.details || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end border-t border-[#E7EDF4] bg-white px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-[#D9E1EA] px-4 py-2 text-sm font-medium text-foreground/75 hover:bg-[#F7F9FC]">Close</button>
        </div>
      </div>
      </div>
    </ViewportModal>
  );
}

function MovementModal({ client, direction, onClose, onSave }: {
  client: ClientRow;
  direction: Direction;
  onClose: () => void;
  onSave: (values: { documentType: string; transferMethod: string; details: string; sourceInId?: string }) => Promise<void>;
}) {
  const [documentType, setDocumentType] = useState('');
  const [transferMethod, setTransferMethod] = useState('');
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [outMode, setOutMode] = useState<'existing' | 'new'>('existing');
  const [openIncoming, setOpenIncoming] = useState<DocumentMovement[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [loadingIncoming, setLoadingIncoming] = useState(direction === 'OUT');

  const incoming = direction === 'IN';

  useEffect(() => {
    if (incoming) return;
    let active = true;
    documentMovementsAPI.getByClient(client.id).then(result => {
      if (!active) return;
      if (!result.success) {
        setError(result.error || 'Could not load documents currently in the office.');
        setOutMode('new');
        return;
      }
      const history = result.data || [];
      const closedIds = new Set(history.filter(item => item.direction === 'OUT' && item.sourceInId).map(item => item.sourceInId));
      const unmatched = history.filter(item => item.direction === 'IN' && !closedIds.has(item.id));
      setOpenIncoming(unmatched);
      if (unmatched.length > 0) {
        setSelectedSourceId(unmatched[0].id);
      } else {
        setOutMode('new');
      }
    }).catch(() => {
      if (active) {
        setError('Could not load documents currently in the office. You can still enter another document.');
        setOutMode('new');
      }
    }).finally(() => {
      if (active) setLoadingIncoming(false);
    });
    return () => { active = false; };
  }, [client.id, incoming]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [saving, onClose]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const selectedSource = openIncoming.find(item => item.id === selectedSourceId);
    const usingExisting = !incoming && outMode === 'existing';
    if (usingExisting && !selectedSource) {
      setError('Select a document that is currently in the office.');
      return;
    }
    if ((!usingExisting && !documentType.trim()) || !transferMethod.trim()) {
      setError('Document type and transfer method are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        documentType: selectedSource?.documentType || documentType.trim(),
        transferMethod: transferMethod.trim(),
        details: details.trim(),
        sourceInId: usingExisting ? selectedSource?.id : undefined,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save document movement.');
      setSaving(false);
    }
  };

  return (
    <ViewportModal>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 sm:p-8" onMouseDown={event => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="movement-title" className="m-auto flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#E7EDF4] px-5 py-4">
          <div className="flex items-start gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${incoming ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
              {incoming ? <ArrowDownToLine size={20} /> : <ArrowUpFromLine size={20} />}
            </span>
            <div><h2 id="movement-title" className="font-semibold" style={{ color: NAVY }}>Document {direction}</h2><p className="mt-0.5 text-sm text-muted-foreground">{client.name}</p></div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-[#F4F6F9]"><X size={17} /></button>
        </div>

        <form onSubmit={submit} className="flex-1 space-y-4 overflow-y-auto p-5">
          {!incoming && (
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#F4F6F9] p-1">
              <button
                type="button"
                onClick={() => { setOutMode('existing'); setError(''); }}
                disabled={loadingIncoming || openIncoming.length === 0}
                className={`rounded-md px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${outMode === 'existing' ? 'bg-white text-[#1b365d] shadow-sm' : 'text-muted-foreground hover:text-[#1b365d]'}`}
              >
                From received documents{openIncoming.length > 0 ? ` (${openIncoming.length})` : ''}
              </button>
              <button
                type="button"
                onClick={() => { setOutMode('new'); setError(''); }}
                className={`rounded-md px-3 py-2 text-xs font-semibold transition ${outMode === 'new' ? 'bg-white text-[#1b365d] shadow-sm' : 'text-muted-foreground hover:text-[#1b365d]'}`}
              >
                Enter another document
              </button>
            </div>
          )}

          {!incoming && outMode === 'existing' ? (
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-medium" style={{ color: NAVY }}>Select a document currently in the office</span>
                {!loadingIncoming && <span className="text-xs text-muted-foreground">{openIncoming.length} available</span>}
              </div>
              {loadingIncoming ? (
                <div className="flex items-center justify-center rounded-lg border border-[#E7EDF4] py-10"><div className="h-5 w-5 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" /></div>
              ) : openIncoming.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#D9E1EA] px-4 py-6 text-center text-sm text-muted-foreground">No unmatched In documents. Use “Enter another document” instead.</div>
              ) : (
                <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                  {openIncoming.map(item => (
                    <label key={item.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${selectedSourceId === item.id ? 'border-orange-300 bg-orange-50' : 'border-[#E7EDF4] hover:border-[#C9D4E2]'}`}>
                      <input type="radio" name="source-document" value={item.id} checked={selectedSourceId === item.id} onChange={() => setSelectedSourceId(item.id)} className="mt-1 accent-orange-600" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold" style={{ color: NAVY }}>{item.documentType}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">Received {formatDateTime(item.recordedAt)} · {item.transferMethod}</span>
                        {item.details && <span className="mt-1 block text-xs text-foreground/65">{item.details}</span>}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <label className="block"><span className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>Document type <span className="text-red-600">*</span></span><input autoFocus value={documentType} onChange={event => setDocumentType(event.target.value)} placeholder="e.g. Bank statement, purchase bills, signed form" className="w-full rounded-lg border border-[#D9E1EA] px-3 py-2.5 text-sm outline-none focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/10" /></label>
          )}

          <label className="block"><span className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>{incoming ? 'How was it received?' : 'How was it sent?'} <span className="text-red-600">*</span></span><input value={transferMethod} onChange={event => setTransferMethod(event.target.value)} placeholder={incoming ? 'e.g. Hand delivered, courier, email, WhatsApp' : 'e.g. Collected by client, courier, email, WhatsApp'} className="w-full rounded-lg border border-[#D9E1EA] px-3 py-2.5 text-sm outline-none focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/10" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>{!incoming && outMode === 'existing' ? 'Out notes' : 'Contents / notes'}</span><textarea value={details} onChange={event => setDetails(event.target.value)} rows={3} placeholder={!incoming && outMode === 'existing' ? 'Optional recipient or dispatch notes' : 'Describe the documents, period, quantity, recipient, or any other useful details'} className="w-full resize-y rounded-lg border border-[#D9E1EA] px-3 py-2.5 text-sm outline-none focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/10" /></label>
          <div className="flex items-center gap-2 rounded-lg bg-[#F7F9FC] px-3 py-2 text-xs text-muted-foreground"><FileText size={14} /> Date and time will be recorded automatically when saved.</div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-[#EFF3F8] pt-4"><button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-[#D9E1EA] px-4 py-2 text-sm font-medium text-foreground/75 hover:bg-[#F7F9FC] disabled:opacity-50">Cancel</button><button type="submit" disabled={saving} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${incoming ? 'bg-green-700 hover:bg-green-800' : 'bg-orange-600 hover:bg-orange-700'}`}>{saving ? 'Saving…' : `Save document ${direction}`}</button></div>
        </form>
      </div>
      </div>
    </ViewportModal>
  );
}

function ViewportModal({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body);
}

function DirectionBadge({ direction }: { direction: Direction }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[0.68rem] font-semibold ${direction === 'IN' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{direction}</span>;
}

function Stat({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'in' | 'out' }) {
  const color = tone === 'in' ? '#15803d' : tone === 'out' ? '#c2410c' : NAVY;
  return <div className="rounded-xl border border-[#E7EDF4] bg-white px-4 py-3.5"><p className="text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold" style={{ color }}>{value.toLocaleString('en-IN')}</p></div>;
}

function HistoryStat({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'in' | 'out' }) {
  const color = tone === 'in' ? '#15803d' : tone === 'out' ? '#c2410c' : NAVY;
  return <div className="rounded-lg border border-[#E7EDF4] bg-white px-3 py-2 text-center"><p className="text-[0.6rem] font-semibold uppercase tracking-[0.07em] text-muted-foreground">{label}</p><p className="mt-0.5 text-lg font-semibold" style={{ color }}>{value.toLocaleString('en-IN')}</p></div>;
}

function Head({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2.5 text-left text-[0.62rem] font-semibold uppercase tracking-[0.07em] text-muted-foreground ${className}`}>{children}</th>;
}
