'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Loader2
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
  categories?: string[];
}

interface CalendarViewProps {
  walletAddress: string;
  view: 'day' | 'week' | 'month';
  events?: CalendarEvent[];
  onDataChange?: () => void;
}

type ViewType = 'day' | 'week' | 'month';

export default function CalendarView({ walletAddress, view: initialView, events: initialEvents = [], onDataChange }: CalendarViewProps) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewType>(initialView);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showNewEventForm, setShowNewEventForm] = useState(false);
  const [newEventData, setNewEventData] = useState({
    subject: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    location: '',
    isOnlineMeeting: false
  });

  // Fetch events from live API
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/microsoft/calendar/events?wallet_address=${walletAddress}`
      );
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
  };

  useEffect(() => {
    fetchEvents();
  }, [walletAddress]);

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

  const getEventColor = (importance: string) => {
    if (importance === 'high') return 'bg-red-500 border-red-600';
    if (importance === 'low') return 'bg-gray-400 border-gray-500';
    return 'bg-blue-500 border-blue-600';
  };

  const handleCreateEvent = async () => {
    if (!newEventData.subject || !newEventData.startDate || !newEventData.startTime) {
      alert('Please fill in event title, start date, and start time');
      return;
    }

    try {
      const startDateTime = `${newEventData.startDate}T${newEventData.startTime}:00`;
      const endDateTime = newEventData.endDate && newEventData.endTime
        ? `${newEventData.endDate}T${newEventData.endTime}:00`
        : `${newEventData.startDate}T${newEventData.startTime}:00`;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/microsoft/calendar/events`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
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
            location: newEventData.location || undefined,
            is_online_meeting: newEventData.isOnlineMeeting
          })
        }
      );

      if (response.ok) {
        alert('Event created successfully!');
        setShowNewEventForm(false);
        setNewEventData({
          subject: '',
          startDate: '',
          startTime: '',
          endDate: '',
          endTime: '',
          location: '',
          isOnlineMeeting: false
        });
        // Refresh to load new event
        onDataChange?.();
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail || 'Failed to create event'}`);
      }
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Network error. Please try again.');
    }
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayEvents = getEventsForDate(currentDate);

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          <div className="relative">
            {hours.map((hour) => (
              <div key={hour} className="flex border-b border-gray-200" style={{ height: '60px' }}>
                <div className="w-20 flex-shrink-0 border-r border-gray-200 px-2 py-1 text-right text-sm text-gray-500">
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </div>
                <div className="flex-1 relative"></div>
              </div>
            ))}

            {/* Events positioned absolutely */}
            {dayEvents.map((event) => {
              const startTime = new Date(event.start);
              const endTime = new Date(event.end);
              const startHour = startTime.getHours() + startTime.getMinutes() / 60;
              const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
              const top = startHour * 60;
              const height = duration * 60;

              return (
                <div
                  key={event.id}
                  className={`absolute left-20 right-4 cursor-pointer rounded-lg border-l-4 p-2 shadow-sm ${getEventColor(event.importance)} bg-opacity-90 hover:bg-opacity-100`}
                  style={{ top: `${top}px`, height: `${height}px`, minHeight: '30px' }}
                  onClick={() => {
                    setSelectedEvent(event);
                    setShowEventModal(true);
                  }}
                >
                  <p className="text-sm font-semibold text-white truncate">{event.subject}</p>
                  {event.location && (
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
                  <div key={hour} className="border-b border-gray-100" style={{ height: '48px' }}></div>
                ))}

                {/* Events for this day */}
                {getEventsForDate(day).map((event) => {
                  const startTime = new Date(event.start);
                  const endTime = new Date(event.end);
                  const startHour = startTime.getHours() + startTime.getMinutes() / 60;
                  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
                  const top = startHour * 48;
                  const height = duration * 48;

                  return (
                    <div
                      key={event.id}
                      className={`absolute left-1 right-1 cursor-pointer rounded border-l-2 p-1 text-xs ${getEventColor(event.importance)} bg-opacity-80 hover:bg-opacity-100`}
                      style={{ top: `${top}px`, height: `${height}px`, minHeight: '24px' }}
                      onClick={() => {
                        setSelectedEvent(event);
                        setShowEventModal(true);
                      }}
                    >
                      <p className="font-semibold text-white truncate">{event.subject}</p>
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
                    className={`border-r border-b border-gray-200 p-2 ${!isCurrentMonth ? 'bg-gray-50' : ''}`}
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
                          className={`cursor-pointer truncate rounded px-2 py-0.5 text-xs text-white ${getEventColor(event.importance)}`}
                          onClick={() => {
                            setSelectedEvent(event);
                            setShowEventModal(true);
                          }}
                        >
                          {new Date(event.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} {event.subject}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <p className="text-xs text-gray-500">+{dayEvents.length - 3} more</p>
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

  return (
    <div className="flex h-[calc(100vh-220px)] flex-col rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
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
              <h3 className="text-xl font-semibold text-gray-900">{selectedEvent.subject}</h3>
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
                  <Video className="mt-0.5 h-5 w-5 text-gray-400" />
                  <a href="#" className="text-sm text-blue-600 hover:underline">
                    Join Teams Meeting
                  </a>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                disabled
                title="Edit in Outlook - coming in next release"
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium opacity-50 cursor-not-allowed"
              >
                <Edit3 className="inline h-4 w-4 mr-2" />
                Edit in Outlook
              </button>
              <button
                onClick={async () => {
                  if (!confirm('Are you sure you want to delete this event?')) return;
                  try {
                    const response = await fetch(
                      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/microsoft/calendar/events/${selectedEvent.id}?wallet_address=${walletAddress}`,
                      { method: 'DELETE' }
                    );
                    if (response.ok) {
                      alert('Event deleted successfully!');
                      setShowEventModal(false);
                      onDataChange?.();
                    } else {
                      const error = await response.json();
                      alert(`Error: ${error.detail || 'Failed to delete event'}`);
                    }
                  } catch (error) {
                    console.error('Error deleting event:', error);
                    alert('Network error. Please try again.');
                  }
                }}
                className="flex-1 rounded-lg border border-red-300 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 className="inline h-4 w-4 mr-2" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Event Form Modal */}
      {showNewEventForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl">
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
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="Event title"
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
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
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
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
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
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
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
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
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
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="Meeting location"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={newEventData.isOnlineMeeting}
                    onChange={(e) => setNewEventData({ ...newEventData, isOnlineMeeting: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  Create Teams meeting
                </label>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={handleCreateEvent}
                className="flex-1 rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700"
              >
                Create Event
              </button>
              <button
                onClick={() => setShowNewEventForm(false)}
                className="flex-1 rounded-lg border border-gray-300 py-2 font-medium hover:bg-gray-50"
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
