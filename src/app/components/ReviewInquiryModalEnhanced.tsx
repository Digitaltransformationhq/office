import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { clientsAPI, inquiriesAPI } from '../services/api';
import { useToast } from './Toast';
import { useBackButton } from '../hooks/useBackButton';
import { X, Inbox, Pencil, PauseCircle, Check, ChevronDown, CheckCircle2, Send } from 'lucide-react';

interface ReviewInquiryModalEnhancedProps {
  inquiry: any;
  reviewerId: number;
  reviewerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const NAVY = '#1b365d';
const inputCls =
  'w-full rounded-lg border border-[#E7EDF4] bg-white px-3.5 py-2.5 text-[0.92rem] text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15';

export function ReviewInquiryModalEnhanced({ inquiry, reviewerId, reviewerName, onClose, onSuccess }: ReviewInquiryModalEnhancedProps) {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<'approve' | 'edit' | 'reject' | 'hold' | 'communicate' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const [showTaskCreation, setShowTaskCreation] = useState(false);
  const [communications, setCommunications] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingComms, setLoadingComms] = useState(false);
  const [editedInquiry, setEditedInquiry] = useState({
    clientName: inquiry.client_name || inquiry.clientName,
    companyName: inquiry.company_name || inquiry.companyName || '',
    contactPerson: inquiry.contact_person || inquiry.contactPerson || '',
    mobileNumber: inquiry.mobile_number || inquiry.mobileNumber,
    email: inquiry.email || '',
    workType: inquiry.work_type || inquiry.workType,
    notes: inquiry.notes || '',
    expectedTimeline: inquiry.expected_timeline || inquiry.expectedTimeline || '',
    sourceOfInquiry: inquiry.source_of_inquiry || inquiry.sourceOfInquiry || '',
  });
  const { showSuccess, showError } = useToast();

  // Let the phone / browser Back button close the modal instead of leaving the page.
  useBackButton(true, onClose);

  useEffect(() => { loadCommunications(); }, [inquiry.id]);

