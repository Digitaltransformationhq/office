import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { useToast } from './Toast';
import { inquiriesAPI } from '../services/api';

interface CreateInquiryModalProps {
  currentUserId: number;
  currentUserName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateInquiryModal({
  currentUserId,
  currentUserName,
  onClose,
  onSuccess
}: CreateInquiryModalProps) {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    clientName: '',
    companyName: '',
    contactPerson: '',
    mobileNumber: '',
    email: '',
    workType: 'GST Filing',
    notes: '',
    expectedTimeline: '',
    sourceOfInquiry: '',
  });

  const workTypes = [
    'GST Filing',
    'Audit',
    'Income Tax',
    'Company Registration',
    'TDS Returns',
    'PF/ESIC Returns',
    'Accounting Services',
    'Consultancy',
    'Others',
  ];

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientName || !formData.mobileNumber) {
      showError('Please fill in all required fields');
      return;
    }

    // Email validation
    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        showError('Please enter a valid email address');
        return;
      }
    }

    // Mobile validation (Indian format)
    const mobileRegex = /^[6-9]\d{9}$/;
    const cleanMobile = formData.mobileNumber.replace(/\D/g, '').slice(-10);
    if (!mobileRegex.test(cleanMobile)) {
      showError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);

    try {
      const response = await inquiriesAPI.create({
        clientName: formData.clientName,
        companyName: formData.companyName,
        contactPerson: formData.contactPerson,
        mobileNumber: cleanMobile,
        email: formData.email,
        workType: formData.workType,
        notes: formData.notes,
        expectedTimeline: formData.expectedTimeline,
        sourceOfInquiry: formData.sourceOfInquiry,
        status: 'Pending Review',
        submittedBy: currentUserName,
        submittedById: currentUserId,
      });

      if (response.success) {
        showSuccess('Inquiry submitted to Partner for review!');
        onSuccess();
        onClose();
      } else {
        showError(response.error || 'Failed to submit inquiry');
      }
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      showError('Failed to submit inquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-2">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">New Client Inquiry</CardTitle>
            <Button
              size="sm"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
              className="h-6 w-6 p-0"
            >
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <form onSubmit={handleSubmit} className="space-y-2.5">
            {/* Client Name */}
            <div>
              <label className="block text-xs font-medium mb-1">
                Client Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => handleChange('clientName', e.target.value)}
                placeholder="e.g., Rajesh Kumar"
                className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring"
                required
              />
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-xs font-medium mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                placeholder="e.g., ABC Enterprises"
                className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Mobile and Email */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Mobile <span className="text-destructive">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.mobileNumber}
                  onChange={(e) => handleChange('mobileNumber', e.target.value)}
                  placeholder="9876543210"
                  maxLength={10}
                  className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            {/* Type of Work Required */}
            <div>
              <label className="block text-xs font-medium mb-1">
                Type of Work <span className="text-destructive">*</span>
              </label>
              <select
                value={formData.workType}
                onChange={(e) => handleChange('workType', e.target.value)}
                className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring"
                required
              >
                {workTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes / Description */}
            <div>
              <label className="block text-xs font-medium mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional details..."
                className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring min-h-[60px] resize-none"
              />
            </div>

            {/* Info Box */}
            <div className="bg-info/10 border border-info/20 rounded p-2">
              <p className="text-xs">
                <span className="font-medium">ℹ️</span> Will be sent to Partner for review
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={loading}
                className="text-xs h-8 px-3"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="text-xs h-8 px-3"
              >
                {loading ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}