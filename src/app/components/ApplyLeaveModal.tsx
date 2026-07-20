import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { useToast } from './Toast';
import { leaveAPI } from '../services/api';

interface ApplyLeaveModalProps {
  /** Real user id ('user:7') — written to a column with a foreign key. */
  userId: string;
  userName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ApplyLeaveModal({ userId, userName, onClose, onSuccess }: ApplyLeaveModalProps) {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();
  const [balance, setBalance] = useState({ casualLeave: 10, sickLeave: 7, earnedLeave: 15 });
  const [formData, setFormData] = useState({
    leaveType: 'CL',
    fromDate: '',
    toDate: '',
    isHalfDay: false,
    reason: '',
  });

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    try {
      // Was a relative /api/... path, which this app does not serve.
      const data = await leaveAPI.getBalance(userId);
      if (data.success) {
        setBalance({
          casualLeave: data.data.casualLeaveBalance || 10,
          sickLeave: data.data.sickLeaveBalance || 7,
          earnedLeave: data.data.earnedLeaveBalance || 15,
        });
      }
    } catch (error) {
      console.error('Error loading leave balance:', error);
    }
  };

  const calculateDays = () => {
    if (!formData.fromDate || !formData.toDate) return 0;
    const from = new Date(formData.fromDate);
    const to = new Date(formData.toDate);
    const diffTime = Math.abs(to.getTime() - from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return formData.isHalfDay ? 0.5 : diffDays;
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fromDate || !formData.toDate || !formData.reason) {
      showError('Please fill in all required fields');
      return;
    }

    const totalDays = calculateDays();
    if (totalDays <= 0) {
      showError('Invalid date range');
      return;
    }

    // Check balance
    let availableBalance = 0;
    if (formData.leaveType === 'CL') availableBalance = balance.casualLeave;
    else if (formData.leaveType === 'SL') availableBalance = balance.sickLeave;
    else if (formData.leaveType === 'EL') availableBalance = balance.earnedLeave;

    if (totalDays > availableBalance) {
      showError(`Insufficient balance. Available: ${availableBalance} days`);
      return;
    }

    setLoading(true);

    try {
      const result = await leaveAPI.apply({
        userId,
        userName,
        leaveType: formData.leaveType,
        fromDate: formData.fromDate,
        toDate: formData.toDate,
        isHalfDay: formData.isHalfDay,
        totalDays,
        reason: formData.reason,
      });

      if (result.success) {
        showSuccess('Leave application submitted successfully!');
        onSuccess();
        onClose();
      } else {
        showError(result.error || 'Failed to submit leave application');
      }
    } catch (error) {
      console.error('Error submitting leave:', error);
      showError('Failed to submit leave application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalDays = calculateDays();

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Apply for Leave</CardTitle>
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
          {/* Leave Balance */}
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Casual Leave</p>
              <p className="text-2xl font-bold text-primary">{balance.casualLeave}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Sick Leave</p>
              <p className="text-2xl font-bold text-primary">{balance.sickLeave}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Earned Leave</p>
              <p className="text-2xl font-bold text-primary">{balance.earnedLeave}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Leave Type */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Leave Type <span className="text-destructive">*</span>
              </label>
              <select
                value={formData.leaveType}
                onChange={(e) => handleChange('leaveType', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="CL">Casual Leave (CL)</option>
                <option value="SL">Sick Leave (SL)</option>
                <option value="EL">Earned Leave (EL)</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  From Date <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.fromDate}
                  onChange={(e) => handleChange('fromDate', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  To Date <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.toDate}
                  onChange={(e) => handleChange('toDate', e.target.value)}
                  min={formData.fromDate}
                  required
                />
              </div>
            </div>

            {/* Half Day Checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isHalfDay"
                checked={formData.isHalfDay}
                onChange={(e) => handleChange('isHalfDay', e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="isHalfDay" className="text-sm">
                Half Day Leave (applies to single day only)
              </label>
            </div>

            {/* Calculated Days */}
            {formData.fromDate && formData.toDate && (
              <div className="bg-info/10 border border-info/20 rounded-lg p-3">
                <p className="text-sm">
                  <span className="font-medium">Total Days:</span> {totalDays} day{totalDays !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Reason <span className="text-destructive">*</span>
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => handleChange('reason', e.target.value)}
                placeholder="Please provide a brief reason for your leave..."
                className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring min-h-[100px]"
                required
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Leave Application'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