  const loadCommunications = async () => {
    try {
      setLoadingComms(true);
      const response = await inquiriesAPI.getCommunications(inquiry.id);
      if (response.success) setCommunications(response.data || []);
    } catch (error) {
      console.error('Error loading communications:', error);
    } finally {
      setLoadingComms(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) { showError('Please enter a message'); return; }
    setLoading(true);
    try {
      const response = await inquiriesAPI.addCommunication(inquiry.id, {
        message: newMessage, senderId: reviewerId.toString(), senderName: reviewerName, senderRole: 'partner',
      });
      if (response.success) {
        showSuccess('Message sent to user');
        setNewMessage('');
        loadCommunications();
      } else {
        showError(response.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showError('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAndConvert = async () => {
    setLoading(true);
    try {
      const updateResponse = await inquiriesAPI.updateStatus(inquiry.id, {
        status: 'Converted to Client', reviewedBy: reviewerName, reviewedById: reviewerId,
      });
      if (!updateResponse.success) throw new Error(updateResponse.error || 'Failed to update inquiry status');

      const clientData = {
        name: editedInquiry.clientName, firmName: editedInquiry.companyName, contact: editedInquiry.mobileNumber,
        email: editedInquiry.email, industry: editedInquiry.workType, status: 'Active',
        itrFees: 0, gstFees: 0, gstAnnualReturnFees: 0, accountingFees: 0, auditFees: 0,
        companyActFees: 0, tdsFees: 0, pfEsicPtLabourFees: 0, consultancyFees: 0, totalFees: 0,
      };
      const clientResponse = await clientsAPI.create(clientData);
      if (clientResponse.success) {
        showSuccess(`Inquiry approved! ${editedInquiry.clientName} added to client master.`);
        setShowTaskCreation(true);
      } else {
        showError(clientResponse.error || 'Failed to create client');
      }
    } catch (error: any) {
      console.error('Error approving inquiry:', error);
      showError(error.message || 'Failed to approve inquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    setLoading(true);
    try {
      const response = await inquiriesAPI.update(inquiry.id, editedInquiry);
      if (response.success) { showSuccess('Inquiry updated successfully'); setAction(null); }
      else showError(response.error || 'Failed to update inquiry');
    } catch (error: any) {
      console.error('Error updating inquiry:', error);
      showError(error.message || 'Failed to update inquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) { showError('Please provide a reason for rejection'); return; }
    setLoading(true);
    try {
      const response = await inquiriesAPI.updateStatus(inquiry.id, {
        status: 'Rejected', reviewedBy: reviewerName, reviewedById: reviewerId, rejectionReason,
      });
      if (response.success) { showSuccess(`Inquiry rejected. ${inquiry.submitted_by || inquiry.submittedBy} will be notified.`); onSuccess(); }
      else showError(response.error || 'Failed to reject inquiry');
    } catch (error: any) {
      console.error('Error rejecting inquiry:', error);
      showError(error.message || 'Failed to reject inquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleHold = async () => {
    if (!holdReason.trim()) { showError('Please provide a reason for holding this inquiry'); return; }
    setLoading(true);
    try {
      const response = await inquiriesAPI.updateStatus(inquiry.id, {
        status: 'On Hold', reviewedBy: reviewerName, reviewedById: reviewerId, rejectionReason: holdReason,
      });
      if (response.success) { showSuccess('Inquiry marked as On Hold'); onSuccess(); }
      else showError(response.error || 'Failed to hold inquiry');
    } catch (error: any) {
      console.error('Error holding inquiry:', error);
      showError(error.message || 'Failed to hold inquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const overlay = 'fixed inset-0 z-50 flex items-center justify-center bg-[#0a1728]/60 p-4 backdrop-blur-sm';
  const g = (a: string, b: string) => inquiry[a] || inquiry[b];

  // ── Success view ──────────────────────────────────────────────
  if (showTaskCreation) {
    return (
      <div className={overlay}>
        <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-[0_40px_120px_-30px_rgba(10,23,40,0.8)]">
          <div className="flex items-center gap-3 border-b border-[#E7EDF4] px-6 py-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(78,167,46,0.12)', color: '#4ea72e' }}>
              <CheckCircle2 size={20} />
            </span>
            <div>
              <h2 className="text-[1.05rem] font-semibold" style={{ color: NAVY }}>Client created</h2>
              <p className="text-xs text-muted-foreground">The inquiry has been converted</p>
            </div>
          </div>
          <div className="px-6 py-5">
            <div className="rounded-xl border border-[#E7EDF4] bg-[#F9FAFB] p-4">
              <p className="text-sm" style={{ color: NAVY }}>
                <span className="font-semibold">{editedInquiry.clientName}</span> has been added to your client master.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">You can now create tasks and manage billing for this client.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-[#E7EDF4] px-6 py-4">
            <Button size="sm" variant="secondary" onClick={() => { onSuccess(); onClose(); }}>Done</Button>
            <Button size="sm" onClick={() => { onSuccess(); onClose(); }}>Go to Clients</Button>
          </div>
        </div>
      </div>
    );
  }

  const subtitle = action === 'reject' ? 'Provide a reason for rejection'
    : action === 'hold' ? 'Provide a reason to put on hold'
    : action === 'edit' ? 'Edit the inquiry details'
    : 'Review, respond, and decide';

  return (
    <div className={overlay}>
      <div className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_40px_120px_-30px_rgba(10,23,40,0.8)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#E7EDF4] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}>
              <Inbox size={20} />
            </span>
            <div>
              <h2 className="text-[1.05rem] font-semibold" style={{ color: NAVY }}>Review Client Inquiry</h2>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={loading} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Left — details / edit / reason */}
            <div className="lg:col-span-2">
              {!action && (
                <div className="overflow-hidden rounded-xl border border-[#E7EDF4]">
                  <div className="border-b border-[#EFF3F8] bg-[#F9FAFB] px-5 py-3">
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Inquiry Information</p>
                  </div>
                  <dl className="divide-y divide-[#F1F4F8]">
                    <Row label="Client name" value={g('client_name', 'clientName') || '—'} />
                    <Row label="Company" value={g('company_name', 'companyName') || '—'} />
                    {(g('contact_person', 'contactPerson')) && <Row label="Contact" value={g('contact_person', 'contactPerson')} />}
                    <Row label="Mobile" value={g('mobile_number', 'mobileNumber') || '—'} />
                    <Row label="Email" value={inquiry.email || '—'} />
                    <Row label="Work type">
                      <span className="inline-block rounded-md px-2 py-0.5 text-[0.72rem] font-medium" style={{ backgroundColor: 'rgba(27,54,93,0.06)', color: NAVY }}>
                        {g('work_type', 'workType') || '—'}
                      </span>
                    </Row>
                    <Row label="Submitted by" value={g('submitted_by', 'submittedBy') || '—'} />
                    {(g('expected_timeline', 'expectedTimeline')) && <Row label="Timeline" value={g('expected_timeline', 'expectedTimeline')} />}
                    {(g('source_of_inquiry', 'sourceOfInquiry')) && <Row label="Source" value={g('source_of_inquiry', 'sourceOfInquiry')} />}
                    {inquiry.notes && <Row label="Notes" value={inquiry.notes} multiline />}
                    <Row label="Submitted on" value={g('created_at', 'createdAt') ? new Date(g('created_at', 'createdAt')).toLocaleString('en-IN') : 'N/A'} />
                  </dl>
                </div>
              )}

              {action === 'edit' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Client name"><input className={inputCls} value={editedInquiry.clientName} onChange={e => setEditedInquiry(p => ({ ...p, clientName: e.target.value }))} /></Field>
                    <Field label="Company name"><input className={inputCls} value={editedInquiry.companyName} onChange={e => setEditedInquiry(p => ({ ...p, companyName: e.target.value }))} /></Field>
                    <Field label="Contact person"><input className={inputCls} value={editedInquiry.contactPerson} onChange={e => setEditedInquiry(p => ({ ...p, contactPerson: e.target.value }))} /></Field>
                    <Field label="Mobile number"><input className={inputCls} value={editedInquiry.mobileNumber} onChange={e => setEditedInquiry(p => ({ ...p, mobileNumber: e.target.value }))} /></Field>
                    <Field label="Email ID"><input className={inputCls} value={editedInquiry.email} onChange={e => setEditedInquiry(p => ({ ...p, email: e.target.value }))} /></Field>
                    <Field label="Work type">
                      <div className="relative">
                        <select value={editedInquiry.workType} onChange={e => setEditedInquiry(p => ({ ...p, workType: e.target.value }))} className={`${inputCls} appearance-none pr-9`}>
                          {['GST Filing', 'Audit', 'Income Tax', 'Company Registration', 'TDS Returns', 'PF/ESIC Returns', 'Accounting Services', 'Consultancy', 'Others'].map(w => <option key={w} value={w}>{w}</option>)}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </Field>
                  </div>
                  <Field label="Notes">
                    <textarea value={editedInquiry.notes} onChange={e => setEditedInquiry(p => ({ ...p, notes: e.target.value }))} className={`${inputCls} min-h-[96px] resize-none`} />
                  </Field>
                </div>
              )}

              {action === 'reject' && (
                <Field label="Rejection reason" required>
                  <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Explain why this inquiry is being rejected…" className={`${inputCls} min-h-[110px] resize-none`} required />
                </Field>
              )}

              {action === 'hold' && (
                <Field label="Reason for hold" required>
                  <textarea value={holdReason} onChange={e => setHoldReason(e.target.value)} placeholder="Explain why this inquiry is being put on hold…" className={`${inputCls} min-h-[110px] resize-none`} required />
                </Field>
              )}
            </div>

            {/* Right — communication thread */}
            <div className="lg:col-span-1">
              <div className="flex h-full min-h-[320px] flex-col overflow-hidden rounded-xl border border-[#E7EDF4] bg-[#F9FAFB]">
                <div className="border-b border-[#E7EDF4] px-4 py-3">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Communication</p>
                </div>
                <div className="flex-1 space-y-2.5 overflow-y-auto p-3" style={{ maxHeight: '340px' }}>
                  {loadingComms ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">Loading messages…</p>
                  ) : communications.length === 0 ? (
                    <p className="py-8 text-center text-xs text-muted-foreground">No messages yet</p>
                  ) : communications.map((comm) => {
                    const isPartner = comm.sender_role === 'partner';
                    return (
                      <div key={comm.id} className={`rounded-lg border px-3 py-2 ${isPartner ? 'border-[rgba(27,54,93,0.12)] bg-[rgba(27,54,93,0.05)]' : 'border-[#E7EDF4] bg-white'}`}>
                        <div className="mb-1 flex items-center gap-1.5">
                          <p className="text-[0.72rem] font-semibold" style={{ color: NAVY }}>{comm.sender_name}</p>
                          <span className={`rounded px-1.5 py-0.5 text-[0.58rem] font-medium ${isPartner ? 'bg-[rgba(27,54,93,0.1)] text-[#1b365d]' : 'bg-slate-100 text-slate-600'}`}>
                            {isPartner ? 'Partner' : 'User'}
                          </span>
                        </div>
                        <p className="text-[0.8rem] text-foreground/85">{comm.message}</p>
                        {comm.created_at && (
                          <p className="mt-1 text-[0.62rem] text-muted-foreground">
                            {new Date(comm.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-2 border-t border-[#E7EDF4] p-3">
                  <textarea
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type a message to the user…"
                    disabled={loading}
                    className="min-h-[72px] w-full resize-none rounded-lg border border-[#E7EDF4] bg-white px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground/50 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15"
                  />
                  <Button size="sm" onClick={handleSendMessage} disabled={loading || !newMessage.trim()} className="w-full">
                    <Send size={14} /> {loading ? 'Sending…' : 'Send Message'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 border-t border-[#E7EDF4] px-6 py-4">
          {!action && (
            <>
              <Button size="sm" variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
              <Button size="sm" variant="secondary" onClick={() => setAction('edit')} disabled={loading}><Pencil size={14} /> Edit</Button>
              <Button size="sm" variant="secondary" onClick={() => setAction('hold')} disabled={loading}><PauseCircle size={14} /> Hold</Button>
              <Button size="sm" variant="danger" onClick={() => setAction('reject')} disabled={loading}><X size={14} /> Reject</Button>
              <Button size="sm" onClick={handleApproveAndConvert} disabled={loading}><Check size={14} /> {loading ? 'Converting…' : 'Approve & Convert'}</Button>
            </>
          )}
          {action === 'edit' && (
            <>
              <Button size="sm" variant="secondary" onClick={() => setAction(null)} disabled={loading}>Back</Button>
              <Button size="sm" onClick={handleEdit} disabled={loading}><Check size={14} /> {loading ? 'Saving…' : 'Save Changes'}</Button>
            </>
          )}
          {action === 'reject' && (
            <>
              <Button size="sm" variant="secondary" onClick={() => setAction(null)} disabled={loading}>Back</Button>
              <Button size="sm" variant="danger" onClick={handleReject} disabled={loading}><X size={14} /> {loading ? 'Rejecting…' : 'Confirm Rejection'}</Button>
            </>
          )}
          {action === 'hold' && (
            <>
              <Button size="sm" variant="secondary" onClick={() => setAction(null)} disabled={loading}>Back</Button>
              <Button size="sm" onClick={handleHold} disabled={loading}><PauseCircle size={14} /> {loading ? 'Processing…' : 'Confirm Hold'}</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, children, multiline }: { label: string; value?: React.ReactNode; children?: React.ReactNode; multiline?: boolean }) {
  return (
    <div className="flex items-start gap-4 px-5 py-2.5">
      <dt className="w-28 shrink-0 pt-0.5 text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
      <dd className={`flex-1 text-sm font-medium ${multiline ? 'whitespace-pre-line' : ''}`} style={{ color: NAVY }}>{children ?? value}</dd>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
        {label} {required && <span className="text-[#c0392b]">*</span>}
      </label>
      {children}
    </div>
  );
}
