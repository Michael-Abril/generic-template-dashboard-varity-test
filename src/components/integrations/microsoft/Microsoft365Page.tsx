'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Mail,
  Calendar,
  Cloud,
  Users,
  CheckCircle,
  Home,
  RefreshCw,
  Settings,
  Search,
  Bell,
  CloudDownload,
  AlertCircle,
  X
} from 'lucide-react';
import OutlookInbox from './OutlookInbox';
import CalendarView from './CalendarView';
import OneDriveExplorer from './OneDriveExplorer';
import ContactsList from './ContactsList';
import TodoList from './TodoList';
import EmailComposer from './EmailComposer';

interface Microsoft365PageProps {
  walletAddress: string;
  data: any;
  onSync: () => void;
  onRefresh: () => void;
  loading: boolean;
}

type TabType = 'home' | 'outlook' | 'calendar' | 'onedrive' | 'contacts' | 'todo';

const TABS = [
  { id: 'home' as TabType, label: 'Home', icon: Home },
  { id: 'outlook' as TabType, label: 'Outlook', icon: Mail },
  { id: 'calendar' as TabType, label: 'Calendar', icon: Calendar },
  { id: 'onedrive' as TabType, label: 'OneDrive', icon: Cloud },
  { id: 'contacts' as TabType, label: 'Contacts', icon: Users },
  { id: 'todo' as TabType, label: 'To Do', icon: CheckCircle },
];

