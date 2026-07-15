import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { usersAPI, tasksAPI } from '../services/api';

interface ReassignTaskModalProps {
  task: any;
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function ReassignTaskModal({ task, currentUser, onClose, onSuccess }: ReassignTaskModalProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [notes, setNotes] = useState('');

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

  const handleReassign = async () => {
    if (!selectedUserId) {
      alert('Please select a user to reassign this task to');
      return;
    }

    const selectedUser = users.find(u => u.id === selectedUserId);
    if (!selectedUser) {
      alert('Selected user not found');
      return;
    }

    const confirmMessage = `Reassign this task to ${selectedUser.name}?\n\nTask: ${task.task}\nClient: ${task.client}\n\nThe new assignee must accept this task.\nThe partner who originally assigned this will be notified.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setLoading(true);

    try {
      // Prepare reassignment data
      const reassignmentData: any = {
        assignedTo: selectedUser.name,
        assignedToId: selectedUser.id,
        reassignedFromId: currentUser.id,
        reassignedFromName: currentUser.name,
        assignmentStatus: 'Pending Acceptance',
        reassignedAt: new Date().toISOString(),
      };

      // Set original assigner if not already set
      if (!task.originallyAssignedById) {
        reassignmentData.originallyAssignedById = task.assignedToId;
        reassignmentData.originallyAssignedByName = task.assignedTo;
      }

      // Add notes if provided
      if (notes) {
        reassignmentData.comments = (task.comments || '') + `\n[Reassigned by ${currentUser.name}]: ${notes}`;
      }

      const response = await tasksAPI.update(task.id, reassignmentData);

      if (response.success) {
        alert(`✅ Task reassigned to ${selectedUser.name}!\n\n• ${selectedUser.name} must accept the task\n• Partners have been notified\n• Original assigner has been notified`);
        onSuccess();
        onClose();
      } else {
        alert(`Failed to reassign task: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error reassigning task:', error);
      alert('Failed to reassign task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Reassign Task</CardTitle>
            <Button
              size="sm"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Task Details */}
          <div className="bg-muted/50 rounded-lg p-4 mb-4">
            <h3 className="font-semibold mb-2">Task Details:</h3>
            <div className="space-y-1 text-sm">
              <p><strong>Client:</strong> {task.client}</p>
              <p><strong>Task:</strong> {task.task}</p>
              <p><strong>Category:</strong> {task.category}</p>
              <p><strong>Priority:</strong> {task.priority}</p>
              <p><strong>Currently Assigned To:</strong> {task.assignedTo}</p>
              {task.targetDate && (
                <p><strong>Target Date:</strong> {new Date(task.targetDate).toLocaleDateString('en-IN')}</p>
              )}
            </div>
          </div>

          {/* Reassign To */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Reassign To <span className="text-destructive">*</span>
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={loading}
            >
              <option value="">Select a team member...</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role}) - {user.email}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Reason for Reassignment (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Need help with this task, or person has specific expertise..."
              className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
              disabled={loading}
            />
          </div>

          {/* Info Box */}
          <div className="bg-info/10 border border-info/20 rounded-lg p-4 mb-4">
            <p className="text-sm font-semibold mb-2">What happens next:</p>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>The selected person will receive this task with "Pending Acceptance" status</li>
              <li>They must <strong>Accept</strong> or <strong>Reject</strong> the task</li>
              <li>The partner who originally assigned this task will be notified</li>
              <li>All partners will be notified about the reassignment</li>
            </ul>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReassign}
              disabled={loading || !selectedUserId}
            >
              {loading ? 'Reassigning...' : '📤 Reassign Task'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
