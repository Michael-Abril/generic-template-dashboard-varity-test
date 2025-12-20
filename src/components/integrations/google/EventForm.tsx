'use client';

import { useState } from 'react';
import { X, Calendar, Clock, MapPin, Users, Video, Bell } from 'lucide-react';

interface EventFormProps {
  walletAddress: string;
  onClose: () => void;
  event?: any;
}

export function EventForm({ walletAddress, onClose, event }: EventFormProps) {
  const [title, setTitle] = useState(event?.summary || '');
  const [startDate, setStartDate] = useState(event?.start?.split('T')[0] || '');
  const [startTime, setStartTime] = useState(event?.start?.split('T')[1]?.substring(0, 5) || '');
  const [endDate, setEndDate] = useState(event?.end?.split('T')[0] || '');
  const [endTime, setEndTime] = useState(event?.end?.split('T')[1]?.substring(0, 5) || '');
  const [location, setLocation] = useState(event?.location || '');
  const [description, setDescription] = useState(event?.description || '');
  const [attendees, setAttendees] = useState(event?.attendees?.join(', ') || '');
  const [addGoogleMeet, setAddGoogleMeet] = useState(false);
  const [reminder, setReminder] = useState('10');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title || !startDate || !startTime) {
      alert('Please fill in required fields');
      return;
    }

    setSaving(true);
    try {
      const isEditing = !!event?.id;
      const endpoint = isEditing
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/google/events/${event.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/google/create-event`;

      const response = await fetch(endpoint, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: walletAddress,
          summary: title,
          start: `${startDate}T${startTime}`,
          end: endDate && endTime ? `${endDate}T${endTime}` : `${startDate}T${startTime}`,
          location,
          description,
          attendees: attendees.split(',').map((email: string) => email.trim()).filter(Boolean),
          add_google_meet: addGoogleMeet,
          reminder_minutes: parseInt(reminder)
        })
      });

      if (response.ok) {
        onClose();
      } else {
        throw new Error(isEditing ? 'Failed to update event' : 'Failed to create event');
      }
    } catch (error) {
      console.error('Save event error:', error);
      alert(event?.id ? 'Failed to update event. Please try again.' : 'Failed to create event. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{event ? 'Edit Event' : 'Create Event'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add title"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="h-4 w-4 inline mr-2" />
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add location"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Google Meet */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="google-meet"
              checked={addGoogleMeet}
              onChange={(e) => setAddGoogleMeet(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="google-meet" className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Video className="h-4 w-4" />
              Add Google Meet video conferencing
            </label>
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="h-4 w-4 inline mr-2" />
              Attendees
            </label>
            <input
              type="text"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              placeholder="Add guests (comma separated emails)"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Separate multiple emails with commas</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add description"
              rows={4}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Reminder */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Bell className="h-4 w-4 inline mr-2" />
              Reminder
            </label>
            <select
              value={reminder}
              onChange={(e) => setReminder(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="0">At time of event</option>
              <option value="10">10 minutes before</option>
              <option value="30">30 minutes before</option>
              <option value="60">1 hour before</option>
              <option value="1440">1 day before</option>
            </select>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
