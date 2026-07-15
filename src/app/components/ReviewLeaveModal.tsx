import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { useToast } from './Toast';

interface ReviewLeaveModalProps {
  leave: any;
  approverId: number;
  approverName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReviewLeaveModal({
  leave,
  approverId,
  approverName,
  onClose,
  onSuccess
}: ReviewLeaveModalProps) {
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [comments, setComments] = useState('');
  const { showSuccess, showError } = useToast();

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case 'CL':
        return 'Casual Leave';
      case 'SL':
        return 'Sick Leave';
      case 'EL':
        return 'Earned Leave';
      default:
        return type;
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/leave/${leave.id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approverId,
          comments,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showSuccess(`Leave approved for ${leave.userName}`);
        onSuccess();
      } else {
        showError(result.error || 'Failed to approve leave');
      }
    } catch (error) {
      console.error('Error approving leave:', error);
      showError('Failed to approve leave. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      showError('Please provide a reason for rejection');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/leave/${leave.id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approverId,
          rejectionReason,
          comments,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showSuccess(`Leave rejected for ${leave.userName}`);
        onSuccess();
      } else {
        showError(result.error || 'Failed to reject leave');
      }
    } catch (error) {
      console.error('Error rejecting leave:', error);
      showError('Failed to reject leave. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Review Leave Application</CardTitle>
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
        <CardContent className="space-y-6">
          {/* Employee Details */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Employee</p>
                <p className="font-medium">{leave.userName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Leave Type</p>
                <Badge variant="primary">{getLeaveTypeLabel(leave.leaveType)}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">From Date</p>
                <p className="font-medium">{new Date(leave.fromDate).toLocaleDateString('en-IN')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">To Date</p>
                <p className="font-medium">{new Date(leave.toDate).toLocaleDateString('en-IN')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Days</p>
                <p className="font-medium">
                  {leave.totalDays} {leave.isHalfDay && '(Half Day)'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Reason</p>
              <p className="text-sm">{leave.reason}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Applied On</p>
              <p className="text-sm">{new Date(leave.createdAt).toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Comments (Optional)
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add any comments or notes..."
              className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
            />
          </div>

          {/* Rejection Reason (shown when rejecting) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Rejection Reason (Required if rejecting)
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Provide a clear reason for rejection..."
              className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
            />
          </div>

          {/* Action Buttons */}
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
              variant="danger"
              onClick={handleReject}
              disabled={loading}
            >
              {loading ? 'Rejecting...' : 'Reject'}
            </Button>
            <Button
              variant="default"
              onClick={handleApprove}
              disabled={loading}
            >
              {loading ? 'Approving...' : 'Approve'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
