import React, { useState } from 'react';
import { useToast } from './Toast';
import { inquiriesAPI } from '../services/api';
import { X, Inbox, ChevronDown, Info } from 'lucide-react';

interface CreateInquiryModalProps {
  currentUserId: number;
  currentUserName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const NAVY = '#1b365d';
const inputCls =
  'w-full rounded-lg border border-[#E7EDF4] bg-white px-3.5 py-2.5 text-[0.92rem] text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15';

export function CreateInquiryModal({ currentUserId, currentUserName, onClose, onSuccess }: CreateInquiryModalProps) {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    clientName: '', companyName: '', contactPerson: '', mobileNumber: '', email: '',
    workType: 'GST Filing', notes: '', expectedTimeline: '', sourceOfInquiry: '',
  });

  const workTypes = ['GST Filing', 'Audit', 'Income Tax', 'Company Registration', 'TDS Returns', 'PF/ESIC Returns', 'Accounting Services', 'Consultancy', 'Others'];
  const set = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName || !formData.mobileNumber) { showError('Please fill in all required fields'); return; }
    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) { showError('Please enter a valid email address'); return; }
    }
    const mobileRegex = /^[6-9]\d{9}$/;
    const cleanMobile = formData.mobileNumber.replace(/\D/g, '').slice(-10);
    if (!mobileRegex.test(cleanMobile)) { showError('Please enter a valid 10-digit mobile number'); return; }

    setLoading(true);
    try {
      const response = await inquiriesAPI.create({
        clientName: formData.clientName, companyName: formData.companyName, contactPerson: formData.contactPerson,
        mobileNumber: cleanMobile, email: formData.email, workType: formData.workType, notes: formData.notes,
        expectedTimeline: formData.expectedTimeline, sourceOfInquiry: formData.sourceOfInquiry,
        status: 'Pending Review', submittedBy: currentUserName, submittedById: currentUserId,
      });
      if (response.success) { showSuccess('Inquiry submitted to Partner for review!'); onSuccess(); onClose(); }
      else showError(response.error || 'Failed to submit inquiry');
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      showError('Failed to submit inquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1728]/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-[0_40px_120px_-30px_rgba(10,23,40,0.8)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#E7EDF4] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}>
              <Inbox size={20} />
            </span>
            <div>
              <h2 className="text-[1.05rem] font-semibold" style={{ color: NAVY }}>New Client Inquiry</h2>
              <p className="text-xs text-muted-foreground">Submit a prospective client for review</p>
            </div>
          </div>
          <button onClick={onClose} disabled={loading} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <Field label="Client name" required>
              <input className={inputCls} value={formData.clientName} onChange={e => set('clientName', e.target.value)} placeholder="e.g., Rajesh Kumar" required />
            </Field>

            <Field label="Company name">
              <input className={inputCls} value={formData.companyName} onChange={e => set('companyName', e.target.value)} placeholder="e.g., ABC Enterprises" />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Mobile" required>
                <input className={inputCls} type="tel" value={formData.mobileNumber} onChange={e => set('mobileNumber', e.target.value)} placeholder="9876543210" maxLength={10} required />
              </Field>
              <Field label="Email">
                <input className={inputCls} type="email" value={formData.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
              </Field>
            </div>

            <Field label="Type of work" required>
              <div className="relative">
                <select value={formData.workType} onChange={e => set('workType', e.target.value)} className={`${inputCls} appearance-none pr-9`} required>
                  {workTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </Field>

            <Field label="Notes" hint="Optional">
              <textarea className={`${inputCls} min-h-[88px] resize-none`} value={formData.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional details…" />
            </Field>

            <div className="flex items-center gap-2.5 rounded-xl border border-[#E7EDF4] bg-[#F9FAFB] px-3.5 py-3">
              <Info size={16} className="shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">This inquiry will be sent to a Partner for review.</p>
            </div>
          </div>

          <div className="flex gap-3 border-t border-[#E7EDF4] px-6 py-4">
            <button type="button" onClick={onClose} disabled={loading} className="flex-1 rounded-full border border-[#E7EDF4] bg-white px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[#F4F6F9] disabled:opacity-60" style={{ color: NAVY }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 rounded-full bg-[#1b365d] px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_20px_-10px_rgba(27,54,93,0.6)] transition-all hover:bg-[#142a4a] disabled:opacity-60">
              {loading ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
        {label} {required && <span className="text-[#c0392b]">*</span>}
        {hint && <span className="ml-1 font-normal text-muted-foreground">· {hint}</span>}
      </label>
      {children}
    </div>
  );
}
