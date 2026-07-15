import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table';
import { Badge } from './Badge';
import { LogTimeModal } from './LogTimeModal';
import { useToast } from './Toast';

interface TimeLogProps {
  userId: number;
  userName: string;
}

export function TimeLog({ userId, userName }: TimeLogProps) {
  const [timeLogs, setTimeLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogTime, setShowLogTime] = useState(false);
  const { showError } = useToast();

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/timelog/user/${userId}`);

      if (response.ok) {
        const data = await response.json();
        setTimeLogs(data.data || []);
      }
    } catch (error) {
      console.error('Error loading time logs:', error);
      showError('Failed to load time logs');
    } finally {
      setLoading(false);
    }
  };

  const getTotalHours = () => {
    return timeLogs.reduce((sum, log) => sum + (log.hours || 0), 0).toFixed(1);
  };

  const getThisWeekHours = () => {
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    weekStart.setHours(0, 0, 0, 0);

    return timeLogs
      .filter(log => new Date(log.logDate) >= weekStart)
      .reduce((sum, log) => sum + (log.hours || 0), 0)
      .toFixed(1);
  };

  const getTodayHours = () => {
    const today = new Date().toISOString().split('T')[0];
    return timeLogs
      .filter(log => log.logDate.startsWith(today))
      .reduce((sum, log) => sum + (log.hours || 0), 0)
      .toFixed(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-muted-foreground">Loading time logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Today</p>
              <p className="text-4xl font-bold text-primary mb-1">{getTodayHours()}</p>
              <p className="text-xs text-muted-foreground">hours logged</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">This Week</p>
              <p className="text-4xl font-bold text-primary mb-1">{getThisWeekHours()}</p>
              <p className="text-xs text-muted-foreground">hours logged</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">All Time</p>
              <p className="text-4xl font-bold text-primary mb-1">{getTotalHours()}</p>
              <p className="text-xs text-muted-foreground">hours logged</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Time Log History</CardTitle>
            <Button size="sm" onClick={() => setShowLogTime(true)}>
              ⏱️ Log Time
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No time logs found. Start logging your work hours!
                  </TableCell>
                </TableRow>
              ) : (
                timeLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {new Date(log.logDate).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell>{log.taskName}</TableCell>
                    <TableCell>{log.clientName || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="primary">{log.hours} hrs</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {log.description || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Log Time Modal */}
      {showLogTime && (
        <LogTimeModal
          userId={userId}
          userName={userName}
          onClose={() => setShowLogTime(false)}
          onSuccess={() => {
            loadData();
            setShowLogTime(false);
          }}
        />
      )}
    </div>
  );
}
