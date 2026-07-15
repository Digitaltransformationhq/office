import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table';
import { announcementsAPI } from '../services/api';
import { useToast } from './Toast';
import { Megaphone, Plus, Edit, Trash2, Power, PowerOff } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  target_roles: string[];
  created_by: string;
  created_at: string;
}

interface AnnouncementManagementProps {
  user: {
    id: string;
    name: string;
  };
}

export function AnnouncementManagement({ user }: AnnouncementManagementProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await announcementsAPI.getAll();
      if (response.success) {
        setAnnouncements(response.data || []);
      } else {
        showError(response.error || 'Failed to load announcements');
      }
    } catch (error) {
      console.error('Error loading announcements:', error);
      showError('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (announcementId: string) => {
    try {
      const response = await announcementsAPI.toggle(announcementId);
      if (response.success) {
        showSuccess('Announcement status updated!');
        loadAnnouncements();
      } else {
        showError(response.error || 'Failed to toggle announcement');
      }
    } catch (error) {
      console.error('Error toggling announcement:', error);
      showError('Failed to toggle announcement');
    }
  };

  const handleDelete = async (announcementId: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      const response = await announcementsAPI.delete(announcementId);
      if (response.success) {
        showSuccess('Announcement deleted successfully!');
        loadAnnouncements();
      } else {
        showError(response.error || 'Failed to delete announcement');
      }
    } catch (error) {
      console.error('Error deleting announcement:', error);
      showError('Failed to delete announcement');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'urgent':
        return 'destructive';
      case 'warning':
        return 'warning';
      case 'success':
        return 'success';
      default:
        return 'info';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'urgent':
        return 'Urgent';
      case 'warning':
        return 'Warning';
      case 'success':
        return 'Success';
      default:
        return 'Info';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'urgent':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'success':
        return '✅';
      default:
        return 'ℹ️';
    }
  };

  // Sort by created date
  const sortedAnnouncements = [...announcements].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const activeCount = announcements.filter(a => a.is_active).length;
  const inactiveCount = announcements.length - activeCount;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-muted-foreground">Loading announcements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="size-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Announcement Management</h2>
            <p className="text-sm text-muted-foreground">
              Create and manage announcements visible to all users
            </p>
          </div>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="size-4 mr-2" />
          New Announcement
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{announcements.length}</p>
              </div>
              <div className="text-3xl">📢</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-success">{activeCount}</p>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold text-muted-foreground">{inactiveCount}</p>
              </div>
              <div className="text-3xl">⏸️</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Announcements Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Announcements</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Target Roles</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAnnouncements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No announcements yet. Create one to get started!
                  </TableCell>
                </TableRow>
              ) : (
                sortedAnnouncements.map((announcement) => (
                  <TableRow key={announcement.id}>
                    <TableCell>
                      {announcement.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{getTypeIcon(announcement.type)}</span>
                        <Badge variant={getTypeColor(announcement.type)}>
                          {getTypeLabel(announcement.type)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold max-w-xs">
                      {announcement.title}
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {announcement.message}
                    </TableCell>
                    <TableCell>
                      {announcement.target_roles.length === 0 ? (
                        <Badge variant="info">All Users</Badge>
                      ) : (
                        <div className="flex gap-1 flex-wrap">
                          {announcement.target_roles.map((role, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {announcement.start_date ? (
                        <div>
                          <div>From: {new Date(announcement.start_date).toLocaleDateString()}</div>
                          {announcement.end_date && (
                            <div>To: {new Date(announcement.end_date).toLocaleDateString()}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No limit</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={announcement.is_active ? 'secondary' : 'success'}
                          onClick={() => handleToggle(announcement.id)}
                          title={announcement.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {announcement.is_active ? (
                            <PowerOff className="size-3" />
                          ) : (
                            <Power className="size-3" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingAnnouncement(announcement);
                            setShowAddModal(true);
                          }}
                        >
                          <Edit className="size-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(announcement.id)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <AddAnnouncementModal
          user={user}
          announcement={editingAnnouncement}
          onClose={() => {
            setShowAddModal(false);
            setEditingAnnouncement(null);
          }}
          onSuccess={() => {
            loadAnnouncements();
            setShowAddModal(false);
            setEditingAnnouncement(null);
          }}
        />
      )}
    </div>
  );
}

// Add Announcement Modal Component
interface AddAnnouncementModalProps {
  user: { id: string; name: string };
  announcement: Announcement | null;
  onClose: () => void;
  onSuccess: () => void;
}

function AddAnnouncementModal({ user, announcement, onClose, onSuccess }: AddAnnouncementModalProps) {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    title: announcement?.title || '',
    message: announcement?.message || '',
    type: announcement?.type || 'info',
    isActive: announcement?.is_active !== undefined ? announcement.is_active : true,
    startDate: announcement?.start_date || '',
    endDate: announcement?.end_date || '',
    targetRoles: announcement?.target_roles || [],
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRoleToggle = (role: string) => {
    setFormData(prev => {
      const newRoles = prev.targetRoles.includes(role)
        ? prev.targetRoles.filter(r => r !== role)
        : [...prev.targetRoles, role];
      return { ...prev, targetRoles: newRoles };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.message) {
      showError('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const announcementData = {
        title: formData.title,
        message: formData.message,
        type: formData.type,
        isActive: formData.isActive,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        targetRoles: formData.targetRoles,
        createdBy: user.name,
      };

      const response = announcement
        ? await announcementsAPI.update(announcement.id, announcementData)
        : await announcementsAPI.create(announcementData);

      if (response.success) {
        showSuccess(announcement ? 'Announcement updated!' : 'Announcement created!');
        onSuccess();
      } else {
        showError(response.error || `Failed to ${announcement ? 'update' : 'create'} announcement`);
      }
    } catch (error) {
      console.error('Error saving announcement:', error);
      showError('Failed to save announcement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const roles = ['admin', 'partner', 'team-leader', 'team-member', 'client'];

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{announcement ? 'Edit Announcement' : 'New Announcement'}</CardTitle>
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Title <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g., Important Update: ITR Filing Process"
                className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Message <span className="text-destructive">*</span>
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => handleChange('message', e.target.value)}
                placeholder="Your announcement message here..."
                rows={4}
                className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Type <span className="text-destructive">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="info">ℹ️ Info</option>
                <option value="success">✅ Success</option>
                <option value="warning">⚠️ Warning</option>
                <option value="urgent">🚨 Urgent</option>
              </select>
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                className="size-4 rounded border-border"
              />
              <label htmlFor="isActive" className="text-sm font-medium">
                Active (visible to users immediately)
              </label>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Start Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Target Roles */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Target Roles (Leave empty for all users)
              </label>
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleToggle(role)}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      formData.targetRoles.includes(role)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
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
                {loading ? 'Saving...' : announcement ? 'Update' : 'Create Announcement'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
