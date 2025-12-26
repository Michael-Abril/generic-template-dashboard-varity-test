'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Video,
  X,
  Edit3,
  Trash2,
  Loader2,
  AlertCircle,
  ExternalLink,
  Tag,
  Check
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  subject: string;
  start: string;
  end: string;
  location?: string;
  attendees?: string[];
  organizer?: string;
  isAllDay: boolean;
  importance: 'low' | 'normal' | 'high';
  isOnlineMeeting?: boolean;
  onlineMeetingUrl?: string;
  categories?: string[];
  bodyPreview?: string;
}

interface CalendarViewProps {
  walletAddress: string;
  view: 'day' | 'week' | 'month';
  events?: CalendarEvent[];
  onDataChange?: () => void;
}

type ViewType = 'day' | 'week' | 'month';

// Category colors for different event types
const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Blue category': { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-blue-700' },
  'Green category': { bg: 'bg-green-500', border: 'border-green-600', text: 'text-green-700' },
  'Purple category': { bg: 'bg-purple-500', border: 'border-purple-600', text: 'text-purple-700' },
  'Red category': { bg: 'bg-red-500', border: 'border-red-600', text: 'text-red-700' },
  'Yellow category': { bg: 'bg-yellow-500', border: 'border-yellow-600', text: 'text-yellow-700' },
  'Orange category': { bg: 'bg-orange-500', border: 'border-orange-600', text: 'text-orange-700' },
  'default': { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-blue-700' },
  'high': { bg: 'bg-red-500', border: 'border-red-600', text: 'text-red-700' },
  'low': { bg: 'bg-gray-400', border: 'border-gray-500', text: 'text-gray-700' },
};

