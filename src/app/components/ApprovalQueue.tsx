import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table';
import { Badge } from './Badge';
import { ReviewLeaveModal } from './ReviewLeaveModal';
import { useToast } from './Toast';
import { leaveAPI } from '../services/api';
import { useLiveData } from '../hooks/useLiveData';

interface ApprovalQueueProps {
  /** Real user id ('user:7'), not a numeric extraction: it is written to
   *  leave_applications.approved_by_id, which carries a foreign key. */
  userId: string;
  userName: string;
  userRole: string;
}

export function ApprovalQueue({ userId, userName, userRole }: ApprovalQueueProps) {
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const { showError } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useLiveData(['users'], () => loadData());

  const loadData = async () => {
    try {
      setLoading(true);
      // Was fetch('/api/leave/pending') — a path on the site's own domain that
      // serves nothing, so this queue never loaded a single row.
      const response = await leaveAPI.getPending();
      setPendingLeaves(response.data || []);
    } catch (error) {
      console.error('Error loading pending leaves:', error);
      showError('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (leave: any) => {
    setSelectedLeave(leave);
    setShowReviewModal(true);
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-muted-foreground">Loading approval queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Pending Approvals</p>
              <p className="text-4xl font-bold text-warning">{pendingLeaves.length}</p>
            </div>
            <div className="text-6xl">📋</div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Leaves Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Applications - Pending Approval</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Leave Type</TableHead>
                <TableHead>From Date</TableHead>
                <TableHead>To Date</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Applied On</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingLeaves.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No pending approvals. All caught up.
                  </TableCell>
                </TableRow>
              ) : (
                pendingLeaves.map((leave) => (
                  <TableRow key={leave.id}>
                    <TableCell className="font-medium">{leave.userName}</TableCell>
                    <TableCell>
                      <Badge variant="primary">{getLeaveTypeLabel(leave.leaveType)}</Badge>
                    </TableCell>
                    <TableCell>{new Date(leave.fromDate).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell>{new Date(leave.toDate).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell>
                      {leave.totalDays} {leave.isHalfDay && '(Half)'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{leave.reason}</TableCell>
                    <TableCell>
                      {new Date(leave.createdAt).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleReview(leave)}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Review Modal */}
      {showReviewModal && selectedLeave && (
        <ReviewLeaveModal
          leave={selectedLeave}
          approverId={userId}
          approverName={userName}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedLeave(null);
          }}
          onSuccess={() => {
            loadData();
            setShowReviewModal(false);
            setSelectedLeave(null);
          }}
        />
      )}
    </div>
  );
}
