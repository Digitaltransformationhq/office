import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { billingAPI } from '../services/api';
import { useToast } from './Toast';
import { formatINR, type BillingRecord } from '../utils/revenue';

interface MarkAsPaidModalProps {
  record: BillingRecord;
  user: { id: string; name: string };
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Records payment against an invoice — the step that turns a pending payment
 * into recognised revenue.
 */
export function MarkAsPaidModal({ record, user, onClose, onSuccess }: MarkAsPaidModalProps) {
  const invoiced = Number(record.taxableAmount) || 0;
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  // Defaults to the invoiced amount; edit only when the client paid something else.
  const [paidAmount, setPaidAmount] = useState(String(invoiced));
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  const paidNum = parseFloat(paidAmount);
  const shortfall = !isNaN(paidNum) ? invoiced - paidNum : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!paymentDate) {
      showError('Payment date is required');
      return;
    }
    if (isNaN(paidNum) || paidNum <= 0) {
      showError('Please enter a valid payment amount');
      return;
    }

    try {
      setLoading(true);
      const response = await billingAPI.markPaid(record.id, {
        paymentDate,
        paidAmount: paidNum,
        paidBy: user.name,
        paidById: user.id,
      });

      if (!response.success) {
        throw new Error(response.error || response.message || 'Failed to record payment');
      }

      showSuccess('Payment recorded — this is now counted as revenue');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error recording payment:', error);
      showError(error.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Record Payment</CardTitle>
            <Button size="sm" variant="secondary" onClick={onClose} disabled={loading}>✕</Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted p-4">
              <div>
                <div className="text-xs text-muted-foreground">Client</div>
                <div className="font-medium">{record.clientName}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Bill Number</div>
                <div className="font-medium">{record.billNumber}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Bill Date</div>
                <div className="font-medium">
                  {record.billDate
                    ? new Date(record.billDate).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Invoiced Amount</div>
                <div className="font-medium">{formatINR(invoiced)}</div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                disabled={loading}
                className="w-full"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Revenue is counted in the month the payment is received.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Amount Received <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                required
                disabled={loading}
                className="w-full"
              />
              {shortfall > 0 ? (
                <p className="mt-1 text-xs text-[#B45309]">
                  {formatINR(shortfall)} less than invoiced — the invoice will still be closed as paid.
                </p>
              ) : shortfall < 0 ? (
                <p className="mt-1 text-xs text-[#B45309]">
                  {formatINR(-shortfall)} more than invoiced.
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">Prefilled with the invoiced amount.</p>
              )}
            </div>

            <div className="flex items-center gap-3 border-t pt-4">
              <Button type="button" variant="secondary" onClick={onClose} disabled={loading} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !paidAmount.trim()} className="flex-1">
                {loading ? 'Recording…' : 'Record Payment'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
