import React, { useState, useEffect } from 'react';
import { KPICard } from './KPICard';
import { calendarAPI } from '../services/api';
import { useToast } from './Toast';
import { Calendar, Plus, Pencil, Trash2, X, ChevronDown, Repeat } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_type: string;
  recurring: boolean;
  created_by: string;
  created_at: string;
}

interface CalendarManagementProps {
  user: { id: string; name: string };
}

const NAVY = '#1b365d';
const inputCls =
  'w-full rounded-lg border border-[#E7EDF4] bg-white px-3.5 py-2.5 text-[0.92rem] text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-[#1b365d] focus:ring-2 focus:ring-[#1b365d]/15';

const TYPE: Record<string, { label: string; color: string; pill: string }> = {
  'due-date': { label: 'Due Date', color: '#ef4444', pill: 'bg-[#FDECEC] text-[#c0392b]' },
  'birthday': { label: 'Birthday', color: '#4ea72e', pill: 'bg-[rgba(78,167,46,0.12)] text-[#3d8a22]' },
  'holiday': { label: 'Holiday', color: '#3b82f6', pill: 'bg-blue-100 text-blue-700' },
  'other': { label: 'Other', color: '#f59e0b', pill: 'bg-[#FEF4E6] text-[#b7791f]' },
};
const typeOf = (t: string) => TYPE[t] || TYPE.other;

export function CalendarManagement({ user }: CalendarManagementProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const { showSuccess, showError } = useToast();

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await calendarAPI.getAll();
      if (response.success) setEvents(response.data || []);
      else showError(response.error || 'Failed to load calendar events');
    } catch (error) {
      console.error('Error loading events:', error);
      showError('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      const response = await calendarAPI.delete(eventId);
      if (response.success) { showSuccess('Event deleted successfully!'); loadEvents(); }
      else showError(response.error || 'Failed to delete event');
    } catch (error) {
      console.error('Error deleting event:', error);
      showError('Failed to delete event');
    }
  };

  const sorted = [...events].sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = sorted.filter(e => new Date(e.event_date) >= today);
  const past = sorted.filter(e => new Date(e.event_date) < today).reverse();
  const countType = (t: string) => events.filter(e => e.event_type === t).length;

  const editEvent = (e: CalendarEvent) => { setEditingEvent(e); setShowAddModal(true); };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}>
            <Calendar size={22} />
          </span>
          <div>
            <h1 className="text-[1.5rem] font-semibold tracking-tight" style={{ color: NAVY }}>Calendar</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Important dates, birthdays, holidays and due dates</p>
          </div>
        </div>
        <button
          onClick={() => { setEditingEvent(null); setShowAddModal(true); }}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#1b365d] px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_20px_-10px_rgba(27,54,93,0.6)] transition-all hover:bg-[#142a4a]"
        >
          <Plus size={16} /> Add Event
        </button>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard title="Upcoming" value={upcoming.length} />
        <KPICard title="Birthdays" value={countType('birthday')} variant="success" />
        <KPICard title="Holidays" value={countType('holiday')} />
        <KPICard title="Due Dates" value={countType('due-date')} variant="danger" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b365d] border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Upcoming */}
          <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
            <div className="flex items-center gap-2.5 border-b border-[#E7EDF4] px-5 py-4">
              <h2 className="text-sm font-semibold" style={{ color: NAVY }}>Upcoming Events</h2>
              <span className="rounded-full bg-[#F4F6F9] px-2 py-0.5 text-xs font-medium text-muted-foreground">{upcoming.length}</span>
            </div>
            {upcoming.length === 0 ? (
              <div className="flex flex-col items-center py-14 text-center">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F4F6F9] text-muted-foreground"><Calendar size={22} /></span>
                <p className="text-sm font-medium" style={{ color: NAVY }}>No upcoming events</p>
                <p className="mt-1 text-xs text-muted-foreground">Add one to get started.</p>
              </div>
            ) : (
              <div className="space-y-3 p-4">
                {upcoming.map(e => <EventCard key={e.id} event={e} onEdit={() => editEvent(e)} onDelete={() => handleDelete(e.id)} />)}
              </div>
            )}
          </section>

          {/* Past */}
          {past.length > 0 && (
            <section className="overflow-hidden rounded-xl border border-[#E7EDF4] bg-white">
              <div className="flex items-center gap-2.5 border-b border-[#E7EDF4] px-5 py-4">
                <h2 className="text-sm font-semibold" style={{ color: NAVY }}>Past Events</h2>
                <span className="rounded-full bg-[#F4F6F9] px-2 py-0.5 text-xs font-medium text-muted-foreground">{past.length}</span>
              </div>
              <div className="space-y-3 p-4 opacity-70">
                {past.slice(0, 10).map(e => <EventCard key={e.id} event={e} onDelete={() => handleDelete(e.id)} />)}
              </div>
            </section>
          )}
        </>
      )}

      {showAddModal && (
        <AddEventModal
          user={user}
          event={editingEvent}
          onClose={() => { setShowAddModal(false); setEditingEvent(null); }}
          onSuccess={() => { loadEvents(); setShowAddModal(false); setEditingEvent(null); }}
        />
      )}
    </div>
  );
}

