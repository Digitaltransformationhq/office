import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { KPICard } from './KPICard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table';
import { Badge } from './Badge';
import { Button } from './Button';
import { usersAPI, clientsAPI, tasksAPI, billingAPI } from '../services/api';
import { inquiriesAPI } from '../services/api';
import { RevenueBreakdownCard } from './RevenueBreakdown';
import {
  filterByRange, financialYearLabel, formatINRCompact, monthOverMonth, padSlices,
  pendingBilling, revenueByCategory, revenueByPerson,
  totals, type BillingRecord,
} from '../utils/revenue';
import { TASK_CATEGORIES } from '../utils/taskCategories';
import { AddUserModal } from './AddUserModal';
import { EditUserModal } from './EditUserModal';
import { AddClientModal } from './AddClientModal';
import { CreateTaskModal } from './CreateTaskModal';
import { EditClientModal } from './EditClientModal';
import { ViewClientModal } from './ViewClientModal';
import { ConfirmDialog } from './ConfirmDialog';
import { TaskApprovalQueue } from './TaskApprovalQueue';
import { InquiryApprovalQueue } from './InquiryApprovalQueue';
import { useTimeAgo } from '../hooks/useTimeAgo';
import { useToast } from './Toast';
import { useLiveData } from '../hooks/useLiveData';
import { isAwaitingApproval } from '../utils/taskStatus';
import {
  Loader2, UserPlus, Building2, UploadCloud, ClipboardCheck, Inbox,
  Users as UsersIcon, ClipboardList, FolderOpen, ArrowRight, ChevronDown, Search,
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
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());
  const [userSearch, setUserSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const toggleCard = (id: string) => setOpenCards(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const timeAgo = useTimeAgo(lastRefresh);
  const { showSuccess, showError } = useToast();

  // Modal states
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);

  const [showCreateTask, setShowCreateTask] = useState(false);
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

  useLiveData(['tasks', 'clients', 'users', 'billing', 'inquiries'], () => loadDataSilently(), { enabled: autoRefresh });

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersResult, clientsResult, tasksResult, inquiriesResult, billingResult] = await Promise.allSettled([
        usersAPI.getAll(),
        clientsAPI.getAll(),
        tasksAPI.getAll(),
        inquiriesAPI.getPending(),
        billingAPI.getAll(),
      ]);
      if (usersResult.status === 'fulfilled') setUsers(usersResult.value.data || []);
      else console.error('Error loading users:', usersResult.reason);
      if (clientsResult.status === 'fulfilled') setClients(clientsResult.value.data || []);
      else console.error('Error loading clients:', clientsResult.reason);
      if (tasksResult.status === 'fulfilled') setTasks(tasksResult.value.data || []);
      else console.error('Error loading tasks:', tasksResult.reason);
      if (inquiriesResult.status === 'fulfilled') setInquiries(inquiriesResult.value.data || []);
      else console.error('Error loading inquiries:', inquiriesResult.reason);
      if (billingResult.status === 'fulfilled') setBillingRecords(billingResult.value.data || []);
      else console.error('Error loading billing records:', billingResult.reason);
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
      const [usersResult, clientsResult, tasksResult, inquiriesResult, billingResult] = await Promise.allSettled([
        usersAPI.getAll(),
        clientsAPI.getAll(),
        tasksAPI.getAll(),
        inquiriesAPI.getPending(),
        billingAPI.getAll(),
      ]);
      if (usersResult.status === 'fulfilled') setUsers(usersResult.value.data || []);
      if (clientsResult.status === 'fulfilled') setClients(clientsResult.value.data || []);
      if (tasksResult.status === 'fulfilled') setTasks(tasksResult.value.data || []);
      if (inquiriesResult.status === 'fulfilled') setInquiries(inquiriesResult.value.data || []);
      if (billingResult.status === 'fulfilled') setBillingRecords(billingResult.value.data || []);
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

  const NAVY = '#1b365d';

  // ── Revenue roll-ups ──
  // Revenue counts PAID invoices only, bucketed by payment date. Unpaid invoices
  // sit in "pending payments"; work not yet invoiced sits in "pending billing".
  // Revenue is recognised on invoice, so every billing record counts.
  const paid = billingRecords;
  const fyRecords = filterByRange(paid, 'fy');
  const fyTotals = totals(fyRecords);
  const mom = monthOverMonth(paid);
  const pending = pendingBilling(tasks);
  // Pad against the full roster so everyone appears, even on ₹0 this year.
  const activeUserNames = users.filter(u => u.status === 'Active').map(u => u.name);
  const personSeries = padSlices(revenueByPerson(fyRecords), activeUserNames);
  const categorySeries = padSlices(revenueByCategory(fyRecords), TASK_CATEGORIES);
  const fyLabel = financialYearLabel();

  const uq = userSearch.trim().toLowerCase();
  const filteredUsers = users.filter(u => !uq ||
    (u.name || '').toLowerCase().includes(uq) ||
    (u.email || '').toLowerCase().includes(uq) ||
    (u.role || '').toLowerCase().includes(uq));
  const cq = clientSearch.trim().toLowerCase();
  const filteredClients = clients.filter(c => !cq ||
    (c.name || '').toLowerCase().includes(cq) ||
    (c.industry || '').toLowerCase().includes(cq) ||
    (c.gstin || c.gst || '').toLowerCase().includes(cq) ||
    (c.contact || c.mobileNumber || '').toLowerCase().includes(cq));

  return (
    <div className="space-y-0">      {/* No padding here — <main> in App.tsx already pads the page. */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-[1.6rem] font-semibold tracking-tight" style={{ color: '#1b365d' }}>
              Admin Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">System management and configuration</p>
          </div>
        </div>

        {/* ── Control panel overview ── */}
        <div className="space-y-4">
          {/* Quick actions — aligned to the stat-tile columns below */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <button
              onClick={() => setShowAddUser(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#1b365d] px-4 py-2 text-sm font-medium text-white shadow-[0_8px_20px_-10px_rgba(27,54,93,0.6)] transition-all hover:bg-[#142a4a]"
            >
              <UserPlus size={15} /> Add User
            </button>
            <button
              onClick={() => setShowCreateTask(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#E7EDF4] bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-[#F4F6F9]"
              style={{ color: NAVY }}
            >
              <ClipboardList size={15} /> New Task
            </button>
            <button
              onClick={() => setShowAddClient(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#E7EDF4] bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-[#F4F6F9]"
              style={{ color: NAVY }}
            >
              <Building2 size={15} /> Add Client
            </button>
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KPICard
              title={`Total revenue · ${fyLabel}`}
              value={formatINRCompact(fyTotals.revenue)}
              variant="success"
              note="Invoices raised"
            />
            <KPICard
              title="Revenue this month"
              value={formatINRCompact(mom.current)}
              trend={mom.change === null ? undefined : {
                value: `${Math.abs(mom.change).toFixed(0)}% vs last month`,
                isPositive: mom.change >= 0,
              }}
            />
            {/* Sent for billing, invoice not yet raised. */}
            <KPICard
              title="Pending billing"
              value={formatINRCompact(pending.amount)}
              variant="warning"
              note={`${pending.count} task${pending.count === 1 ? '' : 's'} awaiting invoice`}
            />
            <KPICard title="Total Tasks" value={tasks.length} />
          </div>

          {/* Approval queues, directly under the stat tiles: they are the two
              things on this page that need acting on, so they belong with the
              headline numbers rather than below the tables. */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ApprovalCard
              label="Pending Task Approvals"
              count={tasks.filter(t => isAwaitingApproval(t.status)).length}
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

          {/* Revenue breakdown — person / category, toggled */}
          <RevenueBreakdownCard
            person={personSeries}
            category={categorySeries}
            caption={fyLabel}
            emptyMessage="No revenue billed this financial year."
          />
        </div>


        {/* Task Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Task Categories</CardTitle>
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

      {showCreateTask && user && (
        <CreateTaskModal
          currentUserRole={user.role}
          currentUser={user}
          onClose={() => setShowCreateTask(false)}
          onTaskCreated={() => {
            showSuccess('Task created and assigned!');
            setShowCreateTask(false);
            loadDataSilently();
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
                  userId={user.id}
                  userName={user.name}
                  userRole={user.role}
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

function CardRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="shrink-0 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-[0.8rem] font-medium text-foreground/80">{children}</dd>
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