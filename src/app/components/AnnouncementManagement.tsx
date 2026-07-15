import React, { useState, useEffect } from 'react';
import { KPICard } from './KPICard';
import { announcementsAPI } from '../services/api';
import { useToast } from './Toast';
import { Megaphone, Plus, Pencil, Trash2, Power, PowerOff, X, ChevronDown } from 'lucide-react';

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
  user: { id: string; name: string };
}

const NAVY = '#1b365d';
const inputCls =
  'w-full rounded-lg border border-[#E7EDF4] bg-white px-3.5 py-2.5 text-[0.92rem] text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15';

const TYPE: Record<string, { label: string; color: string; pill: string }> = {
  urgent: { label: 'Urgent', color: '#ef4444', pill: 'bg-[#FDECEC] text-[#c0392b]' },
  warning: { label: 'Warning', color: '#f59e0b', pill: 'bg-[#FEF4E6] text-[#b7791f]' },
  success: { label: 'Success', color: '#4ea72e', pill: 'bg-[rgba(78,167,46,0.12)] text-[#3d8a22]' },
  info: { label: 'Info', color: '#3b82f6', pill: 'bg-blue-100 text-blue-700' },
};
const typeOf = (t: string) => TYPE[t] || TYPE.info;

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin', partner: 'Partner', 'team-leader': 'Accounts', 'team-member': 'Staff', client: 'Client',
};

