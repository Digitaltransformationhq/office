import React, { useMemo, useState } from 'react';
import { X, CircleSlash2 } from 'lucide-react';
import { clientsAPI } from '../services/api';
import { FEE_FIELDS, NAVY, overlayCls, panelCls } from './clientModalUI';
import { useToast } from './Toast';

interface Props {
  client: any;
  onClose: () => void;
  onSuccess: () => void;
}

/** Manage service-level discontinuation without deactivating the whole client. */
export function DiscontinueClientServicesModal({ client, onClose, onSuccess }: Props) {
  const initial = useMemo(() => new Set<string>(client.discontinuedServices || []), [client]);
  const [selected, setSelected] = useState<Set<string>>(initial);
  const [saving, setSaving] = useState(false);
  const { showSuccess, showError } = useToast();
  const applicable = useMemo(() => {
    const configured = Array.isArray(client.selectedServices) && client.selectedServices.length
      ? new Set<string>(client.selectedServices)
      : new Set(FEE_FIELDS.filter(f => Number(client[f.key]) > 0).map(f => f.key));
    // Existing discontinued services remain manageable even if an older record
    // did not keep selected_services accurately.
    initial.forEach(key => configured.add(key));
    return FEE_FIELDS.filter(f => configured.size === 0 || configured.has(f.key));
  }, [client, initial]);

  const toggle = (key: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const save = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const previousDates = client.serviceDiscontinuedAt || {};
    const dates: Record<string, string> = {};
    for (const key of selected) dates[key] = previousDates[key] || now;
    const response = await clientsAPI.update(client.id, {
      discontinuedServices: [...selected],
      serviceDiscontinuedAt: dates,
    });
    setSaving(false);
    if (!response.success) { showError(response.error || 'Failed to update services'); return; }
    showSuccess(response.pendingApproval
      ? `Service changes sent to ${response.data?.approver_name || 'the assigned approver'} for approval.`
      : 'Client services updated.');
    onSuccess();
    onClose();
  };

  return (
    <div className={overlayCls}>
      <div className={`${panelCls} max-w-lg`}>
        <div className="flex items-start justify-between gap-4 border-b border-[#E7EDF4] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><CircleSlash2 size={19} /></span>
            <div>
              <h2 className="text-[1.05rem] font-semibold" style={{ color: NAVY }}>Discontinue client services</h2>
              <p className="text-xs text-muted-foreground">{client.name}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={saving} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-[#F4F6F9]"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto px-6 py-5">
          <p className="mb-4 text-sm text-muted-foreground">Tick every service this client has stopped. Untick a service to reactivate it.</p>
          <div className="divide-y divide-[#F1F4F8] overflow-hidden rounded-xl border border-[#E7EDF4]">
            {applicable.map(service => (
              <label key={service.key} className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-[#FAFBFD]">
                <input type="checkbox" checked={selected.has(service.key)} onChange={() => toggle(service.key)} className="h-4 w-4" />
                <span className="flex-1 text-sm font-medium" style={{ color: NAVY }}>{service.label}</span>
                <span className={`text-xs ${selected.has(service.key) ? 'font-medium text-amber-700' : 'text-green-700'}`}>
                  {selected.has(service.key) ? 'Discontinued' : 'Active'}
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-3 border-t border-[#E7EDF4] px-6 py-4">
          <button onClick={onClose} disabled={saving} className="flex-1 rounded-lg border border-[#D9E2EC] px-4 py-2 text-sm font-medium">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 rounded-lg bg-[#1b365d] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save services'}</button>
        </div>
      </div>
    </div>
  );
}

