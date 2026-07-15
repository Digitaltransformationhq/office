import React, { useState } from 'react';
import { Button } from './Button';
import { clientsAPI } from '../services/api';
import { useToast } from './Toast';
import { X, Building2 } from 'lucide-react';
import { NAVY, inputCls, FEE_FIELDS, rupees, Field, SelectField, FeeInput, ModalTabs, overlayCls, panelCls } from './clientModalUI';

interface AddClientModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AddClientModal({ onClose, onSuccess }: AddClientModalProps) {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<'basic' | 'billing'>('basic');
  const [formData, setFormData] = useState<any>({
    name: '', pan: '', gstin: '', firmName: '', contact: '', email: '', industry: '', status: 'Active',
    itrFees: 0, gstFees: 0, gstAnnualReturnFees: 0, accountingFees: 0, auditFees: 0,
    companyActFees: 0, tdsFees: 0, pfEsicPtLabourFees: 0, consultancyFees: 0,
  });

  const set = (field: string, value: string | number) => setFormData((p: any) => ({ ...p, [field]: value }));
  const total = FEE_FIELDS.reduce((s, f) => s + (formData[f.key] || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) { showError('Client name is required'); setActiveTab('basic'); return; }
    setLoading(true);
    try {
      const response = await clientsAPI.create({ ...formData, totalFees: total });
      if (response.success) { showSuccess('Client created successfully!'); onSuccess(); onClose(); }
      else showError(response.error || 'Failed to create client');
    } catch (error) {
      console.error('Error creating client:', error);
      showError('Failed to create client. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={overlayCls}>
      <div className={`${panelCls} max-w-xl`}>
        <div className="flex items-start justify-between gap-4 border-b border-[#E7EDF4] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}>
              <Building2 size={20} />
            </span>
            <div>
              <h2 className="text-[1.05rem] font-semibold" style={{ color: NAVY }}>Add Client</h2>
              <p className="text-xs text-muted-foreground">Create a client record and fee schedule</p>
            </div>
          </div>
          <button onClick={onClose} disabled={loading} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <ModalTabs tabs={[{ key: 'basic', label: 'Basic Information' }, { key: 'billing', label: 'Billing & Fees' }]} active={activeTab} onChange={setActiveTab} />

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {activeTab === 'basic' ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Client name" required><input className={inputCls} value={formData.name} onChange={e => set('name', e.target.value)} placeholder="ABC Enterprises" required /></Field>
                <Field label="Firm name"><input className={inputCls} value={formData.firmName} onChange={e => set('firmName', e.target.value)} placeholder="ABC Private Limited" /></Field>
                <Field label="PAN"><input className={inputCls} value={formData.pan} onChange={e => set('pan', e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} /></Field>
                <Field label="GSTIN"><input className={inputCls} value={formData.gstin} onChange={e => set('gstin', e.target.value.toUpperCase())} placeholder="22ABCDE1234F1Z5" maxLength={15} /></Field>
                <Field label="Contact number"><input className={inputCls} type="tel" value={formData.contact} onChange={e => set('contact', e.target.value)} placeholder="+91 98765 43210" /></Field>
                <Field label="Email"><input className={inputCls} type="email" value={formData.email} onChange={e => set('email', e.target.value)} placeholder="contact@abcenterprises.com" /></Field>
                <Field label="Industry"><input className={inputCls} value={formData.industry} onChange={e => set('industry', e.target.value)} placeholder="Manufacturing, Trading, Services…" /></Field>
                <Field label="Status">
                  <SelectField value={formData.status} onChange={e => set('status', e.target.value)}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </SelectField>
                </Field>
              </div>
            ) : (
              <div>
                <p className="mb-4 text-sm text-muted-foreground">Annual fee for each service.</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {FEE_FIELDS.map(f => (
                    <FeeInput key={f.key} label={f.label} value={formData[f.key]} onChange={v => set(f.key, v)} />
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-between rounded-xl border border-[#E7EDF4] bg-[#F9FAFB] px-4 py-3.5">
                  <span className="text-sm font-medium" style={{ color: NAVY }}>Total annual fees</span>
                  <span className="text-xl font-semibold" style={{ color: NAVY }}>{rupees(total)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 border-t border-[#E7EDF4] px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1" disabled={loading}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Creating…' : 'Create Client'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
