import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { KPICard } from './KPICard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table';
import { Badge } from './Badge';
import { Button } from './Button';
import { tasksAPI, usersAPI } from '../services/api';
import { AnnouncementBar } from './AnnouncementBar';
import { useTimeAgo } from '../hooks/useTimeAgo';
import { ApprovalQueue } from './ApprovalQueue';
import { useToast } from './Toast';
import { MarkAsBilledModal } from './MarkAsBilledModal';

interface TeamLeaderDashboardProps {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function TeamLeaderDashboard({ user }: TeamLeaderDashboardProps) {
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [showApprovalQueue, setShowApprovalQueue] = useState(false);
  const [selectedTaskForBilling, setSelectedTaskForBilling] = useState<any>(null);
  const timeAgo = useTimeAgo(lastRefresh);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadDataSilently, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksRes, usersRes] = await Promise.all([
        tasksAPI.getAll(),
        usersAPI.getAll(),
      ]);
      setAllTasks(tasksRes.data);
      setUsers(usersRes.data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDataSilently = async () => {
    try {
      const [tasksRes, usersRes] = await Promise.all([
        tasksAPI.getAll(),
        usersAPI.getAll(),
      ]);
      setAllTasks(tasksRes.data);
      setUsers(usersRes.data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Filter out completed tasks for dashboard view
  const myTasks = user ? allTasks.filter(t => t.assignedToId === user.id && t.status !== 'Completed' && t.status !== 'Billed') : [];
  const teamTasks = allTasks.filter(t => t.assignedToId !== user?.id && t.status !== 'Completed' && t.status !== 'Billed');
  const approvalQueue = allTasks.filter(t => t.status === 'Pending Approval');
  
  // Pending for Billing tasks - sorted by completion date
  const pendingForBilling = allTasks
    .filter(t => t.status === 'Pending for Billing')
    .sort((a, b) => {
      const dateA = a.completionDate ? new Date(a.completionDate).getTime() : 0;
      const dateB = b.completionDate ? new Date(b.completionDate).getTime() : 0;
      return dateB - dateA; // newest first
    });

  const staffMembers = users.filter(u => u.role === 'team-member' || u.role === 'Staff' || u.role === 'Team Member');
  const workloadData = staffMembers.map(member => ({
    name: member.name,
    taskCount: allTasks.filter(t => t.assignedToId === member.id && t.status !== 'Completed' && t.status !== 'Billed').length,
  }));

  return (
    <div className="space-y-0">
      <AnnouncementBar />

      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground mb-2">Accounts Dashboard</h1>
          <p className="text-muted-foreground">Manage your team and tasks</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Updated {timeAgo} ago
          </span>
        </div>
      </div>

      {/* Pending for Billing - Highlighted Priority Section */}
      {pendingForBilling.length > 0 && (
        <Card className="border-2 border-warning bg-warning/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">💰</span>
                <div>
                  <CardTitle className="text-warning">Pending for Billing</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tasks awaiting billing - {pendingForBilling.length} task{pendingForBilling.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <Badge variant="warning" className="text-lg px-3 py-1">
                {pendingForBilling.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-hidden">
            <table className="w-full text-[11px] border-collapse table-fixed">
              <colgroup>
                <col style={{ width: '22%' }} /><col style={{ width: '28%' }} />
                <col style={{ width: '20%' }} /><col style={{ width: '14%' }} />
                <col style={{ width: '9%' }} /><col style={{ width: '7%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['Client','Task','Team Member','Date','Status','Action'].map(h => (
                    <th key={h} className="text-left px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingForBilling.map((task) => (
                  <tr key={task.id} className="border-b border-border/40 hover:bg-muted/20">
                    <td className="px-2 py-1.5 font-medium truncate" title={task.client}>{task.client}</td>
                    <td className="px-2 py-1.5 truncate" title={task.task}>{task.task}</td>
                    <td className="px-2 py-1.5 truncate text-muted-foreground">{task.assignedTo}</td>
                    <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">{task.completionDate ? new Date(task.completionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}</td>
                    <td className="px-2 py-1.5"><span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-700">Pending</span></td>
                    <td className="px-2 py-1.5">
                      <button onClick={() => setSelectedTaskForBilling(task)} className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 border border-green-300 rounded hover:bg-green-200 whitespace-nowrap">Billed</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>My Tasks</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-hidden">
          <table className="w-full text-[11px] border-collapse table-fixed">
            <colgroup>
              <col style={{ width: '25%' }} /><col style={{ width: '38%' }} />
              <col style={{ width: '18%' }} /><col style={{ width: '13%' }} /><col style={{ width: '6%' }} />
            </colgroup>
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['Client','Task','Status','Due',''].map((h,i) => (
                  <th key={i} className="text-left px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {myTasks.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-muted-foreground py-6 text-xs">No tasks assigned to you.</td></tr>
              ) : myTasks.map((task) => (
                <tr key={task.id} className="border-b border-border/40 hover:bg-muted/20">
                  <td className="px-2 py-1.5 font-medium truncate" title={task.client}>{task.client}</td>
                  <td className="px-2 py-1.5 truncate" title={task.task}>{task.task}</td>
                  <td className="px-2 py-1.5"><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${task.status === 'Completed' ? 'bg-green-100 text-green-700' : task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{task.status || 'Pending'}</span></td>
                  <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">{task.targetDate ? new Date(task.targetDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}</td>
                  <td className="px-2 py-1.5"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Tasks</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-hidden">
          <table className="w-full text-[11px] border-collapse table-fixed">
            <colgroup>
              <col style={{ width: '18%' }} /><col style={{ width: '22%' }} />
              <col style={{ width: '30%' }} /><col style={{ width: '17%' }} /><col style={{ width: '13%' }} />
            </colgroup>
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['Member','Client','Task','Status','Due'].map(h => (
                  <th key={h} className="text-left px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teamTasks.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-muted-foreground py-6 text-xs">No team tasks available.</td></tr>
              ) : teamTasks.map((task) => (
                <tr key={task.id} className="border-b border-border/40 hover:bg-muted/20">
                  <td className="px-2 py-1.5 truncate text-muted-foreground">{task.assignedTo}</td>
                  <td className="px-2 py-1.5 truncate font-medium" title={task.client}>{task.client}</td>
                  <td className="px-2 py-1.5 truncate" title={task.task}>{task.task}</td>
                  <td className="px-2 py-1.5"><span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${task.status === 'Completed' ? 'bg-green-100 text-green-700' : task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{task.status || 'Pending'}</span></td>
                  <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">{task.targetDate ? new Date(task.targetDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Leave Approval Queue</CardTitle>
              <Button size="sm" onClick={() => setShowApprovalQueue(true)}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {approvalQueue.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No pending approvals. All caught up! 🎉
              </p>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {approvalQueue.length} pending approval{approvalQueue.length !== 1 ? 's' : ''}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workload Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workloadData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No staff members found.</p>
              ) : (
                workloadData.map((member) => (
                  <div key={member.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">{member.name}</span>
                      <span className="text-sm">{member.taskCount} tasks</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${member.taskCount > 8 ? 'bg-warning' : 'bg-success'}`}
                        style={{ width: `${(member.taskCount / 12) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="My Tasks" value={myTasks.length} icon={<span className="text-3xl">📋</span>} />
        <KPICard title="Team Tasks" value={teamTasks.length} icon={<span className="text-3xl">👥</span>} />
        <KPICard title="Pending Approvals" value={approvalQueue.length} icon={<span className="text-3xl">⏳</span>} variant="warning" />
        <KPICard title="Completed" value={allTasks.filter(t => t.status === 'Completed').length} icon={<span className="text-3xl">✅</span>} variant="success" />
      </div>
      </div>

      {/* Approval Queue Modal */}
      {showApprovalQueue && user && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-6xl my-8">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Approval Queue</CardTitle>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowApprovalQueue(false)}
                  >
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ApprovalQueue
                  userId={parseInt(user.id)}
                  userName={user.name}
                  userRole={user.role}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Mark as Billed Modal */}
      {selectedTaskForBilling && user && (
        <MarkAsBilledModal
          task={selectedTaskForBilling}
          user={user}
          onClose={() => setSelectedTaskForBilling(null)}
          onSuccess={() => {
            loadData(); // Reload data after successful billing
          }}
        />
      )}
    </div>
  );
}