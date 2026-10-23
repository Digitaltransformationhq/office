import React, { useMemo, useState } from 'react';
import { Button } from './Button';
import { clientsAPI } from '../services/api';
import { useToast } from './Toast';
import { X, Building2 } from 'lucide-react';
import {
  NAVY, inputCls, FEE_FIELDS, rupees, Field, SelectField, FeeList, ModalTabs, overlayCls, panelCls,
  PanField, DuplicateWarning, panProblem, panPayload, gstServiceProblem, type PossibleDuplicate,
} from './clientModalUI';

interface EditClientModalProps {
  client: any;
  onClose: () => void;
  onSuccess: () => void;
  /** Active admins save edits directly; every other role submits for approval. */
  adminDirectSave?: boolean;
  /** Open a client that already exists, when this edit turns out to describe them. */
  onOpenExisting?: (clientId: string) => void;
}

export function EditClientModal({ client, onClose, onSuccess, onOpenExisting, adminDirectSave = false }: EditClientModalProps) {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<'basic' | 'billing'>('basic');
  const [duplicates, setDuplicates] = useState<PossibleDuplicate[] | null>(null);
  const initialServices = useMemo(() => client.selectedServices ??
    FEE_FIELDS.filter(f => Number(client[f.key]) > 0).map(f => f.key), [client]);
  const [formData, setFormData] = useState<any>({
    selectedServices: initialServices,
    name: client.name || '',
    pan: client.pan || '',
    noPan: !client.pan,
    panMissingReason: client.pan ? '' : (client.panMissingReason || 'PAN awaited from client'),
    gstin: client.gstin || client.gst || '',
    firmName: client.firmName || '',
    contact: client.contact || client.mobileNumber || '',
    email: client.email || client.emailId || '',
    industry: client.industry || '',
    status: client.status || 'Active',
    itrFees: client.itrFees || 0,
    gstFees: client.gstFees || 0,
    gstAnnualReturnFees: client.gstAnnualReturnFees || 0,
    accountingFees: client.accountingFees || 0,
    auditFees: client.auditFees || 0,
    companyActFees: client.companyActFees || 0,
    tdsFees: client.tdsFees || 0,
    pfEsicPtLabourFees: client.pfEsicPtLabourFees || 0,
    consultancyFees: client.consultancyFees || 0,
  });

  const set = (field: string, value: string | number) => setFormData((p: any) => ({ ...p, [field]: value }));
  const total = FEE_FIELDS.reduce((s, f) => s + (formData[f.key] || 0), 0);
  const serviceChanges = useMemo(() => {
    const before = new Set<string>(initialServices);
    const after = new Set<string>(formData.selectedServices || []);
    return {
      added: FEE_FIELDS.filter(field => after.has(field.key) && !before.has(field.key)),
      removed: FEE_FIELDS.filter(field => before.has(field.key) && !after.has(field.key)),
    };
  }, [initialServices, formData.selectedServices]);
  const hasServiceChanges = serviceChanges.added.length > 0 || serviceChanges.removed.length > 0;

  const save = async (confirmNotDuplicate = false) => {
    if (!formData.name) { showError('Client name is required'); setActiveTab('basic'); return; }
    const problem = panProblem(formData) || gstServiceProblem(formData);
    if (problem) { showError(problem); setActiveTab('basic'); return; }
    const missingFee = serviceChanges.added.find(field => Number(formData[field.key]) <= 0);
    if (missingFee) {
      showError(`Enter the annual fee for ${missingFee.label} before requesting approval.`);
      setActiveTab('billing');
      return;
    }
    if (serviceChanges.removed.length && !window.confirm(
      `${serviceChanges.removed.map(field => field.label).join(', ')} will be removed from its service section after Brijesh Pitroda approves this change. Continue?`,
    )) return;
    setLoading(true);
    try {
      const { noPan, ...fields } = formData;
      const response = await clientsAPI.update(client.id, { ...fields, ...panPayload(formData), totalFees: total, confirmNotDuplicate });
      if (response.success) {
        showSuccess(response.pendingApproval
          ? `Sent to ${response.data?.approver_name || 'the assigned approver'} for approval.`
          : 'Client updated successfully!');
        onSuccess(); onClose(); return;
      }
      if (response.code === 'POSSIBLE_DUPLICATE') { setDuplicates(response.duplicates || []); setActiveTab('basic'); return; }
      // A PAN that already belongs to someone else usually means this record is
      // that client's duplicate — worth saying so, not just refusing.
      if (response.code === 'PAN_EXISTS' || response.code === 'GSTIN_EXISTS') {
        showError(`${response.error}. This record may be a duplicate of that client, so it was not saved.`);
        return;
      }
      showError(response.error || 'Failed to update client');
    } catch (error) {
      console.error('Error updating client:', error);
      showError('Failed to update client. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); save(false); };

  return (
    <div className={overlayCls}>
      <div className={`${panelCls} max-w-xl`}>
        <div className="flex items-start justify-between gap-4 border-b border-[#E7EDF4] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}>
              <Building2 size={20} />
            </span>
            <div>
              <h2 className="text-[1.05rem] font-semibold" style={{ color: NAVY }}>Edit Client</h2>
              <p className="text-xs text-muted-foreground">Update client details and fee schedule</p>
            </div>
          </div>
          <button onClick={onClose} disabled={loading} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <ModalTabs tabs={[{ key: 'basic', label: 'Basic Information' }, { key: 'billing', label: 'Services & Fees' }]} active={activeTab} onChange={setActiveTab} />

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {duplicates && (
              <div className="mb-5">
                <DuplicateWarning
                  duplicates={duplicates}
                  busy={loading}
                  onOpen={onOpenExisting ? d => { onClose(); onOpenExisting(d.id); } : undefined}
                  onSaveAnyway={() => save(true)}
                  onBack={() => setDuplicates(null)}
                  saveLabel="Different client — save anyway"
                />
              </div>
            )}
            {activeTab === 'basic' ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Client name" required><input className={inputCls} value={formData.name} onChange={e => set('name', e.target.value)} required /></Field>
                <Field label="Firm name"><input className={inputCls} value={formData.firmName} onChange={e => set('firmName', e.target.value)} /></Field>
                <PanField
                  pan={formData.pan} noPan={formData.noPan} reason={formData.panMissingReason}
                  onChange={patch => { setDuplicates(null); setFormData((p: any) => ({ ...p, ...patch })); }}
                />
                <Field label="GSTIN"><input className={inputCls} value={formData.gstin} onChange={e => set('gstin', e.target.value.toUpperCase())} maxLength={15} /></Field>
                <Field label="Contact"><input className={inputCls} type="tel" value={formData.contact} onChange={e => set('contact', e.target.value)} /></Field>
                <Field label="Email"><input className={inputCls} type="email" value={formData.email} onChange={e => set('email', e.target.value)} /></Field>
                <Field label="Industry"><input className={inputCls} value={formData.industry} onChange={e => set('industry', e.target.value)} /></Field>
                <Field label="Status">
                  <SelectField value={formData.status} onChange={e => set('status', e.target.value)}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </SelectField>
                </Field>
              </div>
            ) : (
              <div>
                <p className="mb-4 text-sm text-muted-foreground">Tick the services this client takes and enter the annual fee for each.</p>
                <FeeList values={formData} selectedServices={formData.selectedServices} onSelectionChange={selectedServices => setFormData((p: any) => ({ ...p, selectedServices }))} onChange={(key, amount) => set(key, amount)} />
                {hasServiceChanges && (
                  <div className="mt-4 space-y-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <p className="font-semibold">Approval required from Brijesh Pitroda</p>
                    {serviceChanges.added.length > 0 && (
                      <p>Adding: {serviceChanges.added.map(field => field.label).join(', ')}. Enter each annual fee; the client appears in those sections only after approval.</p>
                    )}
                    {serviceChanges.removed.length > 0 && (
                      <p>Removing: {serviceChanges.removed.map(field => field.label).join(', ')}. The client disappears from those sections only after approval.</p>
                    )}
                  </div>
                )}
                <div className="mt-5 flex items-center justify-between rounded-xl border border-[#E7EDF4] bg-[#F9FAFB] px-4 py-3.5">
                  <span className="text-sm font-medium" style={{ color: NAVY }}>Total annual fees</span>
                  <span className="text-xl font-semibold" style={{ color: NAVY }}>{rupees(total)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 border-t border-[#E7EDF4] px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1" disabled={loading}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={loading || !!duplicates}>
              {loading ? (hasServiceChanges ? 'Sending for approval…' : adminDirectSave ? 'Updating…' : 'Submitting…')
                : hasServiceChanges ? 'Send Service Change for Approval' : adminDirectSave ? 'Update Client' : 'Submit Update for Approval'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
