import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { billingAPI } from '../services/api';
import { useToast } from './Toast';
import { DatabaseSetupModal } from './DatabaseSetupModal';

interface MarkAsBilledModalProps {
  task: {
    id: string;
    client: string;
    task: string;
    assignedTo: string;
    completionDate: string;
  };
  user: {
    id: string;
    name: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function MarkAsBilledModal({ task, user, onClose, onSuccess }: MarkAsBilledModalProps) {
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [taxableAmount, setTaxableAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDatabaseSetupModal, setShowDatabaseSetupModal] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!billNumber.trim()) {
      showError('Bill Number is required');
      return;
    }

    if (!taxableAmount.trim()) {
      showError('Taxable Amount is required');
      return;
    }

    const taxableAmountNum = parseFloat(taxableAmount);
    if (isNaN(taxableAmountNum) || taxableAmountNum < 0) {
      showError('Please enter a valid taxable amount');
      return;
    }

    try {
      setLoading(true);

      const response = await billingAPI.create({
        taskId: task.id,
        billNumber: billNumber.trim(),
        billDate,
        taxableAmount: taxableAmountNum,
        remarks: remarks.trim(),
        billedBy: user.name,
        billedById: user.id,
      });

      if (!response.success) {
        // Show detailed error message
        const errorMsg = response.message || response.error || 'Failed to mark task as billed';
        const errorDetails = response.details || '';
        const errorCode = response.code || '';
        const errorHint = response.hint || '';
        
        let fullErrorMsg = errorMsg;
        
        // Check if it's a constraint violation
        if (errorCode === '23514' || errorMsg.includes('constraint') || errorMsg.includes('status')) {
          fullErrorMsg = '⚠️ Database Error: The task status constraint needs to be updated.\n\n' +
            '📋 Please run the SQL migration in Supabase:\n' +
            '1. Go to Supabase Dashboard → SQL Editor\n' +
            '2. Copy the SQL from /fix-task-status-constraint.sql\n' +
            '3. Run the query\n\n' +
            'See DATABASE_SETUP_INSTRUCTIONS.md for details.';
          setShowDatabaseSetupModal(true);
        } else if (errorDetails) {
          fullErrorMsg = `${errorMsg}\n\nDetails: ${errorDetails}`;
        }
        
        if (errorHint) {
          fullErrorMsg += `\n\nHint: ${errorHint}`;
        }
        
        throw new Error(fullErrorMsg);
      }

      showSuccess('Task marked as billed successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error marking task as billed:', error);
      
      // Show a user-friendly error message with line breaks preserved
      const errorLines = error.message.split('\n');
      errorLines.forEach((line: string, index: number) => {
        if (index === 0) {
          showError(line);
        } else {
          console.error(line);
        }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Mark Task as Billed</CardTitle>
            <Button
              size="sm"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Task Details */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Client Name</div>
                  <div className="font-medium">{task.client}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Task Name</div>
                  <div className="font-medium">{task.task}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Assigned To</div>
                  <div className="font-medium">{task.assignedTo}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Completion Date</div>
                  <div className="font-medium">
                    {task.completionDate 
                      ? new Date(task.completionDate).toLocaleDateString('en-IN') 
                      : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Bill Number - Required */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Bill Number / Invoice Number <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                placeholder="Enter bill/invoice number"
                required
                disabled={loading}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This is a required field
              </p>
            </div>

            {/* Bill Date - Optional */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Bill Date
              </label>
              <Input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                disabled={loading}
                className="w-full"
              />
            </div>

            {/* Taxable Amount - Required */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Taxable Amount <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={taxableAmount}
                onChange={(e) => setTaxableAmount(e.target.value)}
                placeholder="Enter taxable amount"
                required
                disabled={loading}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This is a required field
              </p>
            </div>

            {/* Remarks - Optional */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Remarks
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add any additional notes or remarks (optional)"
                disabled={loading}
                rows={3}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !billNumber.trim() || !taxableAmount.trim()}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⏳</span>
                    Processing...
                  </>
                ) : (
                  <>
                    ✅ Mark as Billed
                  </>
                )}
              </Button>
            </div>

            {/* Warning Message */}
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <span className="text-lg">⚠️</span>
                <div className="text-sm">
                  <p className="font-medium text-warning mb-1">Important</p>
                  <p className="text-muted-foreground">
                    Once marked as billed, the task status will be updated to "Billed" and a billing record will be created. This action will be logged for audit purposes.
                  </p>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      {showDatabaseSetupModal && (
        <DatabaseSetupModal
          onClose={() => setShowDatabaseSetupModal(false)}
        />
      )}
    </div>
  );
}