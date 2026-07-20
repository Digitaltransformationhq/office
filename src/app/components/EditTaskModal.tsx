import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { tasksAPI, usersAPI, clientsAPI } from '../services/api';
import { TASK_STATUS, statusLabel } from '../utils/taskStatus';
import { X } from 'lucide-react';

interface Task {
  id: string;
  client: string;
  task: string;
  category: string;
  assignedTo: string;
  assignedToId: string;
  priority: string;
  status: string;
  startDate: string;
  targetDate: string;
  comments?: string;
}

interface EditTaskModalProps {
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditTaskModal({ task, onClose, onSuccess }: EditTaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  const [assignSearch, setAssignSearch] = useState(task.assignedTo);
  const [clientSearch, setClientSearch] = useState(task.client);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const isResubmit = task.comments?.includes('[Rejected by ');

  const [formData, setFormData] = useState({
    taskName: task.task,
    category: task.category,
    client: task.client,
    assignedToId: task.assignedToId,
    assignedTo: task.assignedTo,
    priority: task.priority,
    status: isResubmit ? 'Pending Approval' : task.status,
    taskDate: task.startDate,
    completionDate: task.targetDate,
    comments: task.comments || '',
  });

  const taskCategories = [
    'Income Tax',
    'GST',
    'Audit',
    'Certification',
    'Project Finance',
    'Accounts',
    'Advisory',
    'Office Work',
    'Consultancy',
    'Litigation',
    'MCA Work',
  ];

  /**
   * Only statuses the database actually accepts.
   *
   * 'On Hold' was offered here and is NOT in the tasks_status_check constraint,
   * so choosing it failed the save outright with a Postgres 23514. 'Completed'
   * was retired when the lifecycle moved its terminal state to 'Billed'.
   *
   * The two approval gates are left out on purpose: they both read as "Pending
   * for Approval", so a dropdown would show the same label twice, and moving a
   * task into a gate by hand skips the routing that decides who it goes to.
   */
  const EDITABLE_STATUSES = [
    TASK_STATUS.pending,
    TASK_STATUS.inProgress,
    TASK_STATUS.pendingForBilling,
    TASK_STATUS.billed,
  ];
  /**
   * Whatever the task is now stays selectable, so opening a task that sits at a
   * gate and pressing save does not quietly move it somewhere else.
   *
   * Deduplicated by LABEL rather than by value: legacy rows still stored as
   * 'Completed' render as "Billed", so prepending the raw value would list
   * "Billed" twice — once for the stored value and once for the real terminal
   * status — with no way to tell them apart.
   */
  const taskStatuses = EDITABLE_STATUSES.some(
    (v) => statusLabel(v) === statusLabel(formData.status),
  )
    ? EDITABLE_STATUSES
    : [formData.status, ...EDITABLE_STATUSES];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.assign-dropdown-container')) {
        setShowAssignDropdown(false);
      }
      if (!target.closest('.client-dropdown-container')) {
        setShowClientDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, clientsRes] = await Promise.all([
        usersAPI.getAll(),
        clientsAPI.getAll(),
      ]);
      setUsers(usersRes.data.filter((u: any) =>
        u.role === 'team-member' || u.role === 'Staff' || u.role === 'Team Member' ||
        u.role === 'partner' || u.role === 'Partner' ||
        u.role === 'team-leader' || u.role === 'Accounts' || u.role === 'Team Leader'
      ));
      setClients(clientsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedUser = users.find(u => u.id === formData.assignedToId);

      if (!selectedUser) {
        alert('Please select a user to assign the task to.');
        setLoading(false);
        return;
      }

      const updates = {
        task: formData.taskName,
        category: formData.category,
        client: formData.client,
        assignedTo: selectedUser.name,
        assignedToId: formData.assignedToId,
        priority: formData.priority,
        status: formData.status,
        startDate: formData.taskDate,
        targetDate: formData.completionDate,
        comments: formData.comments,
      };

      console.log('Updating task with data:', updates);
      const response = await tasksAPI.update(task.id, updates);

      if (response.success) {
        onSuccess();
        onClose();
      } else {
        alert(response.message || response.error || 'Failed to update task');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user: any) => {
    setFormData({
      ...formData,
      assignedToId: user.id,
      assignedTo: user.name,
    });
    setAssignSearch(user.name);
    setShowAssignDropdown(false);
  };

  const handleClientSelect = (clientName: string) => {
    setFormData({
      ...formData,
      client: clientName,
    });
    setClientSearch(clientName);
    setShowClientDropdown(false);
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(assignSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(assignSearch.toLowerCase())
  );

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const NAVY = '#1b365d';
  const fieldCls =
    'w-full rounded-lg border border-[#E7EDF4] bg-white px-3.5 py-2.5 text-[0.92rem] text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15';
  const labelCls = 'mb-1.5 block text-sm font-medium';

  /** One dropdown row, shared by the client and assignee lists below. */
  const optionRow = (title: string, sub: string, onClick: () => void, key: string) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      className="w-full px-3 py-2 text-left transition-colors hover:bg-[#F4F6F9]"
    >
      <div className="text-sm font-medium" style={{ color: NAVY }}>{title}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </button>
  );

  const roleGroups: [string, (u: any) => boolean][] = [
    ['Partners', (u) => ['partner', 'Partner', 'admin', 'Admin'].includes(u.role)],
    ['Accounts', (u) => ['team-leader', 'Accounts', 'Team Leader'].includes(u.role)],
    ['Staff', (u) => ['team-member', 'Staff', 'Team Member'].includes(u.role)],
  ];

  return (
    /**
     * Capped height with a scrolling body and a pinned footer, matching the
     * other modals. This was an unbounded stack of full-width fields, so on a
     * laptop the form ran past the bottom of the screen and Update Task could
     * only be reached by scrolling the modal itself.
     */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1728]/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_40px_120px_-30px_rgba(10,23,40,0.8)]">
        {/* Header - fixed */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[#E7EDF4] px-6 py-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight" style={{ color: NAVY }}>
              {isResubmit ? 'Edit & Resubmit Task' : 'Edit Task'}
            </h2>
            {isResubmit && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Goes back for approval once you save.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-[#1b365d]"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          {/* Body - the only scrolling region */}
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div>
              <label className={labelCls} style={{ color: NAVY }}>
                Task name <span className="text-[#c0392b]">*</span>
              </label>
              <input
                type="text"
                value={formData.taskName}
                onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
                placeholder="What needs doing"
                required
                className={fieldCls}
              />
            </div>

            {/* Client - searchable */}
            <div className="client-dropdown-container relative">
              <label className={labelCls} style={{ color: NAVY }}>
                Client <span className="text-[#c0392b]">*</span>
              </label>
              <input
                type="text"
                value={clientSearch}
                onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
                onFocus={() => setShowClientDropdown(true)}
                placeholder="Search or select client"
                required={!formData.client}
                className={fieldCls}
              />
              {showClientDropdown && (
                <div className="absolute z-20 mt-1.5 max-h-56 w-full overflow-y-auto rounded-lg border border-[#E7EDF4] bg-white shadow-[0_20px_50px_-20px_rgba(10,23,40,0.45)]">
                  {filteredClients.length === 0 ? (
                    <div className="p-3 text-center text-sm text-muted-foreground">No clients found</div>
                  ) : filteredClients.map((client) =>
                    optionRow(client.name, client.industry, () => handleClientSelect(client.name), client.id)
                  )}
                </div>
              )}
            </div>

            {/* Assignee - searchable, grouped by role */}
            <div className="assign-dropdown-container relative">
              <label className={labelCls} style={{ color: NAVY }}>
                Assign to <span className="text-[#c0392b]">*</span>
              </label>
              <input
                type="text"
                value={assignSearch}
                onChange={(e) => { setAssignSearch(e.target.value); setShowAssignDropdown(true); }}
                onFocus={() => setShowAssignDropdown(true)}
                placeholder="Search partner, accounts or staff"
                required={!formData.assignedToId}
                className={fieldCls}
              />
              {showAssignDropdown && (
                <div className="absolute z-20 mt-1.5 max-h-56 w-full overflow-y-auto rounded-lg border border-[#E7EDF4] bg-white shadow-[0_20px_50px_-20px_rgba(10,23,40,0.45)]">
                  {filteredUsers.length === 0 ? (
                    <div className="p-3 text-center text-sm text-muted-foreground">No people found</div>
                  ) : roleGroups.map(([heading, match]) => {
                    const group = filteredUsers.filter(match);
                    if (group.length === 0) return null;
                    return (
                      <div key={heading}>
                        <div className="bg-[#F4F6F9] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {heading}
                        </div>
                        {group.map((u) => optionRow(u.name, u.email, () => handleUserSelect(u), u.id))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Short fields pair up rather than each taking a full row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls} style={{ color: NAVY }}>
                  Category <span className="text-[#c0392b]">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  className={fieldCls}
                >
                  <option value="">Select category</option>
                  {taskCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} style={{ color: NAVY }}>
                  Priority <span className="text-[#c0392b]">*</span>
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  required
                  className={fieldCls}
                >
                  {['Low', 'Medium', 'High', 'Urgent'].map((pr) => <option key={pr} value={pr}>{pr}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls} style={{ color: NAVY }}>
                Status <span className="text-[#c0392b]">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                required
                disabled={isResubmit}
                className={fieldCls + ' disabled:cursor-not-allowed disabled:bg-[#F4F6F9] disabled:text-muted-foreground'}
              >
                {taskStatuses.map((status) => (
                  <option key={status} value={status}>{statusLabel(status)}</option>
                ))}
              </select>
              {isResubmit && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Set to await approval automatically when you resubmit.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls} style={{ color: NAVY }}>
                  Assigned on <span className="text-[#c0392b]">*</span>
                </label>
                <input
                  type="date"
                  value={formData.taskDate}
                  onChange={(e) => setFormData({ ...formData, taskDate: e.target.value })}
                  required
                  className={fieldCls}
                />
              </div>
              <div>
                <label className={labelCls} style={{ color: NAVY }}>
                  Due <span className="text-[#c0392b]">*</span>
                </label>
                <input
                  type="date"
                  value={formData.completionDate}
                  onChange={(e) => setFormData({ ...formData, completionDate: e.target.value })}
                  required
                  className={fieldCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls} style={{ color: NAVY }}>
                Comments <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <textarea
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                placeholder="Anything the assignee should know"
                rows={3}
                className={fieldCls + ' resize-none'}
              />
            </div>
          </div>

          {/* Footer - always reachable, never scrolls away */}
          <div className="flex shrink-0 items-center gap-3 border-t border-[#E7EDF4] px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : isResubmit ? 'Resubmit' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
