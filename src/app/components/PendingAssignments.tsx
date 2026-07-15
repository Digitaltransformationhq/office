import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table';
import { Badge } from './Badge';
import { Button } from './Button';
import { assignmentsAPI } from '../services/api';

interface PendingAssignmentsProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function PendingAssignments({ user }: PendingAssignmentsProps) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');

  useEffect(() => {
    loadAssignments();
  }, [user.id]);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const response = await assignmentsAPI.getMyAssignments(user.id);
      setAssignments(response.data || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (assignmentId: string, taskName: string) => {
    if (!confirm(`Accept assignment: "${taskName}"?`)) return;

    try {
      const response = await assignmentsAPI.updateStatus(assignmentId, 'Accepted');
      if (response.success) {
        alert('✅ Assignment accepted! Partners have been notified.');
        loadAssignments();
      } else {
        alert(`Failed: ${response.error}`);
      }
    } catch (error) {
      console.error('Error accepting assignment:', error);
      alert('Failed to accept assignment');
    }
  };

  const handleReject = async (assignmentId: string, taskName: string) => {
    const reason = prompt(`Reject assignment: "${taskName}"\n\nPlease provide a reason (optional):`);
    if (reason === null) return; // User cancelled

    try {
      const response = await assignmentsAPI.updateStatus(assignmentId, 'Rejected', reason);
      if (response.success) {
        alert('Assignment rejected. Partners have been notified.');
        loadAssignments();
      } else {
        alert(`Failed: ${response.error}`);
      }
    } catch (error) {
      console.error('Error rejecting assignment:', error);
      alert('Failed to reject assignment');
    }
  };

  const handleComplete = async (assignmentId: string, taskName: string) => {
    if (!confirm(`Mark "${taskName}" as completed?`)) return;

    try {
      const response = await assignmentsAPI.updateStatus(assignmentId, 'Completed');
      if (response.success) {
        alert('✅ Assignment marked as completed! Partners have been notified.');
        loadAssignments();
      } else {
        alert(`Failed: ${response.error}`);
      }
    } catch (error) {
      console.error('Error completing assignment:', error);
      alert('Failed to complete assignment');
    }
  };

  const filteredAssignments = assignments.filter(a => {
    if (filter === 'all') return true;
    return a.status.toLowerCase() === filter;
  });

  const pendingCount = assignments.filter(a => a.status === 'Pending').length;
  const acceptedCount = assignments.filter(a => a.status === 'Accepted').length;
  const rejectedCount = assignments.filter(a => a.status === 'Rejected').length;

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'danger';
      case 'High': return 'warning';
      case 'Medium': return 'info';
      default: return 'default';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Pending': return 'warning';
      case 'Accepted': return 'success';
      case 'Rejected': return 'danger';
      case 'Completed': return 'success';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-muted-foreground">Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-foreground mb-2">My Task Assignments</h1>
          <p className="text-muted-foreground">Tasks assigned to you by team members</p>
        </div>
        <Button size="sm" onClick={loadAssignments} variant="secondary">
          🔄 Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:bg-accent/50" onClick={() => setFilter('all')}>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl mb-2">📋</div>
              <div className="text-2xl font-bold text-foreground">{assignments.length}</div>
              <div className="text-sm text-muted-foreground">Total Assignments</div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent/50" onClick={() => setFilter('pending')}>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl mb-2">⏳</div>
              <div className="text-2xl font-bold text-warning">{pendingCount}</div>
              <div className="text-sm text-muted-foreground">Pending Response</div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent/50" onClick={() => setFilter('accepted')}>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-2xl font-bold text-success">{acceptedCount}</div>
              <div className="text-sm text-muted-foreground">Accepted</div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent/50" onClick={() => setFilter('rejected')}>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl mb-2">❌</div>
              <div className="text-2xl font-bold text-destructive">{rejectedCount}</div>
              <div className="text-sm text-muted-foreground">Rejected</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={filter === 'all' ? 'default' : 'secondary'}
          onClick={() => setFilter('all')}
        >
          All ({assignments.length})
        </Button>
        <Button
          size="sm"
          variant={filter === 'pending' ? 'default' : 'secondary'}
          onClick={() => setFilter('pending')}
        >
          Pending ({pendingCount})
        </Button>
        <Button
          size="sm"
          variant={filter === 'accepted' ? 'default' : 'secondary'}
          onClick={() => setFilter('accepted')}
        >
          Accepted ({acceptedCount})
        </Button>
        <Button
          size="sm"
          variant={filter === 'rejected' ? 'default' : 'secondary'}
          onClick={() => setFilter('rejected')}
        >
          Rejected ({rejectedCount})
        </Button>
      </div>

      {/* Assignments Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filter === 'all' ? 'All Assignments' :
             filter === 'pending' ? 'Pending Assignments - Action Required' :
             filter === 'accepted' ? 'Accepted Assignments' :
             'Rejected Assignments'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assigned By</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      {filter === 'pending' ? 'No pending assignments' :
                       filter === 'accepted' ? 'No accepted assignments' :
                       filter === 'rejected' ? 'No rejected assignments' :
                       'No assignments yet'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssignments.map((assignment) => (
                    <TableRow key={assignment.id} className={assignment.status === 'Pending' ? 'bg-warning/5' : ''}>
                      <TableCell className="font-medium">{assignment.taskName}</TableCell>
                      <TableCell>{assignment.clientName || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="info">{assignment.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityVariant(assignment.priority)}>
                          {assignment.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{assignment.assignedFromName}</TableCell>
                      <TableCell>{new Date(assignment.assignedAt).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(assignment.status)}>
                          {assignment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={assignment.notes}>
                          {assignment.notes || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {assignment.status === 'Pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="success"
                                onClick={() => handleAccept(assignment.id, assignment.taskName)}
                              >
                                ✓ Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleReject(assignment.id, assignment.taskName)}
                              >
                                ✗ Reject
                              </Button>
                            </>
                          )}
                          {assignment.status === 'Accepted' && (
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleComplete(assignment.id, assignment.taskName)}
                            >
                              ✓ Complete
                            </Button>
                          )}
                          {assignment.status === 'Rejected' && (
                            <span className="text-sm text-muted-foreground">No action needed</span>
                          )}
                          {assignment.status === 'Completed' && (
                            <Badge variant="success">✓ Done</Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
