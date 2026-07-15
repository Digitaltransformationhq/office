import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Input, Select } from './Input';
import { Button } from './Button';
import { tasksAPI, usersAPI, clientsAPI } from '../services/api';

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

  const taskStatuses = [
    'Pending',
    'In Progress',
    'Completed',
    'On Hold',
    'Pending for Billing',
  ];

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{isResubmit ? '✏️ Edit & Resubmit Task' : 'Edit Task'}</CardTitle>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Task Name"
              type="text"
              value={formData.taskName}
              onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
              placeholder="Enter task name"
              required
            />

            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            >
              <option value="">Select Category</option>
              {taskCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Select>

            {/* Client Search Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-foreground">
                Client <span className="text-destructive">*</span>
              </label>
              <div className="relative client-dropdown-container">
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setShowClientDropdown(true);
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  placeholder="Search or select client..."
                  className="w-full px-3 py-2 bg-input-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
                  required={!formData.client}
                />
                {showClientDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredClients.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        No clients found
                      </div>
                    ) : (
                      filteredClients.map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => handleClientSelect(client.name)}
                          className="w-full px-3 py-2 text-left hover:bg-muted text-sm"
                        >
                          <div>{client.name}</div>
                          <div className="text-xs text-muted-foreground">{client.industry}</div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Assign To Search Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-foreground">
                Assign To (Partner/Staff/Accountant) <span className="text-destructive">*</span>
              </label>
              <div className="relative assign-dropdown-container">
                <input
                  type="text"
                  value={assignSearch}
                  onChange={(e) => {
                    setAssignSearch(e.target.value);
                    setShowAssignDropdown(true);
                  }}
                  onFocus={() => setShowAssignDropdown(true)}
                  placeholder="Search or select person..."
                  className="w-full px-3 py-2 bg-input-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
                  required={!formData.assignedToId}
                />
                {showAssignDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredUsers.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        No users found
                      </div>
                    ) : (
                      <>
                        {/* Partners Section */}
                        {filteredUsers.some(u => u.role === 'partner' || u.role === 'Partner') && (
                          <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted">
                            PARTNERS
                          </div>
                        )}
                        {filteredUsers.filter(u => u.role === 'partner' || u.role === 'Partner').map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => handleUserSelect(user)}
                            className="w-full px-3 py-2 text-left hover:bg-muted text-sm"
                          >
                            <div>{user.name}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </button>
                        ))}

                        {/* Accountants Section */}
                        {filteredUsers.some(u => u.role === 'team-leader' || u.role === 'Accounts' || u.role === 'Team Leader') && (
                          <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted">
                            ACCOUNTANTS
                          </div>
                        )}
                        {filteredUsers.filter(u => u.role === 'team-leader' || u.role === 'Accounts' || u.role === 'Team Leader').map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => handleUserSelect(user)}
                            className="w-full px-3 py-2 text-left hover:bg-muted text-sm"
                          >
                            <div>{user.name}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </button>
                        ))}

                        {/* Staff Section */}
                        {filteredUsers.some(u => u.role === 'team-member' || u.role === 'Staff' || u.role === 'Team Member') && (
                          <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted">
                            STAFF
                          </div>
                        )}
                        {filteredUsers.filter(u => u.role === 'team-member' || u.role === 'Staff' || u.role === 'Team Member').map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => handleUserSelect(user)}
                            className="w-full px-3 py-2 text-left hover:bg-muted text-sm"
                          >
                            <div>{user.name}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Select
              label="Priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              required
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </Select>

            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              required
            >
              {taskStatuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </Select>

            <Input
              label="Task Assignment Date"
              type="date"
              value={formData.taskDate}
              onChange={(e) => setFormData({ ...formData, taskDate: e.target.value })}
              required
            />

            <Input
              label="Expected Completion Date"
              type="date"
              value={formData.completionDate}
              onChange={(e) => setFormData({ ...formData, completionDate: e.target.value })}
              required
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-foreground">Comments (Optional)</label>
              <textarea
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                placeholder="Add any additional comments or instructions..."
                className="px-3 py-2 bg-input-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring min-h-[100px]"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Updating Task...' : 'Update Task'}
              </Button>
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
