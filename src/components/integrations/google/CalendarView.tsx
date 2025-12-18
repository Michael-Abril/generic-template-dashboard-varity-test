'use client';

import { useState, useEffect } from 'react';
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

export function CalendarView({ walletAddress, data }: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  // Load events from data prop (already fetched by parent)
  useEffect(() => {
    if (data?.events) {
      // Data is already synced from Google - use the data prop
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
      setLoading(false);
    } else {
      // No data synced yet
      setEvents([]);
      setLoading(false);
    }
  }, [data]);

  const loadEvents = async () => {
    // Refresh by calling parent's onRefresh if available
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
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

  const renderDayView = () => (
    <div className="flex-1 overflow-auto">
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
            <div key={hour} className="h-20 border-b border-l hover:bg-blue-50 cursor-pointer" />
          ))}

          {/* Events overlay */}
          {events.map((event, index) => (
            <div
              key={event.id}
              className="absolute left-1 right-1 bg-blue-500 text-white rounded p-2 cursor-pointer hover:bg-blue-600"
              style={{
                top: `${index * 100}px`,
                height: '80px'
              }}
              onClick={() => {
                setSelectedEvent(event);
                setShowEventDetail(true);
              }}
            >
              <p className="font-semibold text-sm truncate">{event.summary}</p>
              <p className="text-xs opacity-90 truncate">{event.location}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderWeekView = () => {
    const weekDays = getWeekDays();

    return (
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {/* Header */}
          <div className="border-b border-r bg-gray-50" />
          {weekDays.map((day, index) => (
            <div key={index} className="border-b border-r bg-gray-50 p-2 text-center">
              <div className="text-xs text-gray-600">{DAYS[day.getDay()]}</div>
              <div className={`text-lg font-semibold ${
                day.toDateString() === new Date().toDateString() ? 'text-blue-600' : 'text-gray-900'
              }`}>
                {day.getDate()}
              </div>
            </div>
          ))}

          {/* Time grid */}
          {HOURS.map((hour) => (
            <>
              <div key={`time-${hour}`} className="border-b border-r bg-gray-50 px-2 py-1 text-xs text-gray-500">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
              {weekDays.map((day, dayIndex) => (
                <div
                  key={`${hour}-${dayIndex}`}
                  className="h-20 border-b border-r hover:bg-blue-50 cursor-pointer"
                />
              ))}
            </>
          ))}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return (
      <div className="flex-1">
        <div className="grid grid-cols-7 border-b">
          {DAYS.map((day) => (
            <div key={day} className="p-2 text-center text-sm font-semibold text-gray-700 border-r">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr" style={{ gridTemplateRows: 'repeat(6, minmax(100px, 1fr))' }}>
          {days.map((day, index) => (
            <div
              key={index}
              className={`border-r border-b p-2 min-h-[100px] hover:bg-blue-50 cursor-pointer ${
                day === null ? 'bg-gray-50' : ''
              } ${
                day === new Date().getDate() &&
                currentDate.getMonth() === new Date().getMonth() &&
                currentDate.getFullYear() === new Date().getFullYear()
                  ? 'bg-blue-50'
                  : ''
              }`}
            >
              {day && (
                <>
                  <div className={`text-sm font-semibold mb-1 ${
                    day === new Date().getDate() &&
                    currentDate.getMonth() === new Date().getMonth() &&
                    currentDate.getFullYear() === new Date().getFullYear()
                      ? 'text-blue-600'
                      : 'text-gray-900'
                  }`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {events.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className="text-xs bg-blue-500 text-white rounded px-2 py-1 truncate cursor-pointer hover:bg-blue-600"
                        onClick={() => {
                          setSelectedEvent(event);
                          setShowEventDetail(true);
                        }}
                      >
                        {event.summary}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderScheduleView = () => (
    <div className="flex-1 overflow-auto">
      <div className="divide-y">
        {events.map((event) => (
          <div
            key={event.id}
            className="p-4 hover:bg-gray-50 cursor-pointer"
            onClick={() => {
              setSelectedEvent(event);
              setShowEventDetail(true);
            }}
          >
            <div className="flex items-start gap-4">
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-900">
                  {new Date(event.start).toLocaleDateString('en-US', { month: 'short' })}
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {new Date(event.start).getDate()}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(event.start).toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">{event.summary}</h3>
                {event.description && (
                  <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                )}
                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {new Date(event.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    {' - '}
                    {new Date(event.end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {event.location}
                    </div>
                  )}
                  {event.attendees && event.attendees.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {event.attendees.length} attendees
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

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

  return (
    <div className="bg-white rounded-lg border flex flex-col h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-900">{formatDate(currentDate)}</h2>
            <div className="flex items-center gap-2">
              <button onClick={goToPrevious} className="p-2 hover:bg-gray-100 rounded">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={goToToday}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 font-medium"
              >
                Today
              </button>
              <button onClick={goToNext} className="p-2 hover:bg-gray-100 rounded">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-lg">
              {(['day', 'week', 'month', 'schedule'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 capitalize ${
                    viewMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-100'
                  } ${mode === 'day' ? 'rounded-l-lg' : mode === 'schedule' ? 'rounded-r-lg' : ''}`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowEventForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create
            </button>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {renderView()}

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
                <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
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
