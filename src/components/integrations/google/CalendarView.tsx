'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
  Video,
  X,
  Edit3,
  Trash2,
  Copy
} from 'lucide-react';
import { EventForm } from './EventForm';

interface CalendarViewProps {
  walletAddress: string;
  data: any;
}

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  attendees?: string[];
  status?: string;
  colorId?: string;
}

type ViewMode = 'day' | 'week' | 'month' | 'schedule';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 80; // 80px per hour (h-20 = 5rem = 80px)

// Google Calendar event colors
const EVENT_COLORS: Record<string, string> = {
  '1': 'bg-blue-400',    // Lavender
  '2': 'bg-green-500',   // Sage
  '3': 'bg-purple-500',  // Grape
  '4': 'bg-pink-500',    // Flamingo
  '5': 'bg-yellow-500',  // Banana
  '6': 'bg-orange-500',  // Tangerine
  '7': 'bg-cyan-500',    // Peacock
  '8': 'bg-gray-500',    // Graphite
  '9': 'bg-blue-600',    // Blueberry
  '10': 'bg-green-600',  // Basil
  '11': 'bg-red-500',    // Tomato
  default: 'bg-blue-500'
};

export function CalendarView({ walletAddress, data }: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch events from live Calendar API
  const fetchEventsFromAPI = useCallback(async () => {
    if (!walletAddress) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/google/events?wallet_address=${walletAddress}&max_results=100`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.status}`);
      }

      const result = await response.json();
      const eventsData = result.events || [];

      // Parse events from API response
      const parsedEvents = eventsData.map((event: any) => ({
        id: event.id || `event-${Math.random().toString(36).substr(2, 9)}`,
        summary: event.summary || '(No Title)',
        description: event.description || '',
        start: event.start || new Date().toISOString(),
        end: event.end || new Date().toISOString(),
        location: event.location || '',
        attendees: event.attendees || [],
        status: event.status || 'confirmed',
        colorId: event.colorId
      }));

      setEvents(parsedEvents);
    } catch (error) {
      console.error('Failed to fetch events from API:', error);
      // Fall back to data prop if API fails
      if (data?.events) {
        const parsedEvents = data.events.map((event: any) => ({
          id: event.id || `event-${Math.random().toString(36).substr(2, 9)}`,
          summary: event.summary || '(No Title)',
          description: event.description || '',
          start: event.start || new Date().toISOString(),
          end: event.end || new Date().toISOString(),
          location: event.location || '',
          attendees: event.attendees || [],
          status: event.status || 'confirmed',
          colorId: event.colorId
        }));
        setEvents(parsedEvents);
      } else {
        setEvents([]);
      }
    } finally {
      setLoading(false);
    }
  }, [walletAddress, data]);

  // Fetch events on mount and when wallet changes
  useEffect(() => {
    fetchEventsFromAPI();
  }, [fetchEventsFromAPI]);

  const loadEvents = async () => {
    setLoading(true);
    await fetchEventsFromAPI();
    setLoading(false);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/google/events/${eventId}?wallet_address=${walletAddress}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setEvents(events.filter(e => e.id !== eventId));
        setShowEventDetail(false);
        setSelectedEvent(null);
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
      alert('Failed to delete event');
    }
  };

  const handleDuplicateEvent = async (event: CalendarEvent) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/google/events`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet_address: walletAddress,
            summary: `${event.summary} (Copy)`,
            description: event.description,
            start: event.start,
            end: event.end,
            location: event.location,
            attendees: event.attendees
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        setEvents([...events, {
          id: data.id || `event-${Date.now()}`,
          summary: `${event.summary} (Copy)`,
          description: event.description,
          start: event.start,
          end: event.end,
          location: event.location,
          attendees: event.attendees,
          status: 'confirmed'
        }]);
        setShowEventDetail(false);
        setSelectedEvent(null);
      } else {
        alert('Failed to duplicate event');
      }
    } catch (error) {
      console.error('Failed to duplicate event:', error);
      alert('Failed to duplicate event');
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getWeekDays = () => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Helper: Calculate event position based on actual time
  const getEventPosition = (event: CalendarEvent) => {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    const startHour = startDate.getHours() + startDate.getMinutes() / 60;
    const endHour = endDate.getHours() + endDate.getMinutes() / 60;
    const duration = endHour - startHour;

    return {
      top: startHour * HOUR_HEIGHT,
      height: Math.max(duration * HOUR_HEIGHT, 24) // Minimum 24px height for visibility
    };
  };

  // Helper: Get events for a specific day
  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.getFullYear() === date.getFullYear() &&
             eventDate.getMonth() === date.getMonth() &&
             eventDate.getDate() === date.getDate();
    });
  };

  // Helper: Check if an event is on the current day (for day view)
  const isEventOnCurrentDay = (event: CalendarEvent) => {
    const eventDate = new Date(event.start);
    return eventDate.getFullYear() === currentDate.getFullYear() &&
           eventDate.getMonth() === currentDate.getMonth() &&
           eventDate.getDate() === currentDate.getDate();
  };

  // Helper: Get event color
  const getEventColor = (colorId?: string) => {
    return EVENT_COLORS[colorId || 'default'] || EVENT_COLORS.default;
  };

  // Helper: Get current time position for red line indicator
  const getCurrentTimePosition = () => {
    const now = new Date();
    const hours = now.getHours() + now.getMinutes() / 60;
    return hours * HOUR_HEIGHT;
  };

  // Check if current date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate();
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDay(currentDate);
    const showCurrentTime = isToday(currentDate);

    return (
      <div className="flex-1 overflow-auto">
        {/* Day header */}
        <div className="grid grid-cols-[60px_1fr] border-b bg-gray-50">
          <div className="p-2" />
          <div className="p-2 text-center">
            <div className="text-xs text-gray-600">{DAYS[currentDate.getDay()]}</div>
            <div className={`text-2xl font-semibold ${isToday(currentDate) ? 'bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center mx-auto' : 'text-gray-900'}`}>
              {currentDate.getDate()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[60px_1fr]">
          {/* Time column */}
          <div className="border-r bg-gray-50">
            {HOURS.map((hour) => (
              <div key={hour} className="h-20 border-b px-2 py-1 text-xs text-gray-500">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
            ))}
          </div>

          {/* Events column */}
          <div className="relative">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-20 border-b border-l hover:bg-blue-50/50 cursor-pointer"
                onClick={() => {
                  // Click to create event at this hour
                  const newDate = new Date(currentDate);
                  newDate.setHours(hour, 0, 0, 0);
                  setShowEventForm(true);
                }}
              />
            ))}

            {/* Current time indicator (red line) */}
            {showCurrentTime && (
              <div
                className="absolute left-0 right-0 flex items-center z-20 pointer-events-none"
                style={{ top: `${getCurrentTimePosition()}px` }}
              >
                <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5" />
                <div className="flex-1 h-0.5 bg-red-500" />
              </div>
            )}

            {/* Events overlay - positioned by actual time */}
            {dayEvents.map((event) => {
              const position = getEventPosition(event);
              const eventColor = getEventColor(event.colorId);
              return (
                <div
                  key={event.id}
                  className={`absolute left-1 right-1 ${eventColor} text-white rounded-lg px-3 py-2 cursor-pointer hover:brightness-90 shadow-sm transition-all z-10`}
                  style={{
                    top: `${position.top}px`,
                    height: `${position.height}px`
                  }}
                  onClick={() => {
                    setSelectedEvent(event);
                    setShowEventDetail(true);
                  }}
                >
                  <p className="font-semibold text-sm truncate">{event.summary}</p>
                  <p className="text-xs opacity-90 truncate">
                    {new Date(event.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    {event.location && ` - ${event.location}`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays();

    return (
      <div className="flex-1 overflow-auto">
        {/* Header row */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] sticky top-0 z-30 bg-white">
          <div className="border-b border-r bg-gray-50" />
          {weekDays.map((day, index) => (
            <div key={index} className="border-b border-r bg-gray-50 p-2 text-center">
              <div className="text-xs text-gray-600">{DAYS[day.getDay()]}</div>
              <div className={`text-lg font-semibold ${
                isToday(day)
                  ? 'bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto'
                  : 'text-gray-900'
              }`}>
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Time grid with events */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {/* Time column */}
          <div className="border-r bg-gray-50">
            {HOURS.map((hour) => (
              <div key={hour} className="h-20 border-b px-2 py-1 text-xs text-gray-500">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
            ))}
          </div>

          {/* Day columns with events */}
          {weekDays.map((day, dayIndex) => {
            const dayEvents = getEventsForDay(day);
            const showCurrentTime = isToday(day);

            return (
              <div key={dayIndex} className="relative border-r">
                {/* Hour cells */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="h-20 border-b hover:bg-blue-50/50 cursor-pointer"
                    onClick={() => {
                      const newDate = new Date(day);
                      newDate.setHours(hour, 0, 0, 0);
                      setCurrentDate(newDate);
                      setShowEventForm(true);
                    }}
                  />
                ))}

                {/* Current time indicator */}
                {showCurrentTime && (
                  <div
                    className="absolute left-0 right-0 flex items-center z-20 pointer-events-none"
                    style={{ top: `${getCurrentTimePosition()}px` }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1" />
                    <div className="flex-1 h-0.5 bg-red-500" />
                  </div>
                )}

                {/* Events for this day */}
                {dayEvents.map((event) => {
                  const position = getEventPosition(event);
                  const eventColor = getEventColor(event.colorId);
                  return (
                    <div
                      key={event.id}
                      className={`absolute left-0.5 right-0.5 ${eventColor} text-white rounded px-1.5 py-1 cursor-pointer hover:brightness-90 shadow-sm transition-all z-10 overflow-hidden`}
                      style={{
                        top: `${position.top}px`,
                        height: `${position.height}px`
                      }}
                      onClick={() => {
                        setSelectedEvent(event);
                        setShowEventDetail(true);
                      }}
                    >
                      <p className="font-medium text-xs truncate">{event.summary}</p>
                      {position.height >= 40 && (
                        <p className="text-[10px] opacity-90 truncate">
                          {new Date(event.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Build array of dates (null for empty cells, Date objects for actual days)
    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    }

    return (
      <div className="flex-1">
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {DAYS.map((day) => (
            <div key={day} className="p-2 text-center text-sm font-semibold text-gray-700 border-r">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr" style={{ gridTemplateRows: 'repeat(6, minmax(100px, 1fr))' }}>
          {days.map((day, index) => {
            // Get events for this specific day
            const dayEvents = day ? getEventsForDay(day) : [];
            const isTodayCell = day && isToday(day);

            return (
              <div
                key={index}
                className={`border-r border-b p-2 min-h-[100px] hover:bg-blue-50/50 cursor-pointer transition-colors ${
                  day === null ? 'bg-gray-50' : ''
                } ${isTodayCell ? 'bg-blue-50/70' : ''}`}
                onClick={() => {
                  if (day) {
                    setCurrentDate(day);
                    setViewMode('day');
                  }
                }}
              >
                {day && (
                  <>
                    <div className={`text-sm font-semibold mb-1 inline-flex items-center justify-center ${
                      isTodayCell
                        ? 'bg-blue-600 text-white w-7 h-7 rounded-full'
                        : 'text-gray-900'
                    }`}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => {
                        const eventColor = getEventColor(event.colorId);
                        return (
                          <div
                            key={event.id}
                            className={`text-xs ${eventColor} text-white rounded px-2 py-0.5 truncate cursor-pointer hover:brightness-90`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(event);
                              setShowEventDetail(true);
                            }}
                          >
                            <span className="font-medium">
                              {new Date(event.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </span>
                            {' '}{event.summary}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-gray-500 font-medium pl-2">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderScheduleView = () => {
    // Sort events by date
    const sortedEvents = [...events].sort((a, b) =>
      new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    // Group events by date
    const groupedEvents: { [key: string]: CalendarEvent[] } = {};
    sortedEvents.forEach(event => {
      const dateKey = new Date(event.start).toDateString();
      if (!groupedEvents[dateKey]) {
        groupedEvents[dateKey] = [];
      }
      groupedEvents[dateKey].push(event);
    });

    if (events.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <CalendarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No upcoming events</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first event</p>
            <button
              onClick={() => setShowEventForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create Event
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-auto">
        {Object.entries(groupedEvents).map(([dateKey, dayEvents]) => {
          const date = new Date(dateKey);
          const isEventToday = isToday(date);

          return (
            <div key={dateKey} className="border-b last:border-b-0">
              {/* Date header */}
              <div className={`sticky top-0 px-4 py-2 bg-gray-50 border-b ${isEventToday ? 'bg-blue-50' : ''}`}>
                <span className={`font-semibold ${isEventToday ? 'text-blue-600' : 'text-gray-900'}`}>
                  {isEventToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'long' })}
                </span>
                <span className="text-gray-500 ml-2">
                  {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              {/* Events for this date */}
              {dayEvents.map((event) => {
                const eventColor = getEventColor(event.colorId);
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedEvent(event);
                      setShowEventDetail(true);
                    }}
                  >
                    {/* Color indicator */}
                    <div className={`w-1 self-stretch ${eventColor} rounded-full`} />

                    {/* Time */}
                    <div className="w-24 flex-shrink-0">
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(event.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(event.end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>

                    {/* Event details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{event.summary}</h3>
                      {event.description && (
                        <p className="text-sm text-gray-600 truncate">{event.description}</p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                        {event.attendees && event.attendees.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {event.attendees.length} attendees
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  const renderView = () => {
    switch (viewMode) {
      case 'day':
        return renderDayView();
      case 'week':
        return renderWeekView();
      case 'month':
        return renderMonthView();
      case 'schedule':
        return renderScheduleView();
      default:
        return renderWeekView();
    }
  };

  // Mini calendar helper
  const renderMiniCalendar = () => {
    const miniDate = new Date(currentDate);
    const firstDay = new Date(miniDate.getFullYear(), miniDate.getMonth(), 1);
    const lastDay = new Date(miniDate.getFullYear(), miniDate.getMonth() + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const miniDays: (number | null)[] = [];
    for (let i = 0; i < startingDay; i++) miniDays.push(null);
    for (let i = 1; i <= daysInMonth; i++) miniDays.push(i);

    return (
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">
            {miniDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(newDate.getMonth() - 1);
                setCurrentDate(newDate);
              }}
              className="p-0.5 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(newDate.getMonth() + 1);
                setCurrentDate(newDate);
              }}
              className="p-0.5 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-xs">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-center text-gray-500 font-medium py-1">{d}</div>
          ))}
          {miniDays.map((day, i) => {
            const dayDate = day ? new Date(miniDate.getFullYear(), miniDate.getMonth(), day) : null;
            const isCurrentDay = dayDate && isToday(dayDate);
            const isSelected = dayDate && dayDate.getDate() === currentDate.getDate() &&
              dayDate.getMonth() === currentDate.getMonth();
            return (
              <button
                key={i}
                onClick={() => day && setCurrentDate(new Date(miniDate.getFullYear(), miniDate.getMonth(), day))}
                disabled={!day}
                className={`text-center py-1 text-xs rounded-full ${
                  isCurrentDay ? 'bg-blue-600 text-white' :
                  isSelected ? 'bg-blue-100 text-blue-700' :
                  day ? 'hover:bg-gray-100 text-gray-700' : ''
                }`}
              >
                {day || ''}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border flex h-[calc(100vh-200px)]">
      {/* Left Sidebar - Google Calendar Style */}
      <div className="w-64 border-r bg-white flex flex-col">
        {/* Create Button */}
        <div className="p-4">
          <button
            onClick={() => setShowEventForm(true)}
            className="flex items-center gap-3 w-full px-6 py-3.5 bg-white border border-gray-200 rounded-2xl shadow-md hover:shadow-lg hover:bg-gray-50 transition-all"
          >
            <Plus className="h-5 w-5 text-gray-700" />
            <span className="text-gray-800 font-medium">Create</span>
          </button>
        </div>

        {/* Mini Calendar */}
        {renderMiniCalendar()}

        {/* My Calendars */}
        <div className="px-3 mt-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-2">My calendars</div>
          <div className="space-y-1">
            <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded text-blue-600" />
              <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
              <span className="text-sm text-gray-700">My Calendar</span>
            </label>
            <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded text-green-600" />
              <div className="w-2.5 h-2.5 rounded-sm bg-green-500" />
              <span className="text-sm text-gray-700">Work</span>
            </label>
            <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded text-purple-600" />
              <div className="w-2.5 h-2.5 rounded-sm bg-purple-500" />
              <span className="text-sm text-gray-700">Personal</span>
            </label>
          </div>
        </div>

        {/* Other Calendars */}
        <div className="px-3 mt-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-2">Other calendars</div>
          <div className="space-y-1">
            <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <div className="w-2.5 h-2.5 rounded-sm bg-gray-400" />
              <span className="text-sm text-gray-700">Holidays</span>
            </label>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button onClick={goToPrevious} className="p-2 hover:bg-gray-100 rounded-full">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={goToNext} className="p-2 hover:bg-gray-100 rounded-full">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <button
                onClick={goToToday}
                className="px-4 py-1.5 border rounded-md hover:bg-gray-50 font-medium text-sm"
              >
                Today
              </button>
              <h2 className="text-xl font-normal text-gray-800">{formatDate(currentDate)}</h2>
            </div>

            <div className="flex items-center border rounded-lg overflow-hidden">
              {(['day', 'week', 'month', 'schedule'] as ViewMode[]).map((mode, i) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-1.5 text-sm capitalize border-l first:border-l-0 ${
                    viewMode === mode
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar View */}
        {renderView()}
      </div>

      {/* Event Form Modal */}
      {showEventForm && (
        <EventForm
          walletAddress={walletAddress}
          onClose={() => setShowEventForm(false)}
          event={selectedEvent || undefined}
        />
      )}

      {/* Event Detail Modal */}
      {showEventDetail && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{selectedEvent.summary}</h2>
                <button onClick={() => setShowEventDetail(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-700">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p>{new Date(selectedEvent.start).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(selectedEvent.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      {' - '}
                      {new Date(selectedEvent.end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <p>{selectedEvent.location}</p>
                  </div>
                )}

                {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                  <div className="flex items-start gap-3 text-gray-700">
                    <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">{selectedEvent.attendees.length} attendees</p>
                      <div className="space-y-1">
                        {selectedEvent.attendees.map((attendee, index) => (
                          <p key={index} className="text-sm text-gray-600">{attendee}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {selectedEvent.description && (
                  <div className="pt-4 border-t">
                    <p className="text-gray-700">{selectedEvent.description}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-6 pt-6 border-t">
                <button
                  onClick={() => {
                    setShowEventDetail(false);
                    setShowEventForm(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDuplicateEvent(selectedEvent)}
                  className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  <Copy className="h-4 w-4" />
                  Duplicate
                </button>
                <button
                  onClick={() => handleDeleteEvent(selectedEvent.id)}
                  className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 ml-auto"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
