import React, { useCallback, useEffect, useState } from 'react';
import { clientApprovalsAPI } from '../services/api';
import { useToast } from './Toast';
import { useLiveData } from '../hooks/useLiveData';
import { Check, X, UserRoundCheck } from 'lucide-react';

const NAVY = '#1b365d';

const labels: Record<string, string> = {
  name: 'Client name', firm_name: 'Firm name', pan: 'PAN', gst: 'GSTIN',
  contact: 'Contact', email: 'Email', industry: 'Industry', status: 'Status',
  selected_services: 'Services', itr_fees: 'ITR fees', gst_fees: 'GST fees',
  gst_annual_return_fees: 'GST annual return fees', accounting_fees: 'Accounting fees',
  audit_fees: 'Audit fees', company_act_fees: 'Company Act fees', tds_fees: 'TDS fees',
  pf_esic_pt_labour_fees: 'PF / ESIC / PT / Labour fees', consultancy_fees: 'Consultancy fees',
  total_fees: 'Total fees',
  discontinued_services: 'Discontinued services',
};

function shown(value: any) {
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'None';
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

export function ClientApprovalQueue() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { showSuccess, showError } = useToast();

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const r = await clientApprovalsAPI.getPending();
    if (r.success) setItems(r.data || []); else if (!silent) showError(r.error || 'Failed to load approvals');
    if (!silent) setLoading(false);
  }, []);
  useEffect(() => { load(); }, []);
  useLiveData(['client-approvals'], () => load(true));

  const decide = async (item: any, decision: 'Approved' | 'Rejected') => {
    if (decision === 'Rejected' && !notes[item.id]?.trim()) { showError('Add a reason before rejecting'); return; }
    setBusy(item.id);
    const r = await clientApprovalsAPI.decide(item.id, decision, notes[item.id]);
    setBusy(null);
    if (!r.success) { showError(r.error || 'Could not save the decision'); return; }
    showSuccess(`${item.entity_name} ${decision.toLowerCase()}.`);
    setItems(xs => xs.filter(x => x.id !== item.id));
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div>
        <h1 className="text-[1.6rem] font-semibold tracking-tight" style={{ color: NAVY }}>Client Approvals</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review additions and changes before they reach Client Master.</p>
      </div>
      {loading ? <p className="py-12 text-center text-sm text-muted-foreground">Loading approvals…</p> : items.length === 0 ? (
        <section className="rounded-xl border border-[#E7EDF4] bg-white py-14 text-center">
          <UserRoundCheck className="mx-auto mb-3 text-[#4ea72e]" size={28} />
          <p className="text-sm font-medium" style={{ color: NAVY }}>No client changes are waiting</p>
        </section>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <section key={item.id} className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
              <div className="flex flex-col gap-2 border-b border-[#E7EDF4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: NAVY }}>{item.entity_name}</p>
                  <p className="text-xs text-muted-foreground">{item.action_key === 'client.create' ? 'New client' : 'Client details update'} requested by {item.requested_by_name}</p>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(item.requested_at).toLocaleString('en-IN')}</span>
              </div>
              <div className="grid gap-x-6 gap-y-3 px-5 py-4 sm:grid-cols-2">
                {Object.entries(labels).map(([key, label]) => item.payload?.[key] !== undefined &&
                  (item.action_key === 'client.create' || JSON.stringify(item.previous_payload?.[key] ?? null) !== JSON.stringify(item.payload[key] ?? null)) && (
                  <div key={key} className="flex justify-between gap-4 border-b border-[#F1F4F8] pb-2 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-right font-medium" style={{ color: NAVY }}>
                      {item.action_key === 'client.update' && <span className="mr-1 text-xs font-normal text-slate-400 line-through">{shown(item.previous_payload?.[key])}</span>}
                      {shown(item.payload[key])}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-3 border-t border-[#E7EDF4] bg-[#F9FAFB] px-5 py-4 sm:flex-row sm:items-center">
                <input value={notes[item.id] || ''} onChange={e => setNotes(n => ({ ...n, [item.id]: e.target.value }))}
                  placeholder="Decision note (required for rejection)" className="min-w-0 flex-1 rounded-lg border border-[#D9E2EC] bg-white px-3 py-2 text-sm" />
                <button onClick={() => decide(item, 'Rejected')} disabled={busy === item.id}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50"><X size={15} /> Reject</button>
                <button onClick={() => decide(item, 'Approved')} disabled={busy === item.id}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#4ea72e] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><Check size={15} /> Approve</button>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

