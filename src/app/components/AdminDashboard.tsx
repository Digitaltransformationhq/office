import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { KPICard } from './KPICard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table';
import { Badge } from './Badge';
import { Button } from './Button';
import { usersAPI, clientsAPI, tasksAPI } from '../services/api';
import { inquiriesAPI } from '../services/api';
import { AddUserModal } from './AddUserModal';
import { EditUserModal } from './EditUserModal';
import { AddClientModal } from './AddClientModal';
import { EditClientModal } from './EditClientModal';
import { ViewClientModal } from './ViewClientModal';
import { ConfirmDialog } from './ConfirmDialog';
import { TaskApprovalQueue } from './TaskApprovalQueue';
import { InquiryApprovalQueue } from './InquiryApprovalQueue';
import { AnnouncementBar } from './AnnouncementBar';
import { useTimeAgo } from '../hooks/useTimeAgo';
import { useToast } from './Toast';
import {
  Loader2, UserPlus, Building2, UploadCloud, ClipboardCheck, Inbox,
  Users as UsersIcon, ClipboardList, FolderOpen, ArrowRight,
} from 'lucide-react';

interface AdminDashboardProps {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const timeAgo = useTimeAgo(lastRefresh);
  const { showSuccess, showError } = useToast();

  // Modal states
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);

  const [showAddClient, setShowAddClient] = useState(false);
  const [showEditClient, setShowEditClient] = useState(false);
  const [showViewClient, setShowViewClient] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  // New approval workflow modals
  const [showTaskApprovals, setShowTaskApprovals] = useState(false);
  const [showInquiryApprovals, setShowInquiryApprovals] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadDataSilently, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersResult, clientsResult, tasksResult, inquiriesResult] = await Promise.allSettled([
        usersAPI.getAll(),
        clientsAPI.getAll(),
        tasksAPI.getAll(),
        inquiriesAPI.getPending(),
      ]);
      if (usersResult.status === 'fulfilled') setUsers(usersResult.value.data || []);
      else console.error('Error loading users:', usersResult.reason);
      if (clientsResult.status === 'fulfilled') setClients(clientsResult.value.data || []);
      else console.error('Error loading clients:', clientsResult.reason);
      if (tasksResult.status === 'fulfilled') setTasks(tasksResult.value.data || []);
      else console.error('Error loading tasks:', tasksResult.reason);
      if (inquiriesResult.status === 'fulfilled') setInquiries(inquiriesResult.value.data || []);
      else console.error('Error loading inquiries:', inquiriesResult.reason);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error loading admin data:', error);
      showError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadDataSilently = async () => {
    try {
      const [usersResult, clientsResult, tasksResult, inquiriesResult] = await Promise.allSettled([
        usersAPI.getAll(),
        clientsAPI.getAll(),
        tasksAPI.getAll(),
        inquiriesAPI.getPending(),
      ]);
      if (usersResult.status === 'fulfilled') setUsers(usersResult.value.data || []);
      if (clientsResult.status === 'fulfilled') setClients(clientsResult.value.data || []);
      if (tasksResult.status === 'fulfilled') setTasks(tasksResult.value.data || []);
      if (inquiriesResult.status === 'fulfilled') setInquiries(inquiriesResult.value.data || []);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error refreshing admin data:', error);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      // Soft delete - just mark as inactive
      const response = await usersAPI.update(userToDelete.id, { status: 'Inactive' });
      
      if (response.success) {
        showSuccess(`User ${userToDelete.name} marked as inactive`);
        loadData();
      } else {
        showError(response.error || 'Failed to deactivate user');
      }
    } catch (error) {
      console.error('Error deactivating user:', error);
      showError('Failed to deactivate user');
    } finally {
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    }
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setShowEditUser(true);
  };

  const handleViewClient = (client: any) => {
    setSelectedClient(client);
    setShowViewClient(true);
  };

  const handleEditClient = (client: any) => {
    setSelectedClient(client);
    setShowEditClient(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin" style={{ color: '#1b365d' }} />
          <p className="text-sm">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  // Calculate task categories
  const categoryMap = new Map<string, { count: number; totalHours: number }>();
  tasks.forEach(task => {
    const category = task.category || 'Uncategorized';
    const existing = categoryMap.get(category) || { count: 0, totalHours: 0 };
    categoryMap.set(category, {
      count: existing.count + 1,
      totalHours: existing.totalHours + (task.hoursLogged || 0),
    });
  });

  const categories = Array.from(categoryMap.entries()).map(([name, data]) => ({
    name,
    count: data.count,
    avgTime: data.count > 0 ? `${(data.totalHours / data.count).toFixed(1)} hrs` : '0 hrs',
  }));

  return (
    <div className="space-y-0">
      <AnnouncementBar />

      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-[1.6rem] font-semibold tracking-tight" style={{ color: '#1b365d' }}>
              Admin Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">System management and configuration</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E7EDF4] bg-white px-3 py-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#4ea72e' }} />
            Updated {timeAgo} ago
          </span>
        </div>

        {/* User Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>User Management</CardTitle>
              <Button size="sm" onClick={() => setShowAddUser(true)} className="inline-flex items-center gap-1.5">
                <UserPlus size={15} /> Add User
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>
                      <Badge variant="primary">{user.role}</Badge>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'Active' ? 'success' : 'default'}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('en-IN') : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => handleEditUser(user)}
                        >
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="danger"
                          onClick={() => {
                            setUserToDelete(user);
                            setShowDeleteConfirm(true);
                          }}
                          disabled={user.status === 'Inactive'}
                        >
                          {user.status === 'Inactive' ? 'Inactive' : 'Deactivate'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Client Master */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Client Master</CardTitle>
              <Button size="sm" onClick={() => setShowAddClient(true)} className="inline-flex items-center gap-1.5">
                <Building2 size={15} /> Add Client
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>GST Number</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>{client.name}</TableCell>
                    <TableCell>{client.industry || 'N/A'}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {client.gstin || client.gst || 'N/A'}
                    </TableCell>
                    <TableCell>{client.contact || client.mobileNumber || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="success">{client.status || 'Active'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => handleEditClient(client)}
                        >
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => handleViewClient(client)}
                        >
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Task Categories */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Task Categories</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Tasks</TableHead>
                    <TableHead>Avg Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        No task categories found
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories.map((cat, index) => (
                      <TableRow key={index}>
                        <TableCell>{cat.name}</TableCell>
                        <TableCell>{cat.count}</TableCell>
                        <TableCell>{cat.avgTime}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Excel Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Excel Upload</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border-2 border-dashed border-[#E7EDF4] p-8 text-center">
                <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F4F6F9] text-muted-foreground">
                  <UploadCloud size={22} />
                </span>
                <p className="text-sm">Excel client upload coming soon</p>
                <p className="mt-1 text-xs text-muted-foreground">Use the Add Client button for now</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Approval Workflow Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ApprovalCard
            label="Pending Task Approvals"
            count={tasks.filter(t => t.status === 'Pending Approval').length}
            icon={<ClipboardCheck size={24} />}
            onClick={() => setShowTaskApprovals(true)}
          />
          <ApprovalCard
            label="Pending Inquiries"
            count={inquiries.length}
            icon={<Inbox size={24} />}
            onClick={() => setShowInquiryApprovals(true)}
          />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Users" value={users.length} icon={<UsersIcon size={22} />} />
          <KPICard
            title="Active Clients"
            value={clients.filter(c => c.status === 'Active').length}
            icon={<Building2 size={22} />}
            variant="success"
          />
          <KPICard title="Total Tasks" value={tasks.length} icon={<ClipboardList size={22} />} />
          <KPICard title="Categories" value={categories.length} icon={<FolderOpen size={22} />} />
        </div>
      </div>

      {/* Modals */}
      {showAddUser && (
        <AddUserModal
          onClose={() => setShowAddUser(false)}
          onSuccess={() => {
            loadData();
            setShowAddUser(false);
          }}
        />
      )}

      {showEditUser && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => {
            setShowEditUser(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            loadData();
            setShowEditUser(false);
            setSelectedUser(null);
          }}
        />
      )}

      {showDeleteConfirm && userToDelete && (
        <ConfirmDialog
          title="Deactivate User"
          message={`Are you sure you want to deactivate ${userToDelete.name}?\n\nThey will not be able to login, but their data will remain in the system.\n\nYou can reactivate them later from the Edit screen.`}
          confirmLabel="Deactivate"
          variant="danger"
          onConfirm={handleDeleteUser}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setUserToDelete(null);
          }}
        />
      )}

      {showAddClient && (
        <AddClientModal
          onClose={() => setShowAddClient(false)}
          onSuccess={() => {
            loadData();
            setShowAddClient(false);
          }}
        />
      )}

      {showEditClient && selectedClient && (
        <EditClientModal
          client={selectedClient}
          onClose={() => {
            setShowEditClient(false);
            setSelectedClient(null);
          }}
          onSuccess={() => {
            loadData();
            setShowEditClient(false);
            setSelectedClient(null);
          }}
        />
      )}

      {showViewClient && selectedClient && (
        <ViewClientModal
          client={selectedClient}
          onClose={() => {
            setShowViewClient(false);
            setSelectedClient(null);
          }}
          onEdit={() => {
            setShowViewClient(false);
            setShowEditClient(true);
          }}
        />
      )}

      {/* Task Approval Queue Modal */}
      {showTaskApprovals && user && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-6xl my-8">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Task Approval Queue</CardTitle>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowTaskApprovals(false)}
                  >
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <TaskApprovalQueue
                  userId={parseInt(user.id)}
                  userName={user.name}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Inquiry Approval Queue Modal */}
      {showInquiryApprovals && user && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-6xl my-8">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Client Inquiry Approvals</CardTitle>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowInquiryApprovals(false)}
                  >
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <InquiryApprovalQueue
                  userId={parseInt(user.id)}
                  userName={user.name}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

interface ApprovalCardProps {
  label: string;
  count: number;
  icon: React.ReactNode;
  onClick: () => void;
}

/** A queue tile — count-forward, with a branded icon chip and a clear affordance. */
function ApprovalCard({ label, count, icon, onClick }: ApprovalCardProps) {
  const pending = count > 0;
  const color = pending ? '#F59E0B' : '#4ea72e';
  return (
    <button
      onClick={onClick}
      className="group flex items-center justify-between rounded-xl border border-[#E7EDF4] bg-white p-6 text-left transition-all duration-200 hover:border-[#d5dfea] hover:shadow-[0_16px_44px_-26px_rgba(10,23,40,0.55)]"
    >
      <div>
        <p className="text-[0.72rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        <p className="mt-2 text-4xl font-semibold leading-none tracking-tight" style={{ color: '#1b365d' }}>
          {count}
        </p>
        <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium" style={{ color }}>
          {pending ? 'Review now' : 'All clear'}
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </p>
      </div>
      <span
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}14`, color }}
      >
        {icon}
      </span>
    </button>
  );
}