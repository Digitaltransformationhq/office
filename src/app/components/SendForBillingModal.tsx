import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Input } from './Input';
import { Button } from './Button';
import { tasksAPI } from '../services/api';

interface Task {
  id: string;
  client: string;
  task: string;
  category: string;
  assignedTo: string;
  comments?: string;
}

interface SendForBillingModalProps {
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
}

export function SendForBillingModal({ task, onClose, onSuccess }: SendForBillingModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    billingFees: '',
    taxableAmount: '',
    billingDescription: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const fees = parseFloat(formData.billingFees);
      const taxable = formData.taxableAmount ? parseFloat(formData.taxableAmount) : 0;

      if (isNaN(fees) || fees <= 0) {
        alert('Please enter valid billing fees greater than 0');
        setLoading(false);
        return;
      }

      if (formData.taxableAmount && (isNaN(taxable) || taxable < 0)) {
        alert('Please enter valid taxable amount');
        setLoading(false);
        return;
      }

      const response = await tasksAPI.update(task.id, {
        status: 'Pending for Billing',
        billingFees: fees,
        taxableAmount: taxable,
        billingDescription: formData.billingDescription.trim(),
      });

      if (response.success) {
        alert(`✅ Task sent for billing!\n\n• Fees: ₹${fees.toLocaleString('en-IN')}\n• Taxable Amount: ₹${taxable.toLocaleString('en-IN')}\n• Accounts team has been notified`);
        onSuccess();
        onClose();
      } else {
        alert(`Failed: ${response.error}`);
      }
    } catch (error) {
      console.error('Error sending task for billing:', error);
      alert('Failed to send task for billing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Send Task for Billing</CardTitle>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Task Details */}
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <h3 className="font-medium mb-2">Task Details</h3>
            <div className="grid gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Client:</span>{' '}
                <span className="font-medium">{task.client}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Task:</span>{' '}
                <span className="font-medium">{task.task}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Category:</span>{' '}
                <span className="font-medium">{task.category}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Assigned To:</span>{' '}
                <span className="font-medium">{task.assignedTo}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Billing Fees (₹)"
              type="number"
              step="0.01"
              min="0"
              value={formData.billingFees}
              onChange={(e) => setFormData({ ...formData, billingFees: e.target.value })}
              placeholder="Enter billing amount"
              required
            />

            <Input
              label="Taxable Amount (₹)"
              type="number"
              step="0.01"
              min="0"
              value={formData.taxableAmount}
              onChange={(e) => setFormData({ ...formData, taxableAmount: e.target.value })}
              placeholder="Enter taxable amount (optional)"
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-foreground">
                Billing Description/Notes for Invoice
              </label>
              <textarea
                value={formData.billingDescription}
                onChange={(e) => setFormData({ ...formData, billingDescription: e.target.value })}
                placeholder="Add description or notes for invoice..."
                className="px-3 py-2 bg-input-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring min-h-[120px]"
                required
              />
              <p className="text-xs text-muted-foreground">
                This description will be included in the invoice for this task
              </p>
            </div>

            <div className="bg-info/10 border border-info/20 rounded-lg p-3">
              <p className="text-sm">
                <span className="font-medium">ℹ️ Note:</span> Once submitted, this task will be marked as "Pending for Billing" and sent to the Accounts team for invoice generation.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Sending...' : 'Send for Billing'}
              </Button>
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
