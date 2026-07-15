import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table';
import { Badge } from './Badge';
import { MarkAttendanceModal } from './MarkAttendanceModal';
import { useToast } from './Toast';

interface AttendanceProps {
  userId: number;
  userName: string;
}

export function Attendance({ userId, userName }: AttendanceProps) {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMarkAttendance, setShowMarkAttendance] = useState(false);
  const { showError } = useToast();

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/attendance/user/${userId}`);

      if (response.ok) {
        const data = await response.json();
        setAttendance(data.data || []);
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
      showError('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Present':
        return <Badge variant="success">Present</Badge>;
      case 'Absent':
        return <Badge variant="danger">Absent</Badge>;
      case 'Half Day':
        return <Badge variant="warning">Half Day</Badge>;
      case 'Leave':
        return <Badge variant="default">Leave</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getThisMonthStats = () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthRecords = attendance.filter(
      record => new Date(record.attendanceDate) >= monthStart
    );

    const present = monthRecords.filter(r => r.status === 'Present').length;
    const halfDay = monthRecords.filter(r => r.status === 'Half Day').length;
    const absent = monthRecords.filter(r => r.status === 'Absent').length;
    const leave = monthRecords.filter(r => r.status === 'Leave').length;

    return { present, halfDay, absent, leave };
  };

  const getTotalHours = () => {
    return attendance
      .reduce((sum, record) => sum + (record.totalHours || 0), 0)
      .toFixed(1);
  };

  const stats = getThisMonthStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-muted-foreground">Loading attendance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Present</p>
              <p className="text-4xl font-bold text-success mb-1">{stats.present}</p>
              <p className="text-xs text-muted-foreground">this month</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Half Day</p>
              <p className="text-4xl font-bold text-warning mb-1">{stats.halfDay}</p>
              <p className="text-xs text-muted-foreground">this month</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Absent</p>
              <p className="text-4xl font-bold text-destructive mb-1">{stats.absent}</p>
              <p className="text-xs text-muted-foreground">this month</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Total Hours</p>
              <p className="text-4xl font-bold text-primary mb-1">{getTotalHours()}</p>
              <p className="text-xs text-muted-foreground">all time</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Attendance History</CardTitle>
            <Button size="sm" onClick={() => setShowMarkAttendance(true)}>
              ✅ Mark Attendance
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check-In</TableHead>
                <TableHead>Check-Out</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No attendance records found. Mark your attendance to get started!
                  </TableCell>
                </TableRow>
              ) : (
                attendance.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {new Date(record.attendanceDate).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell>{record.checkInTime || '-'}</TableCell>
                    <TableCell>{record.checkOutTime || '-'}</TableCell>
                    <TableCell>
                      {record.totalHours ? `${record.totalHours} hrs` : '-'}
                    </TableCell>
                    <TableCell>{record.location || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mark Attendance Modal */}
      {showMarkAttendance && (
        <MarkAttendanceModal
          userId={userId}
          userName={userName}
          onClose={() => setShowMarkAttendance(false)}
          onSuccess={() => {
            loadData();
            setShowMarkAttendance(false);
          }}
        />
      )}
    </div>
  );
}
