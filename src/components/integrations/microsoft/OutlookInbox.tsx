'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  ChevronRight,
  Eye,
  EyeOff,
  MailOpen,
  Keyboard,
  Clock,
  Edit3
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
  isFlagged?: boolean;
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

// Keyboard shortcuts help
const KEYBOARD_SHORTCUTS = [
  { key: 'c', action: 'Compose new email' },
  { key: 'j/k', action: 'Navigate up/down' },
  { key: 'e', action: 'Archive' },
  { key: '#', action: 'Delete' },
  { key: 's', action: 'Flag/Unflag' },
  { key: 'r', action: 'Reply' },
  { key: 'a', action: 'Reply All' },
  { key: 'f', action: 'Forward' },
  { key: '/', action: 'Search' },
  { key: 'Esc', action: 'Close preview' },
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
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // API Error state
  const [apiError, setApiError] = useState<string | null>(null);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);

  // Fetch messages from live API
  const fetchMessages = async (folder: string) => {
    setLoading(true);
    setApiError(null);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/microsoft/mail/messages?wallet_address=${walletAddress}&folder=${folder}&top=100`
      );

      if (response.status === 401) {
        setApiError('Microsoft token expired. Please reconnect from Marketplace.');
        setMessages([]);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      } else {
        console.error('Failed to fetch messages:', response.status);
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
    setHighlightedIndex(-1);
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
      if (filterOptions.flaggedOnly && !message.isFlagged) return false;
      if (filterOptions.hasAttachments && !message.hasAttachments) return false;
      return true;
    });
  }, [messages, searchQuery, filterOptions]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    setHighlightedIndex(-1);
  }, [searchQuery, filterOptions, currentFolder]);

  // Paginated messages
  const totalPages = Math.ceil(filteredMessages.length / EMAILS_PER_PAGE);
  const paginatedMessages = useMemo(() => {
    const startIndex = (currentPage - 1) * EMAILS_PER_PAGE;
    return filteredMessages.slice(startIndex, startIndex + EMAILS_PER_PAGE);
  }, [filteredMessages, currentPage]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't handle if typing in input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      if (e.key === 'Escape') {
        (e.target as HTMLElement).blur();
      }
      return;
    }

    const currentMessage = highlightedIndex >= 0 ? paginatedMessages[highlightedIndex] : selectedMessage;

    switch (e.key.toLowerCase()) {
      case 'c':
        e.preventDefault();
        onCompose();
        break;
      case 'j':
        e.preventDefault();
        setHighlightedIndex(prev => Math.min(prev + 1, paginatedMessages.length - 1));
        break;
      case 'k':
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && paginatedMessages[highlightedIndex]) {
          setSelectedMessage(paginatedMessages[highlightedIndex]);
        }
        break;
      case 'e':
        e.preventDefault();
        if (currentMessage) handleArchive([currentMessage.id]);
        else if (selectedMessages.size > 0) handleArchive(Array.from(selectedMessages));
        break;
      case '#':
        e.preventDefault();
        if (currentMessage) handleDelete([currentMessage.id]);
        else if (selectedMessages.size > 0) handleDelete(Array.from(selectedMessages));
        break;
      case 's':
        e.preventDefault();
        if (currentMessage) handleToggleFlag(currentMessage);
        break;
      case 'r':
        e.preventDefault();
        if (currentMessage) {
          if (e.shiftKey) {
            // Shift+R for Reply All
            onReply ? onReply(currentMessage, true) : onCompose();
          } else {
            onReply ? onReply(currentMessage, false) : onCompose();
          }
        }
        break;
      case 'a':
        e.preventDefault();
        if (currentMessage) {
          onReply ? onReply(currentMessage, true) : onCompose();
        }
        break;
      case 'f':
        e.preventDefault();
        if (currentMessage) {
          onForward ? onForward(currentMessage) : onCompose();
        }
        break;
      case '/':
        e.preventDefault();
        searchInputRef.current?.focus();
        break;
      case 'escape':
        e.preventDefault();
        setSelectedMessage(null);
        setHighlightedIndex(-1);
        break;
      case '?':
        if (e.shiftKey) {
          e.preventDefault();
          setShowShortcutsHelp(prev => !prev);
        }
        break;
    }
  }, [highlightedIndex, paginatedMessages, selectedMessage, selectedMessages, onCompose, onReply, onForward]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Scroll highlighted message into view
  useEffect(() => {
    if (highlightedIndex >= 0 && messageListRef.current) {
      const items = messageListRef.current.querySelectorAll('[data-message-item]');
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex]);

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
    if (selectedMessages.size === paginatedMessages.length) {
      setSelectedMessages(new Set());
    } else {
      setSelectedMessages(new Set(paginatedMessages.map((m) => m.id)));
    }
  };

  const handleMarkAsRead = async (messageIds: string[], isRead: boolean = true) => {
    // Optimistic update
    setMessages(prev => prev.map(m =>
      messageIds.includes(m.id) ? { ...m, isRead } : m
    ));

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

      if (!results.every((r) => r.ok)) {
        // Revert on failure
        setMessages(prev => prev.map(m =>
          messageIds.includes(m.id) ? { ...m, isRead: !isRead } : m
        ));
      } else {
        setSelectedMessages(new Set());
        onDataChange?.();
      }
    } catch (error) {
      console.error('Error marking as read:', error);
      // Revert
      setMessages(prev => prev.map(m =>
        messageIds.includes(m.id) ? { ...m, isRead: !isRead } : m
      ));
    }
  };

  const handleToggleFlag = async (message: EmailMessage) => {
    const newFlagged = !message.isFlagged;

    // Optimistic update
    setMessages(prev => prev.map(m =>
      m.id === message.id ? { ...m, isFlagged: newFlagged } : m
    ));
    if (selectedMessage?.id === message.id) {
      setSelectedMessage({ ...selectedMessage, isFlagged: newFlagged });
    }

    // Note: This would need a backend endpoint for flag toggling
    // For now, it's just local state update
  };

  const handleDelete = async (messageIds: string[]) => {
    if (!confirm(`Delete ${messageIds.length} message(s)?`)) return;

    // Optimistic update
    const deletedMessages = messages.filter(m => messageIds.includes(m.id));
    setMessages(prev => prev.filter(m => !messageIds.includes(m.id)));
    if (selectedMessage && messageIds.includes(selectedMessage.id)) {
      setSelectedMessage(null);
    }

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

      if (!results.every((r) => r.ok)) {
        // Revert on failure
        setMessages(prev => [...prev, ...deletedMessages]);
        alert('Some messages could not be deleted');
      } else {
        setSelectedMessages(new Set());
        onDataChange?.();
      }
    } catch (error) {
      console.error('Error deleting messages:', error);
      setMessages(prev => [...prev, ...deletedMessages]);
      alert('Failed to delete messages');
    }
  };

  const handleArchive = async (messageIds: string[]) => {
    // Optimistic update
    const archivedMessages = messages.filter(m => messageIds.includes(m.id));
    setMessages(prev => prev.filter(m => !messageIds.includes(m.id)));
    if (selectedMessage && messageIds.includes(selectedMessage.id)) {
      setSelectedMessage(null);
    }

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

      if (!results.every((r) => r.ok)) {
        // Revert on failure
        setMessages(prev => [...prev, ...archivedMessages]);
        alert('Some messages could not be archived');
      } else {
        setSelectedMessages(new Set());
        onDataChange?.();
      }
    } catch (error) {
      console.error('Error archiving messages:', error);
      setMessages(prev => [...prev, ...archivedMessages]);
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
  const unreadCount = messages.filter(m => !m.isRead).length;

  return (
    <div className="flex h-[calc(100vh-220px)] bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* API Error Banner */}
      {apiError && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">{apiError}</span>
          </div>
          <button
            onClick={() => setApiError(null)}
            className="p-1 hover:bg-red-500 rounded transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Keyboard Shortcuts Help Modal */}
      {showShortcutsHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-bold text-gray-900">Keyboard Shortcuts</h3>
              </div>
              <button onClick={() => setShowShortcutsHelp(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-2">
              {KEYBOARD_SHORTCUTS.map(({ key, action }) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-gray-700">{action}</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono text-gray-800">{key}</kbd>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-gray-500">Press Shift + ? to toggle this help</p>
          </div>
        </div>
      )}

      {/* Folder Sidebar */}
      <div className="w-56 border-r bg-white flex flex-col">
        {/* Compose Button - Gmail Style FAB */}
        <div className="p-3">
          <button
            onClick={onCompose}
            className="w-full flex items-center gap-3 px-6 py-3.5 bg-white border border-gray-200 rounded-2xl shadow-md hover:shadow-lg hover:bg-gray-50 transition-all group"
          >
            <Edit3 className="h-6 w-6 text-gray-700 group-hover:text-blue-600" />
            <span className="text-gray-800 font-medium">Compose</span>
          </button>
        </div>

        {/* Folders */}
        <nav className="flex-1 px-2 py-2 overflow-y-auto">
          {FOLDER_CONFIG.map((folder) => {
            const Icon = folder.icon;
            const isActive = currentFolder === folder.id;
            const folderUnread = folder.id === 'inbox' ? unreadCount : 0;
            return (
              <button
                key={folder.id}
                onClick={() => handleFolderChange(folder.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-full text-sm transition-colors ${
                  isActive ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : ''}`} />
                <span className="flex-1 text-left">{folder.label}</span>
                {folderUnread > 0 && (
                  <span className={`text-xs font-semibold ${isActive ? 'text-blue-700' : 'text-gray-600'}`}>
                    {folderUnread}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Shortcuts hint */}
        <div className="p-3 border-t">
          <button
            onClick={() => setShowShortcutsHelp(true)}
            className="w-full flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Keyboard className="h-4 w-4" />
            <span>Shift + ? for shortcuts</span>
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="w-96 border-r flex flex-col">
        {/* Toolbar */}
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">{currentFolderConfig.label}</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchMessages(currentFolder)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${showFilters ? 'bg-gray-100' : ''}`}
                title="Filter"
              >
                <Filter className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2.5 focus-within:bg-white focus-within:shadow-md focus-within:ring-1 focus-within:ring-gray-300 transition-all">
            <Search className="h-5 w-5 text-gray-500" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search emails (press /)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full text-gray-900 placeholder:text-gray-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-gray-200 rounded-full">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            )}
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-3 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={filterOptions.unreadOnly}
                  onChange={(e) => setFilterOptions({ ...filterOptions, unreadOnly: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Unread only
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={filterOptions.flaggedOnly}
                  onChange={(e) => setFilterOptions({ ...filterOptions, flaggedOnly: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Flagged only
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={filterOptions.hasAttachments}
                  onChange={(e) => setFilterOptions({ ...filterOptions, hasAttachments: e.target.checked })}
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
                  className="p-1.5 text-blue-700 hover:bg-blue-100 rounded-lg"
                  title="Mark as read"
                >
                  <MailOpen className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleMarkAsRead(Array.from(selectedMessages), false)}
                  className="p-1.5 text-blue-700 hover:bg-blue-100 rounded-lg"
                  title="Mark as unread"
                >
                  <Mail className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleArchive(Array.from(selectedMessages))}
                  className="p-1.5 text-blue-700 hover:bg-blue-100 rounded-lg"
                  title="Archive (e)"
                >
                  <Archive className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(Array.from(selectedMessages))}
                  className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg"
                  title="Delete (#)"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto" ref={messageListRef}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
          ) : paginatedMessages.length === 0 ? (
            <div className="p-8 text-center">
              <Mail className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-gray-600 font-medium">No messages found</p>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery ? 'Try a different search term' : `Your ${currentFolderConfig.label.toLowerCase()} is empty`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {paginatedMessages.map((message, index) => (
                <div
                  key={message.id}
                  data-message-item
                  onClick={() => setSelectedMessage(message)}
                  className={`cursor-pointer group relative transition-colors ${
                    !message.isRead ? 'bg-blue-50/50' : ''
                  } ${selectedMessage?.id === message.id ? 'bg-blue-100' : 'hover:bg-gray-50'}
                  ${highlightedIndex === index ? 'ring-2 ring-inset ring-blue-400' : ''}`}
                >
                  <div className="p-4">
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
                          <p className={`truncate text-sm ${!message.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                            {message.fromName || message.from}
                          </p>
                          {message.hasAttachments && (
                            <Paperclip className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          )}
                          {message.isFlagged && (
                            <Flag className="h-3 w-3 text-red-500 fill-red-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className={`mt-1 truncate text-sm ${!message.isRead ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                          {message.subject || '(No subject)'}
                        </p>
                        <p className="mt-1 truncate text-xs text-gray-500">{message.bodyPreview}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-xs text-gray-400 font-medium">{formatDate(message.receivedDateTime)}</p>
                          {!message.isRead && <span className="h-2 w-2 rounded-full bg-blue-600"></span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hover Actions */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-white shadow-md rounded-lg p-1 border">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchive([message.id]);
                      }}
                      className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                      title="Archive (e)"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete([message.id]);
                      }}
                      className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-red-600"
                      title="Delete (#)"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFlag(message);
                      }}
                      className={`p-1.5 hover:bg-gray-100 rounded ${message.isFlagged ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
                      title="Flag (s)"
                    >
                      <Flag className={`h-4 w-4 ${message.isFlagged ? 'fill-red-500' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead([message.id], !message.isRead);
                      }}
                      className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                      title={message.isRead ? 'Mark unread' : 'Mark read'}
                    >
                      {message.isRead ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t px-4 py-3 flex items-center justify-between bg-gray-50">
            <span className="text-sm text-gray-600">
              {(currentPage - 1) * EMAILS_PER_PAGE + 1}-{Math.min(currentPage * EMAILS_PER_PAGE, filteredMessages.length)} of {filteredMessages.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm text-gray-600 px-2">{currentPage}/{totalPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Message Preview/Reading Pane */}
      <div className="flex-1 flex flex-col">
        {selectedMessage ? (
          <>
            {/* Message Header */}
            <div className="border-b p-6">
              <div className="mb-4 flex items-start justify-between">
                <h3 className="text-xl font-bold text-gray-900">{selectedMessage.subject || '(No subject)'}</h3>
                <button onClick={() => setSelectedMessage(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold text-lg flex-shrink-0">
                  {(selectedMessage.fromName || selectedMessage.from).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{selectedMessage.fromName || selectedMessage.from}</p>
                  <p className="text-sm text-gray-500 truncate">{selectedMessage.from}</p>
                  <p className="mt-1 text-xs text-gray-400">{new Date(selectedMessage.receivedDateTime).toLocaleString()}</p>
                </div>
                {selectedMessage.isFlagged && <Flag className="h-5 w-5 text-red-500 fill-red-500" />}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => onReply ? onReply(selectedMessage, false) : onCompose()}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <Reply className="h-4 w-4" /> Reply
                </button>
                <button
                  onClick={() => onReply ? onReply(selectedMessage, true) : onCompose()}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <ReplyAll className="h-4 w-4" /> Reply All
                </button>
                <button
                  onClick={() => onForward ? onForward(selectedMessage) : onCompose()}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <Forward className="h-4 w-4" /> Forward
                </button>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    onClick={() => handleToggleFlag(selectedMessage)}
                    className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${selectedMessage.isFlagged ? 'text-red-500' : 'text-gray-600'}`}
                    title="Flag (s)"
                  >
                    <Flag className={`h-4 w-4 ${selectedMessage.isFlagged ? 'fill-red-500' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleMarkAsRead([selectedMessage.id], !selectedMessage.isRead)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                    title={selectedMessage.isRead ? 'Mark as unread' : 'Mark as read'}
                  >
                    {selectedMessage.isRead ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleArchive([selectedMessage.id])}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                    title="Archive (e)"
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete([selectedMessage.id])}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                    title="Delete (#)"
                  >
                    <Trash2 className="h-4 w-4" />
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
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Mail className="mx-auto h-16 w-16 text-gray-300" />
              <p className="mt-4 text-gray-600 font-medium">Select a message to read</p>
              <p className="mt-1 text-sm text-gray-500">Use j/k to navigate, Enter to open</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
