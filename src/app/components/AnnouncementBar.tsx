import React, { useState, useEffect } from 'react';
import { announcementsAPI } from '../services/api';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  target_roles: string[];
}

interface AnnouncementBarProps {
  userRole: string;
}

export function AnnouncementBar({ userRole }: AnnouncementBarProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveAnnouncements();
    
    // Auto-rotate every 8 seconds if there are multiple announcements
    const interval = setInterval(() => {
      if (announcements.length > 1) {
        setCurrentIndex(prev => (prev + 1) % announcements.length);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [announcements.length]);

  const loadActiveAnnouncements = async () => {
    try {
      const response = await announcementsAPI.getActive();
      if (response.success) {
        const allActive = response.data || [];
        
        // Filter by target roles
        const relevantAnnouncements = allActive.filter((ann: Announcement) => {
          // If no target roles specified, show to everyone
          if (ann.target_roles.length === 0) return true;
          
          // Otherwise, check if user's role is in the target roles
          return ann.target_roles.includes(userRole);
        });

        setAnnouncements(relevantAnnouncements);
      }
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'urgent':
        return 'Urgent';
      case 'warning':
        return 'Warning';
      case 'success':
        return 'Update';
      default:
        return 'Info';
    }
  };

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'urgent':
        return 'bg-destructive/15 border-destructive/40';
      case 'warning':
        return 'bg-warning/15 border-warning/40';
      case 'success':
        return 'bg-success/15 border-success/40';
      default:
        return 'bg-info/15 border-info/40';
    }
  };

  if (loading || announcements.length === 0 || !isVisible) {
    return null;
  }

  const currentAnnouncement = announcements[currentIndex];

  return (
    <div
      className={`relative border-b border-l-4 ${getBackgroundColor(currentAnnouncement.type)} transition-all duration-300`}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Announcement Icon and Content */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="text-2xl flex-shrink-0 mt-0.5">
              {getTypeIcon(currentAnnouncement.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-bold uppercase tracking-wide opacity-75">
                  {getTypeLabel(currentAnnouncement.type)}
                </span>
              </div>
              <h3 className="text-sm font-bold mb-1">
                {currentAnnouncement.title}
              </h3>
              <p className="text-sm opacity-90 line-clamp-2">
                {currentAnnouncement.message}
              </p>
            </div>
          </div>

          {/* Right: Navigation and Close */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {announcements.length > 1 && (
              <>
                <button
                  onClick={handlePrevious}
                  className="p-1 hover:bg-background/50 rounded transition-colors"
                  aria-label="Previous announcement"
                >
                  <ChevronLeft className="size-4" />
                </button>
                
                <div className="flex gap-1">
                  {announcements.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`size-1.5 rounded-full transition-all ${
                        idx === currentIndex
                          ? 'bg-foreground w-4'
                          : 'bg-foreground/30 hover:bg-foreground/50'
                      }`}
                      aria-label={`Go to announcement ${idx + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNext}
                  className="p-1 hover:bg-background/50 rounded transition-colors"
                  aria-label="Next announcement"
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