export default function Microsoft365Page({
  walletAddress,
  data,
  onSync,
  onRefresh,
  loading
}: Microsoft365PageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showComposer, setShowComposer] = useState(false);

  // Check if we have any data synced
  const hasData = useMemo(() => {
    return data && (
      (data.mail?.messages?.length > 0) ||
      (data.calendar?.events?.length > 0) ||
      (data.onedrive?.files?.length > 0) ||
      (data.contacts?.contacts?.length > 0)
    );
  }, [data]);

  // Calculate stats for home dashboard
  const stats = useMemo(() => {
    return {
      unreadEmails: data?.mail?.messages?.filter((m: any) => !m.isRead).length || 0,
      totalEmails: data?.mail?.messages?.length || 0,
      upcomingEvents: data?.calendar?.events?.length || 0,
      filesCount: data?.onedrive?.files?.length || 0,
      contactsCount: data?.contacts?.contacts?.length || 0
    };
  }, [data]);

  // Handle global search - navigate to appropriate tab based on results
  const handleGlobalSearch = () => {
    if (!searchQuery.trim()) return;
    const query = searchQuery.toLowerCase();

    // Check Mail
    const mailMatch = data?.mail?.messages?.some((msg: any) =>
      msg.subject?.toLowerCase().includes(query) ||
      msg.from?.toLowerCase().includes(query) ||
      msg.bodyPreview?.toLowerCase().includes(query)
    );
    if (mailMatch) {
      setActiveTab('outlook');
      return;
    }

    // Check Calendar
    const calendarMatch = data?.calendar?.events?.some((evt: any) =>
      evt.subject?.toLowerCase().includes(query) ||
      evt.location?.toLowerCase().includes(query)
    );
    if (calendarMatch) {
      setActiveTab('calendar');
      return;
    }

    // Check OneDrive
    const driveMatch = data?.onedrive?.files?.some((file: any) =>
      file.name?.toLowerCase().includes(query)
    );
    if (driveMatch) {
      setActiveTab('onedrive');
      return;
    }

    // Check Contacts
    const contactMatch = data?.contacts?.contacts?.some((contact: any) =>
      contact.name?.toLowerCase().includes(query) ||
      contact.emails?.some((e: string) => e.toLowerCase().includes(query))
    );
    if (contactMatch) {
      setActiveTab('contacts');
      return;
    }

    // Default to Outlook for search
    setActiveTab('outlook');
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await onSync();
    } finally {
      setSyncing(false);
    }
  };

  const handleDataChange = () => {
    // Called by child components when data is modified
    // This triggers a refresh to get the latest data
    onRefresh();
  };

  const renderHome = () => (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer"
          onClick={() => setActiveTab('outlook')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-900">Outlook</h3>
          </div>
          <p className="text-4xl font-bold text-gray-900">{stats.unreadEmails}</p>
          <p className="text-sm text-gray-600 mt-2 font-medium">
            Unread of {stats.totalEmails} emails
          </p>
        </div>

        <div
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-green-200 transition-all cursor-pointer"
          onClick={() => setActiveTab('calendar')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-bold text-gray-900">Calendar</h3>
          </div>
          <p className="text-4xl font-bold text-gray-900">{stats.upcomingEvents}</p>
          <p className="text-sm text-gray-600 mt-2 font-medium">Upcoming events</p>
        </div>

        <div
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-purple-200 transition-all cursor-pointer"
          onClick={() => setActiveTab('onedrive')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Cloud className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-bold text-gray-900">OneDrive</h3>
          </div>
          <p className="text-4xl font-bold text-gray-900">{stats.filesCount}</p>
          <p className="text-sm text-gray-600 mt-2 font-medium">Files synced</p>
        </div>

        <div
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-orange-200 transition-all cursor-pointer"
          onClick={() => setActiveTab('contacts')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-orange-100 rounded-xl">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="font-bold text-gray-900">Contacts</h3>
          </div>
          <p className="text-4xl font-bold text-gray-900">{stats.contactsCount}</p>
          <p className="text-sm text-gray-600 mt-2 font-medium">Contacts synced</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
        </div>
        {data?.mail?.messages?.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {data?.mail?.messages?.slice(0, 5).map((message: any, index: number) => (
              <div
                key={index}
                className="p-4 hover:bg-blue-50 cursor-pointer transition-colors"
                onClick={() => setActiveTab('outlook')}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Mail className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {message.subject || 'No Subject'}
                    </p>
                    <p className="text-sm text-gray-700 truncate">
                      {message.fromName || message.from}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 font-medium">
                      {message.receivedDateTime
                        ? new Date(message.receivedDateTime).toLocaleString()
                        : ''}
                    </p>
                  </div>
                  {!message.isRead && (
                    <span className="h-2 w-2 rounded-full bg-blue-600 mt-2"></span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Mail className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No recent activity</p>
            <p className="text-sm text-gray-500 mt-1">
              Sync your data to see recent emails here
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => setShowComposer(true)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-blue-50 hover:border-blue-200 border border-transparent transition-all"
          >
            <div className="p-3 bg-blue-100 rounded-xl">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-gray-800">Compose Email</span>
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-green-50 hover:border-green-200 border border-transparent transition-all"
          >
            <div className="p-3 bg-green-100 rounded-xl">
              <Calendar className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-sm font-semibold text-gray-800">New Event</span>
          </button>
          <button
            onClick={() => setActiveTab('onedrive')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-purple-50 hover:border-purple-200 border border-transparent transition-all"
          >
            <div className="p-3 bg-purple-100 rounded-xl">
              <Cloud className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-sm font-semibold text-gray-800">Upload File</span>
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-orange-50 hover:border-orange-200 border border-transparent transition-all"
          >
            <div className="p-3 bg-orange-100 rounded-xl">
              <Users className="h-5 w-5 text-orange-600" />
            </div>
            <span className="text-sm font-semibold text-gray-800">Add Contact</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'home':
        return renderHome();
      case 'outlook':
        return (
          <OutlookInbox
            walletAddress={walletAddress}
            folder="inbox"
            messages={data?.mail?.messages || []}
            onCompose={() => setShowComposer(true)}
            onDataChange={handleDataChange}
          />
        );
      case 'calendar':
        return (
          <CalendarView
            walletAddress={walletAddress}
            view="month"
            events={data?.calendar?.events || []}
            onDataChange={handleDataChange}
          />
        );
      case 'onedrive':
        return (
          <OneDriveExplorer
            walletAddress={walletAddress}
            view="files"
            files={data?.onedrive?.files || []}
            onDataChange={handleDataChange}
          />
        );
      case 'contacts':
        return (
          <ContactsList
            walletAddress={walletAddress}
            contacts={data?.contacts?.contacts || []}
            onDataChange={handleDataChange}
          />
        );
      case 'todo':
        return <TodoList walletAddress={walletAddress} onDataChange={handleDataChange} />;
      default:
        return renderHome();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Microsoft 365</h1>
              </div>

              {/* Search Bar */}
              <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2 w-96 border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <Search className="h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search mail, calendar, files..."
                  className="bg-transparent border-none outline-none text-sm w-full text-gray-900 placeholder:text-gray-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleGlobalSearch();
                    }
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <X className="h-3 w-3 text-gray-500" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSync}
                disabled={loading || syncing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Sync data from Microsoft 365"
              >
                <CloudDownload className={`h-4 w-4 ${syncing ? 'animate-pulse' : ''}`} />
                <span className="font-medium">{syncing ? 'Syncing...' : 'Sync Data'}</span>
              </button>
              <button
                onClick={onRefresh}
                disabled={loading}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw className={`h-5 w-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${showNotifications ? 'bg-gray-100' : ''}`}
                  title="Notifications"
                >
                  <Bell className="h-5 w-5 text-gray-600" />
                </button>
                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
                    <div className="px-4 py-3 border-b flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                    <div className="p-4 text-center">
                      <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No new notifications</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                  className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${showSettingsPanel ? 'bg-gray-100' : ''}`}
                  title="Settings"
                >
                  <Settings className="h-5 w-5 text-gray-600" />
                </button>
                {/* Settings Dropdown */}
                {showSettingsPanel && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border z-50">
                    <div className="px-4 py-3 border-b flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Settings</h3>
                      <button
                        onClick={() => setShowSettingsPanel(false)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                    <div className="py-2">
                      <button
                        onClick={() => {
                          setShowSettingsPanel(false);
                          window.location.href = '/settings';
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Account Settings
                      </button>
                      <button
                        onClick={() => {
                          setShowSettingsPanel(false);
                          window.location.href = '/integrations';
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Manage Integrations
                      </button>
                      <div className="border-t my-1" />
                      <button
                        onClick={handleSync}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Re-sync Microsoft 365 Data
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-4 border-b border-gray-200 -mb-px">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all rounded-t-lg
                    ${isActive
                      ? 'border-blue-600 text-blue-700 bg-blue-50 font-semibold'
                      : 'border-transparent text-gray-700 hover:bg-gray-100 hover:text-gray-900 font-medium'
                    }
                  `}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : ''}`} />
                  <span>{tab.label}</span>
                  {tab.id === 'outlook' && stats.unreadEmails > 0 && (
                    <span className="ml-1 bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                      {stats.unreadEmails}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* No Data Banner */}
        {!hasData && !loading && !syncing && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  No Data Synced Yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Click the <strong>"Sync Data"</strong> button above to fetch your Outlook emails, Calendar events, OneDrive files, and Contacts from Microsoft 365.
                  Your data will be securely encrypted and stored.
                </p>
                <button
                  onClick={handleSync}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <CloudDownload className="h-4 w-4" />
                  <span className="font-medium">Sync My Microsoft 365 Data</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Syncing State */}
        {syncing && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <CloudDownload className="h-8 w-8 text-blue-600 animate-pulse mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Syncing data from Microsoft 365...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a moment. Please wait.</p>
            </div>
          </div>
        )}

        {loading && !syncing ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading Microsoft 365 data...</p>
            </div>
          </div>
        ) : !syncing && (
          renderActiveTab()
        )}
      </div>

      {/* Email Composer Modal */}
      {showComposer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="h-4/5 w-full max-w-4xl">
            <EmailComposer
              walletAddress={walletAddress}
              onClose={() => setShowComposer(false)}
              onSent={() => {
                setShowComposer(false);
                handleDataChange();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