export function AnnouncementManagement({ user }: AnnouncementManagementProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const { showSuccess, showError } = useToast();

  useEffect(() => { loadAnnouncements(); }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await announcementsAPI.getAll();
      if (response.success) setAnnouncements(response.data || []);
      else showError(response.error || 'Failed to load announcements');
    } catch (error) {
      console.error('Error loading announcements:', error);
      showError('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const response = await announcementsAPI.toggle(id);
      if (response.success) { showSuccess('Announcement status updated!'); loadAnnouncements(); }
      else showError(response.error || 'Failed to toggle announcement');
    } catch (error) {
      console.error('Error toggling announcement:', error);
      showError('Failed to toggle announcement');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      const response = await announcementsAPI.delete(id);
      if (response.success) { showSuccess('Announcement deleted successfully!'); loadAnnouncements(); }
      else showError(response.error || 'Failed to delete announcement');
    } catch (error) {
      console.error('Error deleting announcement:', error);
      showError('Failed to delete announcement');
    }
  };

  const sorted = [...announcements].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const activeCount = announcements.filter(a => a.is_active).length;
  const inactiveCount = announcements.length - activeCount;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}>
            <Megaphone size={22} />
          </span>
          <div>
            <h1 className="text-[1.5rem] font-semibold tracking-tight" style={{ color: NAVY }}>Announcements</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Create and manage messages shown to users</p>
          </div>
        </div>
        <button
          onClick={() => { setEditingAnnouncement(null); setShowAddModal(true); }}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#1b365d] px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_20px_-10px_rgba(27,54,93,0.6)] transition-all hover:bg-[#142a4a]"
        >
          <Plus size={16} /> New Announcement
        </button>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-3 gap-4">
        <KPICard title="Total" value={announcements.length} />
        <KPICard title="Active" value={activeCount} variant="success" />
        <KPICard title="Inactive" value={inactiveCount} />
      </div>

      {/* List */}
      <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
        <div className="flex items-center gap-2.5 border-b border-[#E7EDF4] px-5 py-4">
          <h2 className="text-sm font-semibold" style={{ color: NAVY }}>All Announcements</h2>
          <span className="rounded-full bg-[#F4F6F9] px-2 py-0.5 text-xs font-medium text-muted-foreground">{announcements.length}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F4F6F9] text-muted-foreground">
              <Megaphone size={22} />
            </span>
            <p className="text-sm font-medium" style={{ color: NAVY }}>No announcements yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Create one to get started.</p>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {sorted.map((a) => {
              const t = typeOf(a.type);
              return (
                <div key={a.id} className="rounded-xl border border-[#E7EDF4] p-4" style={{ borderLeft: `3px solid ${t.color}` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-md px-2 py-0.5 text-[0.66rem] font-medium ${t.pill}`}>{t.label}</span>
                        <p className="truncate text-sm font-semibold" style={{ color: NAVY }}>{a.title}</p>
                      </div>
                      <p className="mt-1.5 text-sm text-muted-foreground">{a.message}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <div className="flex items-center gap-1.5">
                        <IconBtn tone={a.is_active ? 'default' : 'green'} title={a.is_active ? 'Deactivate' : 'Activate'} onClick={() => handleToggle(a.id)}>
                          {a.is_active ? <PowerOff size={14} /> : <Power size={14} />}
                        </IconBtn>
                        <IconBtn tone="default" title="Edit" onClick={() => { setEditingAnnouncement(a); setShowAddModal(true); }}>
                          <Pencil size={14} />
                        </IconBtn>
                        <IconBtn tone="red" title="Delete" onClick={() => handleDelete(a.id)}>
                          <Trash2 size={14} />
                        </IconBtn>
                      </div>
                      <span className={`inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[0.66rem] font-medium ${a.is_active ? 'bg-[rgba(78,167,46,0.12)] text-[#3d8a22]' : 'bg-slate-100 text-slate-500'}`}>
                        {a.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[#F1F4F8] pt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="font-medium" style={{ color: NAVY }}>Audience:</span>
                      {a.target_roles.length === 0 ? 'All users' : a.target_roles.map(r => ROLE_LABEL[r] || r).join(', ')}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="font-medium" style={{ color: NAVY }}>Duration:</span>
                      {a.start_date
                        ? `${new Date(a.start_date).toLocaleDateString('en-IN')}${a.end_date ? ` → ${new Date(a.end_date).toLocaleDateString('en-IN')}` : ''}`
                        : 'No limit'}
                    </span>
                    {a.created_by && <span className="sm:ml-auto">by {a.created_by}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {showAddModal && (
        <AddAnnouncementModal
          user={user}
          announcement={editingAnnouncement}
          onClose={() => { setShowAddModal(false); setEditingAnnouncement(null); }}
          onSuccess={() => { loadAnnouncements(); setShowAddModal(false); setEditingAnnouncement(null); }}
        />
      )}
    </div>
  );
}

const TONES: Record<string, string> = {
  default: 'border-[#E7EDF4] text-muted-foreground hover:bg-[#F4F6F9] hover:text-[#1b365d]',
  green: 'border-[#E7EDF4] text-[#3d8a22] hover:bg-[#EEF7E9] hover:border-[#c9e6ba]',
  red: 'border-[#E7EDF4] text-[#c0392b] hover:bg-[#FDECEC] hover:border-[#f3c9c4]',
};
function IconBtn({ children, onClick, title, tone = 'default' }: { children: React.ReactNode; onClick: () => void; title?: string; tone?: keyof typeof TONES }) {
  return (
    <button onClick={onClick} title={title} className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${TONES[tone]}`}>
      {children}
    </button>
  );
}

// ── Add / Edit modal ─────────────────────────────────────────────
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

  const set = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));
  const toggleRole = (role: string) => setFormData(prev => ({
    ...prev,
    targetRoles: prev.targetRoles.includes(role) ? prev.targetRoles.filter(r => r !== role) : [...prev.targetRoles, role],
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.message) { showError('Please fill in all required fields'); return; }
    setLoading(true);
    try {
      const data = {
        title: formData.title, message: formData.message, type: formData.type, isActive: formData.isActive,
        startDate: formData.startDate || null, endDate: formData.endDate || null,
        targetRoles: formData.targetRoles, createdBy: user.name,
      };
      const response = announcement
        ? await announcementsAPI.update(announcement.id, data)
        : await announcementsAPI.create(data);
      if (response.success) { showSuccess(announcement ? 'Announcement updated!' : 'Announcement created!'); onSuccess(); }
      else showError(response.error || `Failed to ${announcement ? 'update' : 'create'} announcement`);
    } catch (error) {
      console.error('Error saving announcement:', error);
      showError('Failed to save announcement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const roles = ['admin', 'partner', 'team-leader', 'team-member', 'client'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1728]/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-[0_40px_120px_-30px_rgba(10,23,40,0.8)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#E7EDF4] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}>
              <Megaphone size={20} />
            </span>
            <div>
              <h2 className="text-[1.05rem] font-semibold" style={{ color: NAVY }}>{announcement ? 'Edit Announcement' : 'New Announcement'}</h2>
              <p className="text-xs text-muted-foreground">Shown in the announcement bar to selected users</p>
            </div>
          </div>
          <button onClick={onClose} disabled={loading} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <Field label="Title" required>
              <input className={inputCls} value={formData.title} onChange={e => set('title', e.target.value)} placeholder="e.g., Important update: ITR filing process" required />
            </Field>

            <Field label="Message" required>
              <textarea className={`${inputCls} min-h-[96px] resize-none`} value={formData.message} onChange={e => set('message', e.target.value)} placeholder="Your announcement message…" required />
            </Field>

            <Field label="Type" required>
              <div className="relative">
                <select value={formData.type} onChange={e => set('type', e.target.value)} className={`${inputCls} appearance-none pr-9`}>
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="urgent">Urgent</option>
                </select>
                <span className="pointer-events-none absolute right-9 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full" style={{ backgroundColor: typeOf(formData.type).color }} />
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </Field>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[#E7EDF4] bg-[#F9FAFB] px-3.5 py-2.5">
              <input type="checkbox" checked={formData.isActive} onChange={e => set('isActive', e.target.checked)} className="h-4 w-4 rounded accent-[#1b365d]" />
              <span className="text-sm font-medium" style={{ color: NAVY }}>Active</span>
              <span className="text-xs text-muted-foreground">— visible to users immediately</span>
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Start date" hint="Optional"><input className={inputCls} type="date" value={formData.startDate || ''} onChange={e => set('startDate', e.target.value)} /></Field>
              <Field label="End date" hint="Optional"><input className={inputCls} type="date" value={formData.endDate || ''} onChange={e => set('endDate', e.target.value)} /></Field>
            </div>

            <Field label="Audience" hint="Leave empty for all users">
              <div className="flex flex-wrap gap-2">
                {roles.map(role => {
                  const on = formData.targetRoles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${on ? 'bg-[#1b365d] text-white' : 'border border-[#E7EDF4] bg-white text-[#1b365d] hover:bg-[#F4F6F9]'}`}
                    >
                      {ROLE_LABEL[role] || role}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>

          <div className="flex gap-3 border-t border-[#E7EDF4] px-6 py-4">
            <button type="button" onClick={onClose} disabled={loading} className="flex-1 rounded-full border border-[#E7EDF4] bg-white px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[#F4F6F9] disabled:opacity-60" style={{ color: NAVY }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 rounded-full bg-[#1b365d] px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_20px_-10px_rgba(27,54,93,0.6)] transition-all hover:bg-[#142a4a] disabled:opacity-60">
              {loading ? 'Saving…' : announcement ? 'Update' : 'Publish'}
            </button>
          </div>
        </form>
      </div>
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
