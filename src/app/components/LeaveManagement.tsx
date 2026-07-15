import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table';
import { Badge } from './Badge';
import { ApplyLeaveModal } from './ApplyLeaveModal';
import { useToast } from './Toast';

interface LeaveManagementProps {
  userId: number;
  userName: string;
  userRole: string;
}

export function LeaveManagement({ userId, userName, userRole }: LeaveManagementProps) {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [balance, setBalance] = useState({ casualLeave: 10, sickLeave: 7, earnedLeave: 15 });
  const [loading, setLoading] = useState(true);
  const [showApplyLeave, setShowApplyLeave] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [leavesResponse, balanceResponse] = await Promise.all([
        fetch(`/api/leave/user/${userId}`),
        fetch(`/api/leave/balance/${userId}`),
      ]);

      if (leavesResponse.ok) {
        const leavesData = await leavesResponse.json();
        setLeaves(leavesData.data || []);
      }

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setBalance({
          casualLeave: balanceData.data.casualLeaveBalance || 10,
          sickLeave: balanceData.data.sickLeaveBalance || 7,
          earnedLeave: balanceData.data.earnedLeaveBalance || 15,
        });
      }
    } catch (error) {
      console.error('Error loading leave data:', error);
      showError('Failed to load leave data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <Badge variant="success">Approved</Badge>;
      case 'Rejected':
        return <Badge variant="danger">Rejected</Badge>;
      case 'Pending':
        return <Badge variant="warning">Pending</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
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
          <p className="text-muted-foreground">Loading leave data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Leave Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Casual Leave</p>
              <p className="text-4xl font-bold text-primary mb-1">{balance.casualLeave}</p>
              <p className="text-xs text-muted-foreground">days remaining</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Sick Leave</p>
              <p className="text-4xl font-bold text-primary mb-1">{balance.sickLeave}</p>
              <p className="text-xs text-muted-foreground">days remaining</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Earned Leave</p>
              <p className="text-4xl font-bold text-primary mb-1">{balance.earnedLeave}</p>
              <p className="text-xs text-muted-foreground">days remaining</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leave Applications Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>My Leave Applications</CardTitle>
            <Button size="sm" onClick={() => setShowApplyLeave(true)}>
              📝 Apply for Leave
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Leave Type</TableHead>
                <TableHead>From Date</TableHead>
                <TableHead>To Date</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applied On</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaves.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No leave applications found
                  </TableCell>
                </TableRow>
              ) : (
                leaves.map((leave) => (
                  <TableRow key={leave.id}>
                    <TableCell>
                      <Badge variant="primary">{getLeaveTypeLabel(leave.leaveType)}</Badge>
                    </TableCell>
                    <TableCell>{new Date(leave.fromDate).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell>{new Date(leave.toDate).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell>
                      {leave.totalDays} {leave.isHalfDay && '(Half Day)'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{leave.reason}</TableCell>
                    <TableCell>{getStatusBadge(leave.status)}</TableCell>
                    <TableCell>
                      {new Date(leave.createdAt).toLocaleDateString('en-IN')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Apply Leave Modal */}
      {showApplyLeave && (
        <ApplyLeaveModal
          userId={userId}
          userName={userName}
          onClose={() => setShowApplyLeave(false)}
          onSuccess={() => {
            loadData();
            setShowApplyLeave(false);
          }}
        />
      )}
    </div>
  );
}
