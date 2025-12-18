'use client';

import { useState, useEffect } from 'react';
import {
  Mail,
  Calendar,
  FolderOpen,
  Users,
  RefreshCw,
  Settings,
  Search,
  Bell,
  ChevronDown,
  Home,
  Star,
  Send,
  Trash2,
  Archive,
  Inbox,
  FileText,
  CheckCircle,
  StickyNote,
  CloudDownload,
  AlertCircle
} from 'lucide-react';
import { GmailInbox } from './GmailInbox';
import { CalendarView } from './CalendarView';
import { DriveExplorer } from './DriveExplorer';
import { ContactsList } from './ContactsList';

interface GoogleWorkspacePageProps {
  walletAddress: string;
  data: any;
  onSync: () => void;
  onRefresh: () => void;
  loading: boolean;
}

type TabType = 'home' | 'gmail' | 'calendar' | 'drive' | 'contacts' | 'tasks';

const TABS = [
  { id: 'home' as TabType, label: 'Home', icon: Home },
  { id: 'gmail' as TabType, label: 'Gmail', icon: Mail },
  { id: 'calendar' as TabType, label: 'Calendar', icon: Calendar },
  { id: 'drive' as TabType, label: 'Drive', icon: FolderOpen },
  { id: 'contacts' as TabType, label: 'Contacts', icon: Users },
  { id: 'tasks' as TabType, label: 'Tasks', icon: CheckCircle },
];

export function GoogleWorkspacePage({
  walletAddress,
  data,
  onSync,
  onRefresh,
  loading
}: GoogleWorkspacePageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);

  // Check if we have any data synced
  const hasData = data && (
    (data.gmail?.messages?.length > 0) ||
    (data.calendar?.events?.length > 0) ||
    (data.drive?.files?.length > 0) ||
    (data.contacts?.contacts?.length > 0)
  );

  const handleSync = async () => {
    setSyncing(true);
    try {
      await onSync();
    } finally {
      setSyncing(false);
    }
  };

  const renderHome = () => (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <Mail className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Gmail</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{data?.gmail?.messages?.length || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Unread messages</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Calendar</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{data?.calendar?.events?.length || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Upcoming events</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FolderOpen className="h-5 w-5 text-yellow-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Drive</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{data?.drive?.files?.length || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Files synced</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Contacts</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{data?.contacts?.contacts?.length || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Contacts synced</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="divide-y">
          {data?.gmail?.messages?.slice(0, 5).map((message: any, index: number) => (
            <div key={index} className="p-4 hover:bg-gray-50">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{message.subject || 'No Subject'}</p>
                  <p className="text-sm text-gray-500">{message.from}</p>
                  <p className="text-xs text-gray-400 mt-1">{message.date}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'home':
        return renderHome();
      case 'gmail':
        return <GmailInbox walletAddress={walletAddress} data={data?.gmail} />;
      case 'calendar':
        return <CalendarView walletAddress={walletAddress} data={data?.calendar} />;
      case 'drive':
        return <DriveExplorer walletAddress={walletAddress} data={data?.drive} />;
      case 'contacts':
        return <ContactsList walletAddress={walletAddress} data={data?.contacts} />;
      case 'tasks':
        return (
          <div className="bg-white rounded-lg border p-8 text-center">
            <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Google Tasks</h3>
            <p className="text-gray-500">Task management coming soon</p>
          </div>
        );
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
                <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Google Workspace</h1>
              </div>

              {/* Search Bar */}
              <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2 w-96">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search mail, calendar, drive..."
                  className="bg-transparent border-none outline-none text-sm w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSync}
                disabled={loading || syncing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Sync data from Google"
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
              <button
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Notifications"
              >
                <Bell className="h-5 w-5 text-gray-600" />
              </button>
              <button
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-4 border-b -mb-px">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 border-b-2 transition-all
                    ${isActive
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-600 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{tab.label}</span>
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
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  No Data Synced Yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Click the <strong>"Sync Data"</strong> button above to fetch your Gmail, Calendar, Drive, and Contacts from Google.
                  This will securely sync your data and store it encrypted on Filecoin.
                </p>
                <button
                  onClick={handleSync}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <CloudDownload className="h-4 w-4" />
                  <span className="font-medium">Sync My Google Data</span>
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
              <p className="text-gray-600 font-medium">Syncing data from Google Workspace...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a moment. Please wait.</p>
            </div>
          </div>
        )}

        {loading && !syncing ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading Google Workspace data...</p>
            </div>
          </div>
        ) : !syncing && (
          renderActiveTab()
        )}
      </div>
    </div>
  );
}