function EventCard({ event, onEdit, onDelete }: { event: CalendarEvent; onEdit?: () => void; onDelete: () => void }) {
  const t = typeOf(event.event_type);
  const d = new Date(event.event_date);
  return (
    <div className="flex items-start gap-3.5 rounded-xl border border-[#E7EDF4] p-4" style={{ borderLeft: `3px solid ${t.color}` }}>
      <div className="flex w-14 shrink-0 flex-col items-center rounded-lg border border-[#E7EDF4] bg-[#F9FAFB] py-2">
        <span className="text-lg font-semibold leading-none" style={{ color: NAVY }}>{d.getDate()}</span>
        <span className="mt-1 text-[0.58rem] font-semibold uppercase tracking-wider text-muted-foreground">{d.toLocaleDateString('en-IN', { month: 'short' })}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-md px-2 py-0.5 text-[0.66rem] font-medium ${t.pill}`}>{t.label}</span>
          {event.recurring && (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#F4F6F9] px-2 py-0.5 text-[0.62rem] font-medium text-muted-foreground">
              <Repeat size={11} /> Annual
            </span>
          )}
          <span className="text-xs text-muted-foreground">{d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
        <p className="mt-1 text-sm font-semibold" style={{ color: NAVY }}>{event.title}</p>
        {event.description && <p className="mt-0.5 text-sm text-muted-foreground">{event.description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {onEdit && (
          <button onClick={onEdit} title="Edit" className="flex h-8 w-8 items-center justify-center rounded-md border border-[#E7EDF4] text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-[#1b365d]">
            <Pencil size={14} />
          </button>
        )}
        <button onClick={onDelete} title="Delete" className="flex h-8 w-8 items-center justify-center rounded-md border border-[#E7EDF4] text-[#c0392b] transition-colors hover:border-[#f3c9c4] hover:bg-[#FDECEC]">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Add / Edit modal ─────────────────────────────────────────────
interface AddEventModalProps {
  user: { id: string; name: string };
  event: CalendarEvent | null;
  onClose: () => void;
  onSuccess: () => void;
}

function AddEventModal({ user, event, onClose, onSuccess }: AddEventModalProps) {
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    eventDate: event?.event_date || '',
    eventType: event?.event_type || 'other',
    recurring: event?.recurring || false,
  });

  const set = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.eventDate) { showError('Please fill in all required fields'); return; }
    setLoading(true);
    try {
      const data = { title: formData.title, description: formData.description, eventDate: formData.eventDate, eventType: formData.eventType, recurring: formData.recurring, createdBy: user.name };
      const response = event ? await calendarAPI.update(event.id, data) : await calendarAPI.create(data);
      if (response.success) { showSuccess(event ? 'Event updated successfully!' : 'Event created successfully!'); onSuccess(); }
      else showError(response.error || `Failed to ${event ? 'update' : 'create'} event`);
    } catch (error) {
      console.error('Error saving event:', error);
      showError('Failed to save event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1728]/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-[0_40px_120px_-30px_rgba(10,23,40,0.8)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#E7EDF4] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(27,54,93,0.08)', color: NAVY }}>
              <Calendar size={20} />
            </span>
            <div>
              <h2 className="text-[1.05rem] font-semibold" style={{ color: NAVY }}>{event ? 'Edit Event' : 'Add Event'}</h2>
              <p className="text-xs text-muted-foreground">A date shown in the calendar and dates bar</p>
            </div>
          </div>
          <button onClick={onClose} disabled={loading} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#F4F6F9] hover:text-foreground" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <Field label="Event title" required>
              <input className={inputCls} value={formData.title} onChange={e => set('title', e.target.value)} placeholder="e.g., ITR filing deadline" required />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Type" required>
                <div className="relative">
                  <select value={formData.eventType} onChange={e => set('eventType', e.target.value)} className={`${inputCls} appearance-none pr-9`}>
                    <option value="due-date">Due Date</option>
                    <option value="birthday">Birthday</option>
                    <option value="holiday">Holiday</option>
                    <option value="other">Other</option>
                  </select>
                  <span className="pointer-events-none absolute right-9 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full" style={{ backgroundColor: typeOf(formData.eventType).color }} />
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </Field>
              <Field label="Date" required>
                <input className={inputCls} type="date" value={formData.eventDate} onChange={e => set('eventDate', e.target.value)} required />
              </Field>
            </div>

            <Field label="Description" hint="Optional">
              <textarea className={`${inputCls} min-h-[88px] resize-none`} value={formData.description} onChange={e => set('description', e.target.value)} placeholder="Additional details…" />
            </Field>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[#E7EDF4] bg-[#F9FAFB] px-3.5 py-2.5">
              <input type="checkbox" checked={formData.recurring} onChange={e => set('recurring', e.target.checked)} className="h-4 w-4 rounded accent-[#1b365d]" />
              <span className="text-sm font-medium" style={{ color: NAVY }}>Recurring</span>
              <span className="text-xs text-muted-foreground">— repeats every year</span>
            </label>
          </div>

          <div className="flex gap-3 border-t border-[#E7EDF4] px-6 py-4">
            <button type="button" onClick={onClose} disabled={loading} className="flex-1 rounded-full border border-[#E7EDF4] bg-white px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[#F4F6F9] disabled:opacity-60" style={{ color: NAVY }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 rounded-full bg-[#1b365d] px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_20px_-10px_rgba(27,54,93,0.6)] transition-all hover:bg-[#142a4a] disabled:opacity-60">
              {loading ? 'Saving…' : event ? 'Update' : 'Add Event'}
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
