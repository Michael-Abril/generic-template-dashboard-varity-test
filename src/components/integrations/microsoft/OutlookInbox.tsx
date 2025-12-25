'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Paperclip,
  AlertCircle,
  X,
  Send,
  Inbox,
  FileText,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const EMAILS_PER_PAGE = 25;

interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  fromName?: string;
  to: string[];
  receivedDateTime: string;
  body?: string;
  bodyPreview: string;
  isRead: boolean;
  importance: 'low' | 'normal' | 'high';
  hasAttachments?: boolean;
  categories?: string[];
}

interface OutlookInboxProps {
  walletAddress: string;
  folder: string;
  messages?: EmailMessage[];
  onCompose: () => void;
  onReply?: (message: EmailMessage, replyAll?: boolean) => void;
  onForward?: (message: EmailMessage) => void;
  onDataChange?: () => void;
}

const FOLDER_CONFIG = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'sent', label: 'Sent Items', icon: Send },
  { id: 'drafts', label: 'Drafts', icon: FileText },
  { id: 'junk', label: 'Junk Email', icon: AlertTriangle },
  { id: 'deleted', label: 'Deleted Items', icon: Trash2 },
  { id: 'archive', label: 'Archive', icon: Archive },
];

export default function OutlookInbox({
  walletAddress,
  folder: initialFolder,
  messages: initialMessages = [],
  onCompose,
  onReply,
  onForward,
  onDataChange
}: OutlookInboxProps) {
  const [messages, setMessages] = useState<EmailMessage[]>(initialMessages);
  const [loading, setLoading] = useState(true);
  const [currentFolder, setCurrentFolder] = useState(initialFolder);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    unreadOnly: false,
    flaggedOnly: false,
    hasAttachments: false
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch messages from live API
  const fetchMessages = async (folder: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/microsoft/mail/messages?wallet_address=${walletAddress}&folder=${folder}&top=100`
      );
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      } else {
        console.error('Failed to fetch messages:', response.status);
        // Fall back to initial messages from props
        setMessages(initialMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages(initialMessages);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages(currentFolder);
  }, [walletAddress, currentFolder]);

  const handleFolderChange = (folderId: string) => {
    setCurrentFolder(folderId);
    setSelectedMessage(null);
    setSelectedMessages(new Set());
  };

  const filteredMessages = useMemo(() => {
    return messages.filter((message) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!message.subject?.toLowerCase().includes(query) &&
            !message.from?.toLowerCase().includes(query) &&
            !message.bodyPreview?.toLowerCase().includes(query)) {
          return false;
        }
      }
      if (filterOptions.unreadOnly && message.isRead) return false;
      if (filterOptions.flaggedOnly && !message.categories?.includes('flagged')) return false;
      if (filterOptions.hasAttachments && !message.hasAttachments) return false;
      return true;
    });
  }, [messages, searchQuery, filterOptions]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterOptions, currentFolder]);

  // Paginated messages
  const totalPages = Math.ceil(filteredMessages.length / EMAILS_PER_PAGE);
  const paginatedMessages = useMemo(() => {
    const startIndex = (currentPage - 1) * EMAILS_PER_PAGE;
    return filteredMessages.slice(startIndex, startIndex + EMAILS_PER_PAGE);
  }, [filteredMessages, currentPage]);

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

  const handleMarkAsRead = async (messageIds: string[], isRead: boolean = true) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const results = await Promise.all(
        messageIds.map((messageId) =>
          fetch(`${apiUrl}/api/v1/integrations/microsoft/mail/messages/${messageId}/read`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              wallet_address: walletAddress,
              is_read: isRead
            })
          })
        )
      );

      const allSuccessful = results.every((r) => r.ok);
      if (allSuccessful) {
        setSelectedMessages(new Set());
        // Update local state optimistically
        setMessages(prev => prev.map(m =>
          messageIds.includes(m.id) ? { ...m, isRead } : m
        ));
        onDataChange?.();
      } else {
        alert('Some messages could not be updated');
      }
    } catch (error) {
      console.error('Error marking as read:', error);
      alert('Failed to mark as read');
    }
  };

  const handleDelete = async (messageIds: string[]) => {
    if (!confirm(`Delete ${messageIds.length} message(s)?`)) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const results = await Promise.all(
        messageIds.map((messageId) =>
          fetch(
            `${apiUrl}/api/v1/integrations/microsoft/mail/messages/${messageId}?wallet_address=${walletAddress}`,
            { method: 'DELETE' }
          )
        )
      );

      const allSuccessful = results.every((r) => r.ok);
      if (allSuccessful) {
        setSelectedMessages(new Set());
        // Update local state optimistically
        setMessages(prev => prev.filter(m => !messageIds.includes(m.id)));
        if (selectedMessage && messageIds.includes(selectedMessage.id)) {
          setSelectedMessage(null);
        }
        onDataChange?.();
      } else {
        alert('Some messages could not be deleted');
      }
    } catch (error) {
      console.error('Error deleting messages:', error);
      alert('Failed to delete messages');
    }
  };

  const handleArchive = async (messageIds: string[]) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const results = await Promise.all(
        messageIds.map((messageId) =>
          fetch(`${apiUrl}/api/v1/integrations/microsoft/mail/messages/${messageId}/archive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              wallet_address: walletAddress
            })
          })
        )
      );

      const allSuccessful = results.every((r) => r.ok);
      if (allSuccessful) {
        setSelectedMessages(new Set());
        // Update local state optimistically
        setMessages(prev => prev.filter(m => !messageIds.includes(m.id)));
        if (selectedMessage && messageIds.includes(selectedMessage.id)) {
          setSelectedMessage(null);
        }
        onDataChange?.();
      } else {
        alert('Some messages could not be archived');
      }
    } catch (error) {
      console.error('Error archiving messages:', error);
      alert('Failed to archive messages');
    }
  };

  const getImportanceIcon = (importance: string) => {
    if (importance === 'high') {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
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

  const currentFolderConfig = FOLDER_CONFIG.find(f => f.id === currentFolder) || FOLDER_CONFIG[0];

  return (
    <div className="flex h-[calc(100vh-220px)] gap-4">
      {/* Folder Sidebar */}
      <div className="w-56 flex-shrink-0 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <button
            onClick={onCompose}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Send className="h-4 w-4" />
            New Email
          </button>
        </div>
        <div className="py-2">
          {FOLDER_CONFIG.map((folder) => {
            const Icon = folder.icon;
            const isActive = currentFolder === folder.id;
            const unreadCount = folder.id === 'inbox' ? messages.filter(m => !m.isRead).length : 0;
            return (
              <button
                key={folder.id}
                onClick={() => handleFolderChange(folder.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                <span className="flex-1 text-left">{folder.label}</span>
                {unreadCount > 0 && folder.id === 'inbox' && (
                  <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Message List */}
      <div className="w-96 flex-shrink-0 flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="border-b border-gray-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {currentFolderConfig.label}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchMessages(currentFolder)}
                className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`rounded-lg p-2 hover:bg-gray-100 transition-colors ${showFilters ? 'bg-gray-100' : ''}`}
                title="Filter"
              >
                <Filter className="h-4 w-4 text-gray-600" />
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
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-3 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={filterOptions.unreadOnly}
                  onChange={(e) =>
                    setFilterOptions({ ...filterOptions, unreadOnly: e.target.checked })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Unread only
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={filterOptions.hasAttachments}
                  onChange={(e) =>
                    setFilterOptions({ ...filterOptions, hasAttachments: e.target.checked })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Has attachments
              </label>
            </div>
          )}

          {/* Bulk Actions */}
          {selectedMessages.size > 0 && (
            <div className="mt-3 flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-700 font-medium">{selectedMessages.size} selected</span>
              <div className="flex gap-1 ml-auto">
                <button
                  onClick={() => handleMarkAsRead(Array.from(selectedMessages))}
                  className="rounded-lg px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100 font-medium"
                >
                  Mark Read
                </button>
                <button
                  onClick={() => handleArchive(Array.from(selectedMessages))}
                  className="rounded-lg p-1.5 text-blue-700 hover:bg-blue-100"
                  title="Archive"
                >
                  <Archive className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(Array.from(selectedMessages))}
                  className="rounded-lg p-1.5 text-red-600 hover:bg-red-100"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="p-8 text-center">
              <Mail className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-gray-600 font-medium">No messages found</p>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery ? 'Try a different search term' : `Your ${currentFolderConfig.label.toLowerCase()} is empty`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {paginatedMessages.map((message) => (
                <div
                  key={message.id}
                  onClick={() => setSelectedMessage(message)}
                  className={`cursor-pointer p-4 transition-colors hover:bg-gray-50 ${
                    !message.isRead ? 'bg-blue-50/50' : ''
                  } ${selectedMessage?.id === message.id ? 'bg-blue-100 border-l-2 border-blue-600' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedMessages.has(message.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelectMessage(message.id);
                      }}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                          <Paperclip className="h-3 w-3 text-gray-400 flex-shrink-0" />
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
                        <p className="text-xs text-gray-400 font-medium">
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

        {/* Pagination */}
        {filteredMessages.length > EMAILS_PER_PAGE && (
          <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between bg-gray-50">
            <span className="text-sm text-gray-600">
              {(currentPage - 1) * EMAILS_PER_PAGE + 1}-{Math.min(currentPage * EMAILS_PER_PAGE, filteredMessages.length)} of {filteredMessages.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>
              <span className="text-sm text-gray-700 font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Message Preview/Reading Pane */}
      <div className="flex-1 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
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
                  className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold flex-shrink-0">
                  {(selectedMessage.fromName || selectedMessage.from).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">
                    {selectedMessage.fromName || selectedMessage.from}
                  </p>
                  <p className="text-sm text-gray-500 truncate">{selectedMessage.from}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(selectedMessage.receivedDateTime).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => onReply ? onReply(selectedMessage, false) : onCompose()}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <Reply className="h-4 w-4" />
                  Reply
                </button>
                <button
                  onClick={() => onReply ? onReply(selectedMessage, true) : onCompose()}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <ReplyAll className="h-4 w-4" />
                  Reply All
                </button>
                <button
                  onClick={() => onForward ? onForward(selectedMessage) : onCompose()}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <Forward className="h-4 w-4" />
                  Forward
                </button>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    onClick={() => handleArchive([selectedMessage.id])}
                    className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
                    title="Archive"
                  >
                    <Archive className="h-4 w-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleDelete([selectedMessage.id])}
                    className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-gray-600" />
                  </button>
                  <button className="rounded-lg p-2 hover:bg-gray-100 transition-colors" title="More">
                    <MoreVertical className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Message Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose max-w-none">
                <div
                  className="text-gray-700 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: selectedMessage.body || selectedMessage.bodyPreview || ''
                  }}
                />
              </div>

              {selectedMessage.hasAttachments && (
                <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="mb-3 text-sm font-medium text-gray-900">Attachments</p>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                      <Paperclip className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-700">Attachment</span>
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
              <p className="mt-4 text-gray-600 font-medium">Select a message to read</p>
              <p className="mt-1 text-sm text-gray-500">Choose an email from the list</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
