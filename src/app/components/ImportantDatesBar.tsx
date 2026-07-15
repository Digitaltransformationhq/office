import React, { useState, useEffect } from 'react';
import { calendarAPI } from '../services/api';
import { Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_type: string;
  recurring: boolean;
}

export function ImportantDatesBar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUpcomingEvents();
    
    // Auto-rotate every 5 seconds if there are multiple events
    const interval = setInterval(() => {
      if (events.length > 1) {
        setCurrentIndex(prev => (prev + 1) % events.length);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [events.length]);

  const loadUpcomingEvents = async () => {
    try {
      const response = await calendarAPI.getAll();
      if (response.success) {
        const allEvents = response.data || [];
        
        // Filter upcoming events (next 30 days)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const thirtyDaysLater = new Date(today);
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

        const upcomingEvents = allEvents
          .filter((event: CalendarEvent) => {
            const eventDate = new Date(event.event_date);
            return eventDate >= today && eventDate <= thirtyDaysLater;
          })
          .sort((a: CalendarEvent, b: CalendarEvent) => 
            new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
          );

        setEvents(upcomingEvents.slice(0, 5)); // Show max 5 upcoming events
      }
    } catch (error) {
      console.error('Error loading upcoming events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % events.length);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + events.length) % events.length);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'due-date':
        return '⏰';
      case 'birthday':
        return '🎂';
      case 'holiday':
        return '🎉';
      default:
        return '📌';
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
        return 'Update';
    }
  };

  const getDaysUntil = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(dateString);
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    return `on ${eventDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  };

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'due-date':
        return 'bg-destructive/10 border-destructive/30';
      case 'birthday':
        return 'bg-success/10 border-success/30';
      case 'holiday':
        return 'bg-info/10 border-info/30';
      default:
        return 'bg-warning/10 border-warning/30';
    }
  };

  if (loading || events.length === 0 || !isVisible) {
    return null;
  }

  const currentEvent = events[currentIndex];

  return (
    <div
      className={`relative border-b border-l-4 ${getBackgroundColor(currentEvent.event_type)} transition-all duration-300`}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Event Icon and Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="text-2xl flex-shrink-0">
              {getEventIcon(currentEvent.event_type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wide opacity-75">
                  {getEventTypeLabel(currentEvent.event_type)}
                </span>
                <span className="text-xs opacity-60">•</span>
                <span className="text-xs font-medium opacity-75">
                  {getDaysUntil(currentEvent.event_date)}
                </span>
              </div>
              <p className="text-sm font-semibold mt-0.5 truncate">
                {currentEvent.title}
              </p>
              {currentEvent.description && (
                <p className="text-xs opacity-70 truncate hidden sm:block">
                  {currentEvent.description}
                </p>
              )}
            </div>
          </div>

          {/* Right: Navigation and Close */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {events.length > 1 && (
              <>
                <button
                  onClick={handlePrevious}
                  className="p-1 hover:bg-background/50 rounded transition-colors"
                  aria-label="Previous event"
                >
                  <ChevronLeft className="size-4" />
                </button>
                
                <div className="flex gap-1">
                  {events.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`size-1.5 rounded-full transition-all ${
                        idx === currentIndex
                          ? 'bg-foreground w-4'
                          : 'bg-foreground/30 hover:bg-foreground/50'
                      }`}
                      aria-label={`Go to event ${idx + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNext}
                  className="p-1 hover:bg-background/50 rounded transition-colors"
                  aria-label="Next event"
                >
                  <ChevronRight className="size-4" />
                </button>
              </>
            )}

            <button
              onClick={() => setIsVisible(false)}
              className="p-1 hover:bg-background/50 rounded transition-colors ml-2"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
