'use client';

import { useState, useEffect } from 'react';
import {
  Mail,
  Calendar,
  Cloud,
  Users,
  CheckCircle,
  MessageSquare,
  Home,
  RefreshCw
} from 'lucide-react';
import OutlookInbox from './OutlookInbox';
import EmailComposer from './EmailComposer';
import CalendarView from './CalendarView';
import OneDriveExplorer from './OneDriveExplorer';
import ContactsList from './ContactsList';
import TodoList from './TodoList';

// Navigation items for Microsoft 365
const M365_SIDEBAR_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  {
    id: 'outlook',
    label: 'Outlook',
    icon: Mail,
    submenu: [
      { id: 'inbox', label: 'Inbox' },
      { id: 'sent', label: 'Sent Items' },
      { id: 'drafts', label: 'Drafts' },
      { id: 'junk', label: 'Junk Email' },
      { id: 'deleted', label: 'Deleted Items' },
      { id: 'archive', label: 'Archive' }
    ]
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: Calendar,
    submenu: [
      { id: 'day-view', label: 'Day' },
      { id: 'week-view', label: 'Week' },
      { id: 'month-view', label: 'Month' }
    ]
  },
  {
    id: 'onedrive',
    label: 'OneDrive',
    icon: Cloud,
    submenu: [
      { id: 'files', label: 'My files' },
      { id: 'shared', label: 'Shared' },
      { id: 'recent', label: 'Recent' },
      { id: 'recycle', label: 'Recycle bin' }
    ]
  },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'tasks', label: 'To Do', icon: CheckCircle },
  { id: 'teams', label: 'Teams', icon: MessageSquare, comingSoon: true }
  // SharePoint and OneNote hidden - enterprise features not typically used by SMBs
];

interface Microsoft365PageProps {
  walletAddress: string;
  data?: any;
  onSync?: () => void;
}

export default function Microsoft365Page({ walletAddress, data, onSync }: Microsoft365PageProps) {
  const [activeSection, setActiveSection] = useState('home');
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set(['outlook']));
  const [loading, setLoading] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState(0);

  useEffect(() => {
    // Calculate unread emails and upcoming events
    if (data?.mail?.messages) {
      const unread = data.mail.messages.filter((m: any) => !m.isRead).length;
      setUnreadCount(unread);
    }
    if (data?.calendar?.events) {
      setUpcomingEvents(data.calendar.events.length);
    }
  }, [data]);

  const toggleMenu = (menuId: string) => {
    setExpandedMenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(menuId)) {
        newSet.delete(menuId);
      } else {
        newSet.add(menuId);
      }
      return newSet;
    });
  };

  const handleSync = async () => {
    setLoading(true);
    if (onSync) {
      await onSync();
    }
    setLoading(false);
  };

  const renderHome = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Welcome to Microsoft 365</h1>
        <button
          onClick={handleSync}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Syncing...' : 'Sync Data'}
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div
          className="cursor-pointer rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          onClick={() => setActiveSection('inbox')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unread Emails</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">{unreadCount}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div
          className="cursor-pointer rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          onClick={() => setActiveSection('day-view')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Upcoming Events</p>
              <p className="mt-2 text-3xl font-bold text-green-600">{upcomingEvents}</p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div
          className="cursor-pointer rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          onClick={() => setActiveSection('files')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">OneDrive Files</p>
              <p className="mt-2 text-3xl font-bold text-purple-600">
                {data?.onedrive?.files?.length || 0}
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3">
              <Cloud className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div
          className="cursor-pointer rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          onClick={() => setActiveSection('contacts')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Contacts</p>
              <p className="mt-2 text-3xl font-bold text-orange-600">
                {data?.contacts?.contacts?.length || 0}
              </p>
            </div>
            <div className="rounded-full bg-orange-100 p-3">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Activity</h2>
        <div className="space-y-3">
          {data?.mail?.messages?.slice(0, 5).map((message: any, index: number) => (
            <div
              key={index}
              className="flex items-start gap-3 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
            >
              <Mail className="mt-1 h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{message.subject}</p>
                <p className="text-sm text-gray-600">
                  From: {message.fromName || message.from}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(message.receivedDateTime).toLocaleString()}
                </p>
              </div>
              {!message.isRead && (
                <span className="h-2 w-2 rounded-full bg-blue-600"></span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSection = () => {
    // Outlook sections
    if (['inbox', 'sent', 'drafts', 'junk', 'deleted', 'archive'].includes(activeSection)) {
      return (
        <OutlookInbox
          walletAddress={walletAddress}
          folder={activeSection}
          messages={data?.mail?.messages || []}
          onCompose={() => setShowComposer(true)}
        />
      );
    }

    // Calendar sections
    if (['day-view', 'week-view', 'month-view'].includes(activeSection)) {
      const view = activeSection.replace('-view', '') as 'day' | 'week' | 'month';
      return (
        <CalendarView
          walletAddress={walletAddress}
          view={view}
          events={data?.calendar?.events || []}
        />
      );
    }

    // OneDrive sections
    if (['files', 'shared', 'recent', 'recycle'].includes(activeSection)) {
      return (
        <OneDriveExplorer
          walletAddress={walletAddress}
          view={activeSection as 'files' | 'shared' | 'recent' | 'recycle'}
          files={data?.onedrive?.files || []}
        />
      );
    }

    // Other sections
    switch (activeSection) {
      case 'home':
        return renderHome();
      case 'contacts':
        return (
          <ContactsList
            walletAddress={walletAddress}
            contacts={data?.contacts?.contacts || []}
          />
        );
      case 'tasks':
        return <TodoList walletAddress={walletAddress} />;
      case 'teams':
        return (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              Microsoft Teams
            </h3>
            <p className="mt-2 text-gray-600">Teams integration coming soon</p>
            <p className="mt-4 text-sm text-gray-500">
              Chat, video calls, and team collaboration will be available here.
            </p>
          </div>
        );
      default:
        return renderHome();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 bg-white">
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 p-2">
              <Mail className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-gray-900">Microsoft 365</span>
          </div>
        </div>

        <div className="overflow-y-auto p-4">
          <div className="space-y-1">
            {M365_SIDEBAR_ITEMS.map((item) => (
              <div key={item.id}>
                <button
                  onClick={() => {
                    if (item.comingSoon) return; // Disabled for coming soon items
                    if (item.submenu) {
                      toggleMenu(item.id);
                    } else {
                      setActiveSection(item.id);
                    }
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    item.comingSoon
                      ? 'text-gray-400 cursor-not-allowed'
                      : activeSection === item.id
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  disabled={item.comingSoon}
                >
                  <item.icon className={`h-4 w-4 ${item.comingSoon ? 'text-gray-300' : ''}`} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.comingSoon && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                      Soon
                    </span>
                  )}
                  {item.id === 'outlook' && unreadCount > 0 && (
                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {item.submenu && expandedMenus.has(item.id) && (
                  <div className="ml-6 mt-1 space-y-1">
                    {item.submenu.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => setActiveSection(subItem.id)}
                        className={`flex w-full items-center rounded-lg px-3 py-1.5 text-sm transition-colors ${
                          activeSection === subItem.id
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {subItem.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">{renderSection()}</div>
      </div>

      {/* Email Composer Modal */}
      {showComposer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="h-4/5 w-full max-w-4xl">
            <EmailComposer
              walletAddress={walletAddress}
              onClose={() => setShowComposer(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
