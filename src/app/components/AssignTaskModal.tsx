import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { usersAPI, assignmentsAPI } from '../services/api';

interface AssignTaskModalProps {
  onClose: () => void;
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  onSuccess?: () => void;
}

export function AssignTaskModal({ onClose, currentUser, onSuccess }: AssignTaskModalProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    taskName: '',
    clientName: '',
    category: 'Income Tax',
    priority: 'Medium',
    assignedToId: '',
    notes: '',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await usersAPI.getAll();
      // Filter out current user
      const otherUsers = (response.data || []).filter((u: any) => u.id !== currentUser.id);
      setUsers(otherUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.taskName || !formData.assignedToId) {
      alert('Please fill in task name and select a user');
      return;
    }

    setLoading(true);

    try {
      const assignedToUser = users.find(u => u.id === formData.assignedToId);

      const assignmentData = {
        taskName: formData.taskName,
        clientName: formData.clientName,
        category: formData.category,
        priority: formData.priority,
        assignedFromId: currentUser.id,
        assignedFromName: currentUser.name,
        assignedToId: formData.assignedToId,
        assignedToName: assignedToUser?.name || '',
        notes: formData.notes,
      };

      const response = await assignmentsAPI.create(assignmentData);

      if (response.success) {
        alert(`✅ Task assigned to ${assignedToUser?.name}!\n\nThey will receive a notification to accept or reject this assignment.\n\nPartners will be notified about this assignment.`);
        onSuccess?.();
        onClose();
      } else {
        alert(`Failed to assign task: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error assigning task:', error);
      alert('Failed to assign task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
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
    'MCA Work'
  ];

  const priorities = ['Low', 'Medium', 'High', 'Urgent'];

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Assign Task to Team Member</CardTitle>
            <Button
              size="sm"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              ✕
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            The assigned person must accept this task. Partners will be notified.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Task Name */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Task Name <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                value={formData.taskName}
                onChange={(e) => handleChange('taskName', e.target.value)}
                placeholder="e.g., Prepare ITR for ABC Company"
                required
              />
            </div>

            {/* Client Name */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Client Name
              </label>
              <Input
                type="text"
                value={formData.clientName}
                onChange={(e) => handleChange('clientName', e.target.value)}
                placeholder="e.g., ABC Enterprises"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {priorities.map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </div>

            {/* Assign To */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Assign To <span className="text-destructive">*</span>
              </label>
              <select
                value={formData.assignedToId}
                onChange={(e) => handleChange('assignedToId', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
                required
              >
                <option value="">Select a team member...</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role}) - {user.email}
                  </option>
                ))}
              </select>
              {users.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">Loading users...</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Notes / Instructions
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Add any specific instructions or notes..."
                className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring min-h-[100px]"
              />
            </div>

            {/* Info Box */}
            <div className="bg-info/10 border border-info/20 rounded-lg p-4">
              <p className="text-sm">
                <strong>How it works:</strong>
              </p>
              <ul className="text-sm space-y-1 mt-2 list-disc list-inside">
                <li>The selected person will receive this assignment</li>
                <li>They must <strong>Accept</strong> or <strong>Reject</strong> it</li>
                <li>All partners will be notified about this assignment</li>
                <li>You'll be notified when they respond</li>
              </ul>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? 'Assigning...' : '📤 Assign Task'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
