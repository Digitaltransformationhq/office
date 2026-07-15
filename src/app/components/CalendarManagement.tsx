import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table';
import { calendarAPI } from '../services/api';
import { useToast } from './Toast';
import { Calendar, Trash2, Edit, Plus } from 'lucide-react';

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
  user: {
    id: string;
    name: string;
  };
}

export function CalendarManagement({ user }: CalendarManagementProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await calendarAPI.getAll();
      if (response.success) {
        setEvents(response.data || []);
      } else {
        showError(response.error || 'Failed to load calendar events');
      }
    } catch (error) {
      console.error('Error loading events:', error);
      showError('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      const response = await calendarAPI.delete(eventId);
      if (response.success) {
        showSuccess('Event deleted successfully!');
        loadEvents();
      } else {
        showError(response.error || 'Failed to delete event');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      showError('Failed to delete event');
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'due-date':
        return 'destructive';
      case 'birthday':
        return 'success';
      case 'holiday':
        return 'info';
      default:
        return 'warning';
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'due-date':
        return 'Due Date';
      case 'birthday':
        return 'Birthday';
      case 'holiday':
        return 'Holiday';
      default:
        return 'Other';
    }
  };

  // Sort events by date
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  );

  // Separate upcoming and past events
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const upcomingEvents = sortedEvents.filter(event => 
    new Date(event.event_date) >= today
  );
  
  const pastEvents = sortedEvents.filter(event => 
    new Date(event.event_date) < today
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-muted-foreground">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="size-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Calendar Management</h2>
            <p className="text-sm text-muted-foreground">
              Manage important dates, birthdays, holidays, and due dates
            </p>
          </div>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="size-4 mr-2" />
          Add Event
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold">{upcomingEvents.length}</p>
              </div>
              <div className="text-3xl">📅</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Birthdays</p>
                <p className="text-2xl font-bold">
                  {events.filter(e => e.event_type === 'birthday').length}
                </p>
              </div>
              <div className="text-3xl">🎂</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Holidays</p>
                <p className="text-2xl font-bold">
                  {events.filter(e => e.event_type === 'holiday').length}
                </p>
              </div>
              <div className="text-3xl">🎉</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Due Dates</p>
                <p className="text-2xl font-bold">
                  {events.filter(e => e.event_type === 'due-date').length}
                </p>
              </div>
              <div className="text-3xl">⏰</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Recurring</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No upcoming events. Add one to get started!
                  </TableCell>
                </TableRow>
              ) : (
                upcomingEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">
                      {new Date(event.event_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </TableCell>
                    <TableCell className="font-semibold">{event.title}</TableCell>
                    <TableCell className="max-w-xs truncate">{event.description}</TableCell>
                    <TableCell>
                      <Badge variant={getEventTypeColor(event.event_type)}>
                        {getEventTypeLabel(event.event_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {event.recurring ? (
                        <Badge variant="info">Yes</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingEvent(event);
                            setShowAddModal(true);
                          }}
                        >
                          <Edit className="size-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(event.id)}
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

      {/* Past Events (Collapsed by default) */}
      {pastEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Past Events ({pastEvents.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pastEvents.slice(0, 10).map((event) => (
                  <TableRow key={event.id} className="opacity-60">
                    <TableCell>
                      {new Date(event.event_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </TableCell>
                    <TableCell>{event.title}</TableCell>
                    <TableCell>
                      <Badge variant={getEventTypeColor(event.event_type)}>
                        {getEventTypeLabel(event.event_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(event.id)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Event Modal */}
      {showAddModal && (
        <AddEventModal
          user={user}
          event={editingEvent}
          onClose={() => {
            setShowAddModal(false);
            setEditingEvent(null);
          }}
          onSuccess={() => {
            loadEvents();
            setShowAddModal(false);
            setEditingEvent(null);
          }}
        />
      )}
    </div>
  );
}

// Add Event Modal Component
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

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.eventDate) {
      showError('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const eventData = {
        title: formData.title,
        description: formData.description,
        eventDate: formData.eventDate,
        eventType: formData.eventType,
        recurring: formData.recurring,
        createdBy: user.name,
      };

      const response = event
        ? await calendarAPI.update(event.id, eventData)
        : await calendarAPI.create(eventData);

      if (response.success) {
        showSuccess(event ? 'Event updated successfully!' : 'Event created successfully!');
        onSuccess();
      } else {
        showError(response.error || `Failed to ${event ? 'update' : 'create'} event`);
      }
    } catch (error) {
      console.error('Error saving event:', error);
      showError('Failed to save event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{event ? 'Edit Event' : 'Add New Event'}</CardTitle>
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
                Event Title <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g., ITR Filing Deadline"
                className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            {/* Event Type */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Event Type <span className="text-destructive">*</span>
              </label>
              <select
                value={formData.eventType}
                onChange={(e) => handleChange('eventType', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="due-date">⏰ Due Date</option>
                <option value="birthday">🎂 Birthday</option>
                <option value="holiday">🎉 Holiday</option>
                <option value="other">📌 Other</option>
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Event Date <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                value={formData.eventDate}
                onChange={(e) => handleChange('eventDate', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Additional details about this event..."
                rows={3}
                className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Recurring */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="recurring"
                checked={formData.recurring}
                onChange={(e) => handleChange('recurring', e.target.checked)}
                className="size-4 rounded border-border"
              />
              <label htmlFor="recurring" className="text-sm font-medium">
                Recurring Event (Annual)
              </label>
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
                {loading ? 'Saving...' : event ? 'Update Event' : 'Add Event'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
