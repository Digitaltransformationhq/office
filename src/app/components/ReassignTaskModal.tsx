import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { usersAPI, tasksAPI } from '../services/api';
import { X, ChevronDown, Repeat2 } from 'lucide-react';

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
  const [personSearch, setPersonSearch] = useState('');
  const [showPersonDropdown, setShowPersonDropdown] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.person-dropdown-container')) setShowPersonDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

    const confirmMessage = `Reassign this task to ${selectedUser.name}?\n\nTask: ${task.task}\nClient: ${task.client}\n\nThey must accept it before starting.`;

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
        alert(`Task reassigned to ${selectedUser.name}.\n\n${selectedUser.name} must accept it before starting.`);
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

  const NAVY = '#1b365d';
  const fieldCls =
    'w-full rounded-lg border border-[#E7EDF4] bg-white px-3.5 py-2.5 text-[0.92rem] text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15';

  const detail = (label: string, value: string) => (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-medium" style={{ color: NAVY }} title={value}>
        {value || '—'}
      </dd>
    </div>
  );

  const matchedUsers = users.filter((u) =>
    u.name.toLowerCase().includes(personSearch.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(personSearch.toLowerCase()) ||
    // Once someone is picked the box holds their name, which would otherwise
    // filter the list down to just them the next time it opens.
    selectedUserId === u.id
  );

  /** Group the roster so a long list is scannable rather than one flat block. */
  const roleGroups: [string, (u: any) => boolean][] = [
    ['Partners', (u) => ['partner', 'Partner', 'admin', 'Admin'].includes(u.role)],
    ['Accounts', (u) => ['team-leader', 'Accounts', 'Team Leader'].includes(u.role)],
    ['Staff', (u) => ['team-member', 'Staff', 'Team Member'].includes(u.role)],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1728]/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-[0_40px_120px_-30px_rgba(10,23,40,0.8)]">
        {/* Header - fixed */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[#E7EDF4] px-6 py-4">
          <div className="flex items-center gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}
            >
              <Repeat2 size={18} />
            </span>
            <div>
              <h2 className="text-base font-semibold tracking-tight" style={{ color: NAVY }}>
                Reassign Task
              </h2>
              <p className="text-xs text-muted-foreground">Hand this task to someone else</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-[#1b365d] disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body - the only scrolling region */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {/* What is being moved. A definition list rather than bolded label:
              value lines, so the values align instead of starting wherever the
              label happens to end. */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-[#F4F6F9] p-4">
            {detail('Client', task.client)}
            {detail('Task', task.task)}
            {detail('Category', task.category)}
            {detail('Priority', task.priority)}
            {detail('Currently with', task.assignedTo)}
            {detail('Due', task.targetDate
              ? new Date(task.targetDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
              : '')}
          </dl>

          {/*
            A searchable list rather than a native <select>. The native picker is
            drawn by the OS, sized to its longest option and positioned outside
            the page, so on a narrow screen it spilled past the viewport and off
            the right edge — nothing in CSS can constrain it. This list lives
            inside the modal, so it stays within the width it is given, scrolls,
            and matches the pickers in the other task modals.
          */}
          <div className="person-dropdown-container relative">
            <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
              Reassign to <span className="text-[#c0392b]">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={personSearch}
                onChange={(e) => {
                  setPersonSearch(e.target.value);
                  setSelectedUserId('');
                  setShowPersonDropdown(true);
                }}
                onFocus={() => setShowPersonDropdown(true)}
                placeholder="Search or select a person"
                disabled={loading}
                className={fieldCls + ' pr-9'}
              />
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>

            {showPersonDropdown && (
              <div className="absolute z-20 mt-1.5 max-h-56 w-full overflow-y-auto rounded-lg border border-[#E7EDF4] bg-white shadow-[0_20px_50px_-20px_rgba(10,23,40,0.45)]">
                {matchedUsers.length === 0 ? (
                  <div className="p-3 text-center text-sm text-muted-foreground">No people found</div>
                ) : roleGroups.map(([heading, match]) => {
                  const group = matchedUsers.filter(match);
                  if (group.length === 0) return null;
                  return (
                    <div key={heading}>
                      <div className="bg-[#F4F6F9] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {heading}
                      </div>
                      {group.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setSelectedUserId(u.id);
                            setPersonSearch(u.name);
                            setShowPersonDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left transition-colors hover:bg-[#F4F6F9] ${
                            selectedUserId === u.id ? 'bg-[#F4F6F9]' : ''
                          }`}
                        >
                          <div className="text-sm font-medium" style={{ color: NAVY }}>{u.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
              Reason <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why it is moving - added to the task's comments"
              rows={3}
              disabled={loading}
              className={fieldCls + ' resize-none'}
            />
          </div>

          {/* Only claims things that actually happen: the server notifies the
              incoming assignee, the person losing the task, and the approver. */}
          <div className="rounded-xl border border-[#dbe7f5] bg-[#F2F7FD] p-4">
            <p className="text-xs font-semibold" style={{ color: NAVY }}>What happens next</p>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
              <li>The task moves to <strong>Pending Acceptance</strong> until they accept it.</li>
              <li>They can accept or reject it, with a reason.</li>
              <li>Either way you, the approving partner and the admins are told.</li>
            </ul>
          </div>
        </div>

        {/* Footer - always reachable */}
        <div className="flex shrink-0 items-center gap-3 border-t border-[#E7EDF4] px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading} className="flex-1">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleReassign}
            disabled={loading || !selectedUserId}
            className="flex-1"
          >
            {loading ? 'Reassigning...' : 'Reassign Task'}
          </Button>
        </div>
      </div>
    </div>
  );
}
