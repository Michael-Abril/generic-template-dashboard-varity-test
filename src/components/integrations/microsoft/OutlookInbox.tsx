'use client';

import { useState } from 'react';
import {
  Mail,
  Star,
  Archive,
  Trash2,
  Reply,
  ReplyAll,
  Forward,
  MoreVertical,
  Search,
  Filter,
  RefreshCw,
  Flag,
  Tag,
  Paperclip,
  Calendar,
  AlertCircle,
  CheckCircle,
  X,
  Send,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  fromName?: string;
  to: string[];
  receivedDateTime: string;
  bodyPreview: string;
  isRead: boolean;
  importance: 'low' | 'normal' | 'high';
  hasAttachments?: boolean;
  categories?: string[];
}

interface OutlookInboxProps {
  walletAddress: string;
  folder: string;
  messages: EmailMessage[];
  onCompose: () => void;
  onReply?: (message: EmailMessage, replyAll?: boolean) => void;
  onForward?: (message: EmailMessage) => void;
}

export default function OutlookInbox({
  walletAddress,
  folder,
  messages,
  onCompose,
  onReply,
  onForward
}: OutlookInboxProps) {
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    unreadOnly: false,
    flaggedOnly: false,
    hasAttachments: false
  });

  const folderTitles: Record<string, string> = {
    inbox: 'Inbox',
    sent: 'Sent Items',
    drafts: 'Drafts',
    junk: 'Junk Email',
    deleted: 'Deleted Items',
    archive: 'Archive'
  };

  const filteredMessages = messages.filter((message) => {
    if (searchQuery && !message.subject.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !message.from.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterOptions.unreadOnly && message.isRead) return false;
    if (filterOptions.flaggedOnly && !message.categories?.includes('flagged')) return false;
    if (filterOptions.hasAttachments && !message.hasAttachments) return false;
    return true;
  });

  const toggleSelectMessage = (messageId: string) => {
    setSelectedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const selectAllMessages = () => {
    if (selectedMessages.size === filteredMessages.length) {
      setSelectedMessages(new Set());
    } else {
      setSelectedMessages(new Set(filteredMessages.map((m) => m.id)));
    }
  };

  const handleMarkAsRead = async (messageIds: string[]) => {
    try {
      // TODO: Implement mark as read API endpoint in backend
      console.log('Marking as read:', messageIds);
      alert('Mark as read functionality coming soon');
    } catch (error) {
      console.error('Error marking as read:', error);
      alert('Failed to mark as read');
    }
  };

  const handleDelete = async (messageIds: string[]) => {
    try {
      // TODO: Implement delete messages API endpoint in backend
      console.log('Deleting:', messageIds);
      alert('Delete functionality coming soon');
    } catch (error) {
      console.error('Error deleting messages:', error);
      alert('Failed to delete messages');
    }
  };

  const handleArchive = async (messageIds: string[]) => {
    try {
      // TODO: Implement archive messages API endpoint in backend
      console.log('Archiving:', messageIds);
      alert('Archive functionality coming soon');
    } catch (error) {
      console.error('Error archiving messages:', error);
      alert('Failed to archive messages');
    }
  };

  const getImportanceIcon = (importance: string) => {
    if (importance === 'high') {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (importance === 'low') {
      return <ChevronRight className="h-4 w-4 text-gray-400" />;
    }
    return null;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex h-full gap-4">
      {/* Message List */}
      <div className="w-96 flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="border-b border-gray-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {folderTitles[folder] || 'Inbox'}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="rounded-lg p-2 hover:bg-gray-100"
                title="Filter"
              >
                <Filter className="h-4 w-4 text-gray-600" />
              </button>
              <button
                onClick={onCompose}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Send className="h-4 w-4" />
                New Email
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-3 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filterOptions.unreadOnly}
                  onChange={(e) =>
                    setFilterOptions({ ...filterOptions, unreadOnly: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                Unread only
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filterOptions.flaggedOnly}
                  onChange={(e) =>
                    setFilterOptions({ ...filterOptions, flaggedOnly: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                Flagged only
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filterOptions.hasAttachments}
                  onChange={(e) =>
                    setFilterOptions({ ...filterOptions, hasAttachments: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                Has attachments
              </label>
            </div>
          )}

          {/* Bulk Actions */}
          {selectedMessages.size > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => handleMarkAsRead(Array.from(selectedMessages))}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Mark as Read
              </button>
              <button
                onClick={() => handleArchive(Array.from(selectedMessages))}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                <Archive className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(Array.from(selectedMessages))}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto">
          {filteredMessages.length === 0 ? (
            <div className="p-8 text-center">
              <Mail className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-gray-500">No messages found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  onClick={() => setSelectedMessage(message)}
                  className={`cursor-pointer p-4 transition-colors hover:bg-gray-50 ${
                    !message.isRead ? 'bg-blue-50/30' : ''
                  } ${selectedMessage?.id === message.id ? 'bg-blue-100' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedMessages.has(message.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelectMessage(message.id);
                      }}
                      className="mt-1 rounded border-gray-300"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {getImportanceIcon(message.importance)}
                        <p
                          className={`truncate text-sm ${
                            !message.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'
                          }`}
                        >
                          {message.fromName || message.from}
                        </p>
                        {message.hasAttachments && (
                          <Paperclip className="h-3 w-3 text-gray-400" />
                        )}
                      </div>
                      <p
                        className={`mt-1 truncate text-sm ${
                          !message.isRead ? 'font-semibold text-gray-900' : 'text-gray-600'
                        }`}
                      >
                        {message.subject || '(No subject)'}
                      </p>
                      <p className="mt-1 truncate text-xs text-gray-500">
                        {message.bodyPreview}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-gray-400">
                          {formatDate(message.receivedDateTime)}
                        </p>
                        {!message.isRead && (
                          <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message Preview/Reading Pane */}
      <div className="flex-1 rounded-lg border border-gray-200 bg-white shadow-sm">
        {selectedMessage ? (
          <div className="flex h-full flex-col">
            {/* Message Header */}
            <div className="border-b border-gray-200 p-6">
              <div className="mb-4 flex items-start justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedMessage.subject || '(No subject)'}
                </h3>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="rounded-lg p-2 hover:bg-gray-100"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold">
                  {(selectedMessage.fromName || selectedMessage.from).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {selectedMessage.fromName || selectedMessage.from}
                  </p>
                  <p className="text-sm text-gray-500">{selectedMessage.from}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(selectedMessage.receivedDateTime).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => onReply ? onReply(selectedMessage, false) : onCompose()}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  <Reply className="h-4 w-4" />
                  Reply
                </button>
                <button
                  onClick={() => onReply ? onReply(selectedMessage, true) : onCompose()}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  <ReplyAll className="h-4 w-4" />
                  Reply All
                </button>
                <button
                  onClick={() => onForward ? onForward(selectedMessage) : onCompose()}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  <Forward className="h-4 w-4" />
                  Forward
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <button className="rounded-lg p-2 hover:bg-gray-100" title="Flag">
                    <Flag className="h-4 w-4 text-gray-600" />
                  </button>
                  <button className="rounded-lg p-2 hover:bg-gray-100" title="Archive">
                    <Archive className="h-4 w-4 text-gray-600" />
                  </button>
                  <button
                    className="rounded-lg p-2 hover:bg-gray-100"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-gray-600" />
                  </button>
                  <button className="rounded-lg p-2 hover:bg-gray-100" title="More">
                    <MoreVertical className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Message Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap text-gray-700">
                  {selectedMessage.bodyPreview}
                </p>
              </div>

              {selectedMessage.hasAttachments && (
                <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="mb-3 text-sm font-medium text-gray-900">Attachments</p>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                      <Paperclip className="h-4 w-4 text-gray-400" />
                      <span>document.pdf</span>
                      <span className="text-gray-400">(2.4 MB)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Mail className="mx-auto h-16 w-16 text-gray-300" />
              <p className="mt-4 text-gray-500">Select a message to read</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
