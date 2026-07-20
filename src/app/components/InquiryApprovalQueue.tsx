import React, { useState, useEffect } from 'react';
import { ReviewInquiryModal } from './ReviewInquiryModal';
import { useToast } from './Toast';
import { inquiriesAPI } from '../services/api';
import { Mail, Phone, CheckCircle2 } from 'lucide-react';

interface InquiryApprovalQueueProps {
  userId: number;
  userName: string;
  onDataChange?: () => void;
}

const NAVY = '#1b365d';

export function InquiryApprovalQueue({ userId, userName, onDataChange }: InquiryApprovalQueueProps) {
  const [pendingInquiries, setPendingInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const { showError } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await inquiriesAPI.getPending();
      if (response.success) {
        setPendingInquiries(response.data || []);
      } else {
        showError(response.error || 'Failed to load pending inquiries');
      }
    } catch (error) {
      console.error('Error loading pending inquiries:', error);
      showError('Failed to load pending inquiries');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (inquiry: any) => {
    setSelectedInquiry(inquiry);
    setShowReviewModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" />
      </div>
    );
  }

  if (pendingInquiries.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(78,167,46,0.12)', color: '#4ea72e' }}>
          <CheckCircle2 size={24} />
        </span>
        <p className="text-sm font-medium" style={{ color: NAVY }}>All caught up</p>
        <p className="mt-1 text-xs text-muted-foreground">No client inquiries are awaiting your approval.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {pendingInquiries.length} inquir{pendingInquiries.length > 1 ? 'ies' : 'y'} awaiting your approval
      </p>

      {pendingInquiries.map((inquiry) => (
        <div key={inquiry.id} className="rounded-xl border border-[#E7EDF4] p-4 transition-all hover:border-[#d5dfea] hover:shadow-[0_10px_30px_-20px_rgba(10,23,40,0.5)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold" style={{ color: NAVY }}>
                  {inquiry.clientName || inquiry.companyName || 'Client inquiry'}
                </p>
                {inquiry.workType && (
                  <span className="rounded-md px-2 py-0.5 text-[0.7rem] font-medium" style={{ backgroundColor: 'rgba(27,54,93,0.06)', color: NAVY, border: '1px solid rgba(27,54,93,0.18)' }}>
                    {inquiry.workType}
                  </span>
                )}
              </div>
              {inquiry.companyName && inquiry.clientName && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{inquiry.companyName}</p>
              )}

              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {inquiry.mobileNumber && (
                  <span className="inline-flex items-center gap-1.5"><Phone size={12} />{inquiry.mobileNumber}</span>
                )}
                {inquiry.email && (
                  <span className="inline-flex items-center gap-1.5 truncate"><Mail size={12} />{inquiry.email}</span>
                )}
              </div>
            </div>

            <button
              onClick={() => handleReview(inquiry)}
              className="shrink-0 rounded-full bg-[#1b365d] px-4 py-1.5 text-xs font-medium text-white shadow-[0_8px_20px_-10px_rgba(27,54,93,0.6)] transition-all hover:bg-[#142a4a] hover:shadow-[0_12px_26px_-10px_rgba(27,54,93,0.7)]"
            >
              Review
            </button>
          </div>

          {(inquiry.submittedBy || inquiry.createdAt) && (
            <p className="mt-2.5 border-t border-[#F1F4F8] pt-2 text-[11px] text-muted-foreground">
              Submitted by {inquiry.submittedBy || 'Unknown'}
              {inquiry.createdAt ? ` · ${new Date(inquiry.createdAt).toLocaleDateString('en-IN')}` : ''}
            </p>
          )}
        </div>
      ))}

      {showReviewModal && selectedInquiry && (
        <ReviewInquiryModal
          inquiry={selectedInquiry}
          reviewerId={userId}
          reviewerName={userName}
          onClose={() => { setShowReviewModal(false); setSelectedInquiry(null); }}
          onSuccess={() => {
            loadData();
            setShowReviewModal(false);
            setSelectedInquiry(null);
            if (onDataChange) onDataChange();
          }}
        />
      )}
    </div>
  );
}