export default function CalendarView({ walletAddress, view: initialView, events: initialEvents = [], onDataChange }: CalendarViewProps) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewType>(initialView);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showNewEventForm, setShowNewEventForm] = useState(false);
  const [showEditEventForm, setShowEditEventForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Quick event creation state
  const [quickEventSlot, setQuickEventSlot] = useState<{ date: Date; hour: number } | null>(null);

  const [newEventData, setNewEventData] = useState({
    subject: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    location: '',
    isOnlineMeeting: false,
    attendees: ''
  });

  const [editEventData, setEditEventData] = useState({
    subject: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    location: '',
    isOnlineMeeting: false,
    attendees: ''
  });

  // Fetch events from live API
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/microsoft/calendar/events?wallet_address=${walletAddress}`
      );
      if (response.status === 401) {
        setApiError('Microsoft token expired. Please reconnect from Marketplace.');
        setEvents(initialEvents);
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      } else {
        console.error('Failed to fetch events:', response.status);
        setEvents(initialEvents);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents(initialEvents);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, initialEvents]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (currentView === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (currentView === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (currentView === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (currentView === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDateRangeText = () => {
    if (currentView === 'day') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } else if (currentView === 'week') {
      const weekStart = new Date(currentDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const getEventColor = (event: CalendarEvent) => {
    // First check for categories
    if (event.categories && event.categories.length > 0) {
      const category = event.categories[0];
      if (CATEGORY_COLORS[category]) {
        return `${CATEGORY_COLORS[category].bg} ${CATEGORY_COLORS[category].border}`;
      }
    }
    // Then check importance
    if (event.importance === 'high') return `${CATEGORY_COLORS.high.bg} ${CATEGORY_COLORS.high.border}`;
    if (event.importance === 'low') return `${CATEGORY_COLORS.low.bg} ${CATEGORY_COLORS.low.border}`;
    // Check for online meeting (Teams events)
    if (event.isOnlineMeeting) return 'bg-purple-500 border-purple-600';
    return `${CATEGORY_COLORS.default.bg} ${CATEGORY_COLORS.default.border}`;
  };

  const handleCreateEvent = async () => {
    if (!newEventData.subject || !newEventData.startDate || !newEventData.startTime) {
      alert('Please fill in event title, start date, and start time');
      return;
    }

    setActionLoading(true);
    try {
      const startDateTime = `${newEventData.startDate}T${newEventData.startTime}:00`;
      const endDateTime = newEventData.endDate && newEventData.endTime
        ? `${newEventData.endDate}T${newEventData.endTime}:00`
        : `${newEventData.startDate}T${newEventData.startTime}:00`;

      const payload: Record<string, unknown> = {
        wallet_address: walletAddress,
        subject: newEventData.subject,
        start: {
          dateTime: startDateTime,
          timeZone: 'UTC'
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'UTC'
        },
        is_online_meeting: newEventData.isOnlineMeeting
      };

      if (newEventData.location) {
        payload.location = newEventData.location;
      }

      if (newEventData.attendees) {
        payload.attendees = newEventData.attendees.split(',').map(e => e.trim()).filter(Boolean);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/microsoft/calendar/events`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Optimistic update
        if (data.event) {
          setEvents(prev => [...prev, {
            id: data.event.id,
            subject: data.event.subject,
            start: data.event.start?.dateTime || startDateTime,
            end: data.event.end?.dateTime || endDateTime,
            location: data.event.location?.displayName,
            isAllDay: data.event.isAllDay || false,
            importance: data.event.importance || 'normal',
            isOnlineMeeting: data.event.isOnlineMeeting || false,
            onlineMeetingUrl: data.event.onlineMeeting?.joinUrl,
          }]);
        }
        setShowNewEventForm(false);
        setNewEventData({
          subject: '',
          startDate: '',
          startTime: '',
          endDate: '',
          endTime: '',
          location: '',
          isOnlineMeeting: false,
          attendees: ''
        });
        onDataChange?.();
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail || 'Failed to create event'}`);
      }
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditEvent = async () => {
    if (!selectedEvent) return;
    if (!editEventData.subject || !editEventData.startDate || !editEventData.startTime) {
      alert('Please fill in event title, start date, and start time');
      return;
    }

    setActionLoading(true);
    try {
      const startDateTime = `${editEventData.startDate}T${editEventData.startTime}:00`;
      const endDateTime = editEventData.endDate && editEventData.endTime
        ? `${editEventData.endDate}T${editEventData.endTime}:00`
        : `${editEventData.startDate}T${editEventData.startTime}:00`;

      const payload: Record<string, unknown> = {
        wallet_address: walletAddress,
        subject: editEventData.subject,
        start: {
          dateTime: startDateTime,
          timeZone: 'UTC'
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'UTC'
        },
        is_online_meeting: editEventData.isOnlineMeeting
      };

      if (editEventData.location !== undefined) {
        payload.location = editEventData.location || null;
      }

      if (editEventData.attendees) {
        payload.attendees = editEventData.attendees.split(',').map(e => e.trim()).filter(Boolean);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/microsoft/calendar/events/${selectedEvent.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      if (response.ok) {
        // Optimistic update
        setEvents(prev => prev.map(event =>
          event.id === selectedEvent.id
            ? {
                ...event,
                subject: editEventData.subject,
                start: startDateTime,
                end: endDateTime,
                location: editEventData.location || undefined,
                isOnlineMeeting: editEventData.isOnlineMeeting
              }
            : event
        ));
        setShowEditEventForm(false);
        setShowEventModal(false);
        setSelectedEvent(null);
        onDataChange?.();
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail || 'Failed to update event'}`);
      }
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    if (!confirm('Are you sure you want to delete this event?')) return;

    setActionLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/microsoft/calendar/events/${selectedEvent.id}?wallet_address=${walletAddress}`,
        { method: 'DELETE' }
      );
      if (response.ok) {
        // Optimistic update
        setEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
        setShowEventModal(false);
        setSelectedEvent(null);
        onDataChange?.();
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail || 'Failed to delete event'}`);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditForm = () => {
    if (!selectedEvent) return;
    const startDate = new Date(selectedEvent.start);
    const endDate = new Date(selectedEvent.end);

    setEditEventData({
      subject: selectedEvent.subject,
      startDate: startDate.toISOString().split('T')[0],
      startTime: startDate.toTimeString().slice(0, 5),
      endDate: endDate.toISOString().split('T')[0],
      endTime: endDate.toTimeString().slice(0, 5),
      location: selectedEvent.location || '',
      isOnlineMeeting: selectedEvent.isOnlineMeeting || false,
      attendees: selectedEvent.attendees?.join(', ') || ''
    });
    setShowEventModal(false);
    setShowEditEventForm(true);
  };

  // Quick event creation - handle time slot click
  const handleTimeSlotClick = (date: Date, hour: number) => {
    const clickDate = new Date(date);
    clickDate.setHours(hour, 0, 0, 0);

    const endDate = new Date(clickDate);
    endDate.setHours(hour + 1);

    setNewEventData({
      subject: '',
      startDate: clickDate.toISOString().split('T')[0],
      startTime: `${hour.toString().padStart(2, '0')}:00`,
      endDate: endDate.toISOString().split('T')[0],
      endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
      location: '',
      isOnlineMeeting: false,
      attendees: ''
    });
    setShowNewEventForm(true);
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayEvents = getEventsForDate(currentDate);

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          <div className="relative">
            {hours.map((hour) => (
              <div
                key={hour}
                className="flex border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                style={{ height: '60px' }}
                onClick={() => handleTimeSlotClick(currentDate, hour)}
              >
                <div className="w-20 flex-shrink-0 border-r border-gray-200 px-2 py-1 text-right text-sm text-gray-500">
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </div>
                <div className="flex-1 relative group">
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}

            {/* Events positioned absolutely */}
            {dayEvents.map((event) => {
              const startTime = new Date(event.start);
              const endTime = new Date(event.end);
              const startHour = startTime.getHours() + startTime.getMinutes() / 60;
              const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
              const top = startHour * 60;
              const height = Math.max(duration * 60, 30);

              return (
                <div
                  key={event.id}
                  className={`absolute left-20 right-4 cursor-pointer rounded-lg border-l-4 p-2 shadow-sm ${getEventColor(event)} bg-opacity-90 hover:bg-opacity-100 transition-all hover:shadow-md`}
                  style={{ top: `${top}px`, height: `${height}px`, minHeight: '30px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEvent(event);
                    setShowEventModal(true);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-semibold text-white truncate flex-1">{event.subject}</p>
                    {event.isOnlineMeeting && (
                      <Video className="h-4 w-4 text-white ml-1 flex-shrink-0" />
                    )}
                  </div>
                  {event.location && height > 40 && (
                    <p className="text-xs text-white opacity-90 truncate">
                      <MapPin className="inline h-3 w-3 mr-1" />
                      {event.location}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = new Date(currentDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      return day;
    });
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="flex flex-col h-full">
        {/* Day headers */}
        <div className="flex border-b border-gray-200">
          <div className="w-20 flex-shrink-0 border-r border-gray-200"></div>
          {weekDays.map((day, i) => (
            <div key={i} className="flex-1 border-r border-gray-200 p-2 text-center">
              <p className="text-xs font-medium text-gray-500">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </p>
              <p className={`text-lg font-semibold ${day.toDateString() === new Date().toDateString() ? 'text-blue-600' : 'text-gray-900'}`}>
                {day.getDate()}
              </p>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex">
            {/* Time column */}
            <div className="w-20 flex-shrink-0 border-r border-gray-200">
              {hours.map((hour) => (
                <div key={hour} className="px-2 py-1 text-right text-xs text-gray-500" style={{ height: '48px' }}>
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day, dayIndex) => (
              <div key={dayIndex} className="flex-1 border-r border-gray-200 relative">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors group"
                    style={{ height: '48px' }}
                    onClick={() => handleTimeSlotClick(day, hour)}
                  >
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <Plus className="h-3 w-3 text-gray-400" />
                    </div>
                  </div>
                ))}

                {/* Events for this day */}
                {getEventsForDate(day).map((event) => {
                  const startTime = new Date(event.start);
                  const endTime = new Date(event.end);
                  const startHour = startTime.getHours() + startTime.getMinutes() / 60;
                  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
                  const top = startHour * 48;
                  const height = Math.max(duration * 48, 24);

                  return (
                    <div
                      key={event.id}
                      className={`absolute left-1 right-1 cursor-pointer rounded border-l-2 p-1 text-xs ${getEventColor(event)} bg-opacity-80 hover:bg-opacity-100 transition-all hover:shadow-md z-10`}
                      style={{ top: `${top}px`, height: `${height}px`, minHeight: '24px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                        setShowEventModal(true);
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <p className="font-semibold text-white truncate">{event.subject}</p>
                        {event.isOnlineMeeting && <Video className="h-3 w-3 text-white flex-shrink-0" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const weeks = [];
    let currentWeekStart = new Date(startDate);

    while (currentWeekStart <= endDate) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(currentWeekStart);
        day.setDate(day.getDate() + i);
        week.push(day);
      }
      weeks.push(week);
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    return (
      <div className="flex flex-col h-full">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="border-r border-gray-200 p-2 text-center text-sm font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="flex-1 grid grid-rows-5" style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7">
              {week.map((day, dayIndex) => {
                const dayEvents = getEventsForDate(day);
                const isCurrentMonth = day.getMonth() === month;
                const isToday = day.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={dayIndex}
                    className={`border-r border-b border-gray-200 p-2 cursor-pointer hover:bg-gray-50 transition-colors ${!isCurrentMonth ? 'bg-gray-50' : ''}`}
                    onClick={() => {
                      setCurrentDate(day);
                      setCurrentView('day');
                    }}
                  >
                    <div
                      className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-sm ${
                        isToday
                          ? 'bg-blue-600 font-bold text-white'
                          : isCurrentMonth
                            ? 'font-medium text-gray-900'
                            : 'text-gray-400'
                      }`}
                    >
                      {day.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className={`cursor-pointer truncate rounded px-2 py-0.5 text-xs text-white ${getEventColor(event)} hover:opacity-80`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(event);
                            setShowEventModal(true);
                          }}
                        >
                          <span className="flex items-center gap-1">
                            {event.isOnlineMeeting && <Video className="h-3 w-3 inline" />}
                            {new Date(event.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} {event.subject}
                          </span>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <p className="text-xs text-gray-500 hover:text-blue-600 cursor-pointer">+{dayEvents.length - 3} more</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Event count by category for mini stats
  const eventStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingEvents = events.filter(e => new Date(e.start) >= today);
    const teamsEvents = upcomingEvents.filter(e => e.isOnlineMeeting);
    return { total: upcomingEvents.length, teams: teamsEvents.length };
  }, [events]);

  return (
    <div className="flex h-[calc(100vh-220px)] flex-col rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* API Error Banner */}
      {apiError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{apiError}</p>
          <button
            onClick={() => setApiError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={goToToday}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Today
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={goToPrevious}
              className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={goToNext}
              className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">{getDateRangeText()}</h2>

          {/* Mini stats */}
          <div className="hidden sm:flex items-center gap-3 ml-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <CalendarIcon className="h-4 w-4" />
              {eventStats.total} upcoming
            </span>
            {eventStats.teams > 0 && (
              <span className="flex items-center gap-1 text-purple-600">
                <Video className="h-4 w-4" />
                {eventStats.teams} Teams
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Switcher */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            {(['day', 'week', 'month'] as ViewType[]).map((viewOption) => (
              <button
                key={viewOption}
                onClick={() => setCurrentView(viewOption)}
                className={`px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  currentView === viewOption
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {viewOption}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchEvents}
            className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-5 w-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowNewEventForm(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Event
          </button>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <>
            {currentView === 'day' && renderDayView()}
            {currentView === 'week' && renderWeekView()}
            {currentView === 'month' && renderMonthView()}
          </>
        )}
      </div>

      {/* Event Detail Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{selectedEvent.subject}</h3>
                {selectedEvent.categories && selectedEvent.categories.length > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Tag className="h-3 w-3 text-gray-400" />
                    {selectedEvent.categories.map((cat, i) => (
                      <span key={i} className={`text-xs px-2 py-0.5 rounded ${CATEGORY_COLORS[cat]?.text || 'text-gray-600'} bg-gray-100`}>
                        {cat.replace(' category', '')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowEventModal(false)}
                className="rounded-lg p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedEvent.start).toLocaleString()} -{' '}
                    {new Date(selectedEvent.end).toLocaleString()}
                  </p>
                  {selectedEvent.isAllDay && (
                    <p className="text-xs text-gray-500">All day event</p>
                  )}
                </div>
              </div>

              {selectedEvent.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-gray-400" />
                  <p className="text-sm text-gray-900">{selectedEvent.location}</p>
                </div>
              )}

              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div className="flex items-start gap-3">
                  <Users className="mt-0.5 h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedEvent.attendees.length} attendee(s)
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedEvent.attendees.join(', ')}
                    </p>
                  </div>
                </div>
              )}

              {selectedEvent.isOnlineMeeting && (
                <div className="flex items-start gap-3">
                  <Video className="mt-0.5 h-5 w-5 text-purple-500" />
                  <div className="flex-1">
                    {selectedEvent.onlineMeetingUrl ? (
                      <a
                        href={selectedEvent.onlineMeetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <Video className="h-4 w-4" />
                        Join Teams Meeting
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-sm text-purple-600 flex items-center gap-1">
                        <Check className="h-4 w-4" />
                        Teams Meeting (link available in Outlook)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={openEditForm}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Edit3 className="h-4 w-4" />
                Edit Event
              </button>
              <button
                onClick={handleDeleteEvent}
                disabled={actionLoading}
                className="flex-1 rounded-lg border border-red-300 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Event Form Modal */}
      {showNewEventForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">New Event</h3>
              <button
                onClick={() => setShowNewEventForm(false)}
                className="rounded-lg p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={newEventData.subject}
                  onChange={(e) => setNewEventData({ ...newEventData, subject: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                  placeholder="Event title"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={newEventData.startDate}
                    onChange={(e) => setNewEventData({ ...newEventData, startDate: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={newEventData.startTime}
                    onChange={(e) => setNewEventData({ ...newEventData, startTime: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={newEventData.endDate}
                    onChange={(e) => setNewEventData({ ...newEventData, endDate: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={newEventData.endTime}
                    onChange={(e) => setNewEventData({ ...newEventData, endTime: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Location
                </label>
                <input
                  type="text"
                  value={newEventData.location}
                  onChange={(e) => setNewEventData({ ...newEventData, location: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                  placeholder="Meeting location"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Attendees (comma-separated emails)
                </label>
                <input
                  type="text"
                  value={newEventData.attendees}
                  onChange={(e) => setNewEventData({ ...newEventData, attendees: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                  placeholder="john@example.com, jane@example.com"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newEventData.isOnlineMeeting}
                    onChange={(e) => setNewEventData({ ...newEventData, isOnlineMeeting: e.target.checked })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <Video className="h-4 w-4 text-purple-600" />
                  <span className="text-gray-700">Create Teams meeting</span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={handleCreateEvent}
                disabled={actionLoading}
                className="flex-1 rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create Event
              </button>
              <button
                onClick={() => setShowNewEventForm(false)}
                className="flex-1 rounded-lg border border-gray-300 py-2 font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Form Modal */}
      {showEditEventForm && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Edit Event</h3>
              <button
                onClick={() => {
                  setShowEditEventForm(false);
                  setSelectedEvent(null);
                }}
                className="rounded-lg p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={editEventData.subject}
                  onChange={(e) => setEditEventData({ ...editEventData, subject: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                  placeholder="Event title"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={editEventData.startDate}
                    onChange={(e) => setEditEventData({ ...editEventData, startDate: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={editEventData.startTime}
                    onChange={(e) => setEditEventData({ ...editEventData, startTime: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={editEventData.endDate}
                    onChange={(e) => setEditEventData({ ...editEventData, endDate: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={editEventData.endTime}
                    onChange={(e) => setEditEventData({ ...editEventData, endTime: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Location
                </label>
                <input
                  type="text"
                  value={editEventData.location}
                  onChange={(e) => setEditEventData({ ...editEventData, location: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                  placeholder="Meeting location"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Attendees (comma-separated emails)
                </label>
                <input
                  type="text"
                  value={editEventData.attendees}
                  onChange={(e) => setEditEventData({ ...editEventData, attendees: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                  placeholder="john@example.com, jane@example.com"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editEventData.isOnlineMeeting}
                    onChange={(e) => setEditEventData({ ...editEventData, isOnlineMeeting: e.target.checked })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <Video className="h-4 w-4 text-purple-600" />
                  <span className="text-gray-700">Teams meeting</span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={handleEditEvent}
                disabled={actionLoading}
                className="flex-1 rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Save Changes
              </button>
              <button
                onClick={() => {
                  setShowEditEventForm(false);
                  setShowEventModal(true);
                }}
                className="flex-1 rounded-lg border border-gray-300 py-2 font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
