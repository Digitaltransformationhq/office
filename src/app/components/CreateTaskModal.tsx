import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { tasksAPI, usersAPI, clientsAPI } from '../services/api';
import { CreateClientModal } from './CreateClientModal';
import { TASK_STATUS } from '../utils/taskStatus';
import { X, ClipboardList, ChevronDown, Plus, Info, Search } from 'lucide-react';

interface CreateTaskModalProps {
  onClose: () => void;
  onTaskCreated: () => void;
  currentUserRole?: string; // 'partner', 'admin', or 'team-member'
  currentUser?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

const NAVY = '#1b365d';
const inputCls =
  'w-full rounded-lg border border-[#E7EDF4] bg-white px-3.5 py-2.5 text-[0.92rem] text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15';

export function CreateTaskModal({ onClose, onTaskCreated, currentUserRole, currentUser }: CreateTaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [approvers, setApprovers] = useState<any[]>([]);
  /** Partners and admins sign tasks off, so their own need no approval gate. */
  const isApproverRole = ['partner', 'admin', 'Partner', 'Admin'].includes(currentUserRole || '');
  const [clients, setClients] = useState<any[]>([]);
  const [showCreateClient, setShowCreateClient] = useState(false);

  const [assignSearch, setAssignSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const [formData, setFormData] = useState({
    taskName: '',
    category: '',
    client: '',
    assignedToId: '',
    assignedTo: '',
    priority: 'Medium',
    taskDate: new Date().toISOString().split('T')[0],
    completionDate: '',
    comments: '',
    /** Blank is meaningful: any partner or admin may pick the approval up. */
    approverId: '',
  });

  const taskCategories = [
    'Income Tax', 'GST', 'Audit', 'Certification', 'Project Finance', 'Accounts',
    'Advisory', 'Office Work', 'Consultancy', 'Litigation', 'MCA Work',
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.assign-dropdown-container')) setShowAssignDropdown(false);
      if (!target.closest('.client-dropdown-container')) setShowClientDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, clientsRes] = await Promise.all([usersAPI.getAll(), clientsAPI.getAll()]);
      setUsers(usersRes.data.filter((u: any) =>
        u.role === 'team-member' || u.role === 'Staff' || u.role === 'Team Member' ||
        u.role === 'partner' || u.role === 'Partner' ||
        u.role === 'team-leader' || u.role === 'Accounts' || u.role === 'Team Leader'
      ));
      // Partners and admins are the people who can sign a task off.
      setApprovers(usersRes.data.filter((u: any) =>
        ['partner', 'admin', 'Partner', 'Admin'].includes(u.role)
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

      /**
       * A partner or admin creating a task is the authority on it, so it starts
       * at 'Pending' and needs no sign-off — and they become its approver, so
       * the completion approval comes back to them. Anyone else is proposing
       * work, so it starts at the approval gate; they may nominate an approver,
       * and if they leave it blank whoever approves claims it.
       */
      const isApprover = isApproverRole;
      const chosenApprover = approvers.find(u => u.id === formData.approverId);
      const approverId = isApprover ? (currentUser?.id || '') : formData.approverId;
      const approverName = isApprover ? (currentUser?.name || '') : (chosenApprover?.name || '');

      const taskData = {
        task: formData.taskName,
        category: formData.category,
        client: formData.client,
        assignedTo: selectedUser.name,
        assignedToId: formData.assignedToId,
        priority: formData.priority,
        status: isApprover ? TASK_STATUS.pending : TASK_STATUS.pendingNewTaskApproval,
        startDate: formData.taskDate,
        targetDate: formData.completionDate,
        comments: formData.comments,
        estimatedHours: 0,
        budgetedFee: 0,
        createdBy: currentUser?.name || 'Unknown',
        createdById: currentUser?.id || '',
        approverId,
        approverName,
      };

      const response = await tasksAPI.create(taskData);

      if (!response.success) {
        const errorMsg = response.message || response.error || 'Failed to create task';
        const detailMsg = response.hint || response.details || '';
        const debugInfo = response.fullError ? `\n\nDebug Info: ${response.fullError}` : '';
        alert(`Failed to create task!\n\n${errorMsg}${detailMsg ? '\n\nDetails: ' + detailMsg : ''}${debugInfo}`);
        setLoading(false);
        return;
      }

      const message = isApprover
        ? `Task "${formData.taskName}" assigned to ${selectedUser.name} successfully!`
        : approverName
          ? `Task "${formData.taskName}" sent to ${approverName} for approval`
          : `Task "${formData.taskName}" submitted for approval`;

      alert(message);
      onTaskCreated();
      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user: any) => {
    setFormData({ ...formData, assignedToId: user.id, assignedTo: user.name });
    setAssignSearch(user.name);
    setShowAssignDropdown(false);
  };

  const handleClientSelect = (clientName: string) => {
    setFormData({ ...formData, client: clientName });
    setClientSearch(clientName);
    setShowClientDropdown(false);
  };

  const handleClientCreated = async (clientName: string) => {
    await loadData();
    handleClientSelect(clientName);
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(assignSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(assignSearch.toLowerCase())
  );
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const isStaffUser = currentUserRole === 'team-member' || currentUserRole === 'Staff' || currentUserRole === 'Team Member';
  const partners = filteredUsers.filter(u => u.role === 'partner' || u.role === 'Partner');
  const accountants = filteredUsers.filter(u => u.role === 'team-leader' || u.role === 'Accounts' || u.role === 'Team Leader');
  const staff = filteredUsers.filter(u => u.role === 'team-member' || u.role === 'Staff' || u.role === 'Team Member');

  const userGroup = (title: string, list: any[]) => list.length > 0 && (
    <>
      <div className="bg-[#F9FAFB] px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</div>
      {list.map((user) => (
        <button
          key={user.id}
          type="button"
          onClick={() => handleUserSelect(user)}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[#F4F6F9]"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-semibold" style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}>
            {(user.name?.[0] || '?').toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium" style={{ color: NAVY }}>{user.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          </span>
        </button>
      ))}
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1728]/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_40px_120px_-30px_rgba(10,23,40,0.8)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#E7EDF4] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}>
              <ClipboardList size={20} />
            </span>
            <div>
              <h2 className="text-[1.05rem] font-semibold" style={{ color: NAVY }}>Create Task</h2>
              <p className="text-xs text-muted-foreground">Assign work to a member of your team</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <Field label="Task name" required>
              <input className={inputCls} value={formData.taskName} onChange={e => setFormData({ ...formData, taskName: e.target.value })} placeholder="Enter task name" required />
            </Field>

            <Field label="Category" required>
              <SelectField value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} required>
                <option value="">Select category</option>
                {taskCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </SelectField>
            </Field>

            {/* Client */}
            <Field label="Client" required>
              <div className="flex items-stretch gap-2">
                <div className="client-dropdown-container relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={e => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
                    onFocus={() => setShowClientDropdown(true)}
                    placeholder="Search or select client…"
                    className={`${inputCls} pl-9`}
                    required={!formData.client}
                  />
                  {showClientDropdown && (
                    <div className="absolute z-20 mt-1.5 max-h-60 w-full overflow-y-auto rounded-lg border border-[#E7EDF4] bg-white shadow-[0_20px_50px_-20px_rgba(10,23,40,0.45)]">
                      {filteredClients.length === 0 ? (
                        <div className="p-3 text-center text-sm text-muted-foreground">No clients found</div>
                      ) : filteredClients.map(client => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => handleClientSelect(client.name)}
                          className="w-full px-3 py-2 text-left transition-colors hover:bg-[#F4F6F9]"
                        >
                          <div className="text-sm font-medium" style={{ color: NAVY }}>{client.name}</div>
                          <div className="text-xs text-muted-foreground">{client.industry}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateClient(true)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#1b365d] px-4 text-sm font-medium text-white shadow-[0_8px_20px_-10px_rgba(27,54,93,0.6)] transition-all hover:bg-[#142a4a]"
                >
                  <Plus size={15} /> New
                </button>
              </div>
            </Field>

            {/* Assign To */}
            <Field label="Assign to" hint="Partner, Accountant or Staff" required>
              <div className="assign-dropdown-container relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={assignSearch}
                  onChange={e => { setAssignSearch(e.target.value); setShowAssignDropdown(true); }}
                  onFocus={() => setShowAssignDropdown(true)}
                  placeholder="Search or select person…"
                  className={`${inputCls} pl-9`}
                  required={!formData.assignedToId}
                />
                {showAssignDropdown && (
                  <div className="absolute z-20 mt-1.5 max-h-60 w-full overflow-y-auto rounded-lg border border-[#E7EDF4] bg-white shadow-[0_20px_50px_-20px_rgba(10,23,40,0.45)]">
                    {filteredUsers.length === 0 ? (
                      <div className="p-3 text-center text-sm text-muted-foreground">No users found</div>
                    ) : (
                      <>
                        {userGroup('Partners', partners)}
                        {userGroup('Accountants', accountants)}
                        {userGroup('Staff', staff)}
                      </>
                    )}
                  </div>
                )}
              </div>
            </Field>

            <Field label="Priority" required>
              <SelectField value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })} required>
                {['Low', 'Medium', 'High', 'Urgent'].map(p => <option key={p} value={p}>{p}</option>)}
              </SelectField>
            </Field>

            {/* Only shown to those whose tasks need signing off. A partner or
                admin approves their own tasks by definition, so asking them
                would be noise. */}
            {!isApproverRole && (
              <Field
                label="Send for approval to"
                hint="Optional — leave blank and any partner can approve it"
              >
                <SelectField
                  value={formData.approverId}
                  onChange={e => setFormData({ ...formData, approverId: e.target.value })}
                >
                  <option value="">Any partner or admin</option>
                  {approvers.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} · {a.role === 'admin' || a.role === 'Admin' ? 'Admin' : 'Partner'}
                    </option>
                  ))}
                </SelectField>
              </Field>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Assignment date" required>
                <input className={inputCls} type="date" value={formData.taskDate} onChange={e => setFormData({ ...formData, taskDate: e.target.value })} required />
              </Field>
              <Field label="Expected completion" required>
                <input className={inputCls} type="date" value={formData.completionDate} onChange={e => setFormData({ ...formData, completionDate: e.target.value })} required />
              </Field>
            </div>

            <Field label="Comments" hint="Optional">
              <textarea
                value={formData.comments}
                onChange={e => setFormData({ ...formData, comments: e.target.value })}
                placeholder="Add any additional comments or instructions…"
                className={`${inputCls} min-h-[96px] resize-none`}
              />
            </Field>

            {isStaffUser && (
              <div className="flex gap-2.5 rounded-xl border border-[#E7EDF4] bg-[#F9FAFB] p-3.5">
                <Info size={18} className="mt-0.5 shrink-0 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  This task will be sent to a Partner for approval before it is assigned.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 border-t border-[#E7EDF4] px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1" disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating…' : 'Create Task'}
            </Button>
          </div>
        </form>
      </div>

      {showCreateClient && (
        <CreateClientModal
          onClose={() => setShowCreateClient(false)}
          onClientCreated={handleClientCreated}
        />
      )}
    </div>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
        {label} {required && <span className="text-[#c0392b]">*</span>}
        {hint && <span className="ml-1 font-normal text-muted-foreground">· {hint}</span>}
      </label>
      {children}
    </div>
  );
}

function SelectField({ value, onChange, required, children }: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select value={value} onChange={onChange} required={required} className={`${inputCls} appearance-none pr-9`}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
