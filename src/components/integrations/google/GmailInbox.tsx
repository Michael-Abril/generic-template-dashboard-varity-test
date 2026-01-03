'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Mail,
  Star,
  Archive,
  Trash2,
  Send,
  Inbox,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Tag,
  Paperclip,
  Reply,
  ReplyAll,
  Forward,
  X,
  MailOpen,
  Clock,
  Pencil,
  Eye,
  EyeOff,
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { GmailInboxSkeleton, GmailRowSkeleton } from '@/components/ui/Skeleton';
import { EmailComposer } from './EmailComposer';
import type { GmailData, EmailPayload, EmailPart, GmailApiMessage } from '@/types/google';

interface GmailInboxProps {
  walletAddress: string;
  data: GmailData | null;
}

interface Email {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  body?: string;
  bodyHtml?: string;
  date: string;
  starred?: boolean;
  unread?: boolean;
  hasAttachment?: boolean;
  labels?: string[];
  payload?: EmailPayload;
}

interface EmailThread {
  threadId: string;
  emails: Email[];
  latestEmail: Email;
  emailCount: number;
  hasUnread: boolean;
  hasStarred: boolean;
  hasAttachment: boolean;
}

// Helper to decode base64 email body
const decodeEmailBody = (payload: EmailPayload | EmailPart | undefined): { text: string; html: string } => {
  let text = '';
  let html = '';

  if (!payload) return { text, html };

  // Check for body data directly
  if (payload.body?.data) {
    try {
      const decoded = atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      if (payload.mimeType === 'text/html') {
        html = decoded;
      } else {
        text = decoded;
      }
    } catch (e) {
      console.error('Failed to decode body:', e);
    }
  }

  // Check parts for multipart emails
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        try {
          text = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        } catch (e) {}
      }
      if (part.mimeType === 'text/html' && part.body?.data) {
        try {
          html = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        } catch (e) {}
      }
      // Recursively check nested parts
      if (part.parts) {
        const nested = decodeEmailBody(part);
        if (nested.text) text = nested.text;
        if (nested.html) html = nested.html;
      }
    }
  }

  return { text, html };
};

const LABELS = [
  { id: 'INBOX', label: 'Inbox', icon: Inbox, color: 'text-gray-600' },
  { id: 'STARRED', label: 'Starred', icon: Star, color: 'text-yellow-500' },
  { id: 'SENT', label: 'Sent', icon: Send, color: 'text-gray-600' },
  { id: 'DRAFTS', label: 'Drafts', icon: Mail, color: 'text-gray-600' },
  { id: 'TRASH', label: 'Trash', icon: Trash2, color: 'text-gray-600' },
  { id: 'ARCHIVE', label: 'Archive', icon: Archive, color: 'text-gray-600' },
];

export function GmailInbox({ walletAddress, data }: GmailInboxProps) {
  const [selectedLabel, setSelectedLabel] = useState('INBOX');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true); // Start loading until we verify wallet/fetch
  const [refreshing, setRefreshing] = useState(false);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [replyContext, setReplyContext] = useState<{ to: string; subject: string; type: 'reply' | 'replyAll' | 'forward' } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const EMAILS_PER_PAGE = 25;

  // Extract unique user labels from emails (excluding system labels)
  const userLabels = useMemo(() => {
    const systemLabels = new Set(['INBOX', 'SENT', 'DRAFT', 'DRAFTS', 'TRASH', 'SPAM', 'STARRED', 'IMPORTANT', 'CATEGORY_PERSONAL', 'CATEGORY_SOCIAL', 'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS', 'UNREAD']);
    const labelSet = new Set<string>();

    emails.forEach(email => {
      if (email.labels) {
        email.labels.forEach(label => {
          if (!systemLabels.has(label) && !label.startsWith('CATEGORY_')) {
            labelSet.add(label);
          }
        });
      }
    });

    return Array.from(labelSet).sort();
  }, [emails]);

  // Label colors for display
  const labelColors = ['bg-green-500', 'bg-purple-500', 'bg-blue-500', 'bg-yellow-500', 'bg-red-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];

  // Group emails into threads
  const emailThreads = useMemo(() => {
    const threadMap = new Map<string, EmailThread>();

    emails.forEach(email => {
      const threadId = email.threadId || email.id;

      if (!threadMap.has(threadId)) {
        threadMap.set(threadId, {
          threadId,
          emails: [email],
          latestEmail: email,
          emailCount: 1,
          hasUnread: email.unread || false,
          hasStarred: email.starred || false,
          hasAttachment: email.hasAttachment || false
        });
      } else {
        const thread = threadMap.get(threadId)!;
        thread.emails.push(email);
        thread.emailCount++;
        thread.hasUnread = thread.hasUnread || (email.unread || false);
        thread.hasStarred = thread.hasStarred || (email.starred || false);
        thread.hasAttachment = thread.hasAttachment || (email.hasAttachment || false);

        // Update latest email (assuming emails are in date order)
        const emailDate = new Date(email.date).getTime();
        const latestDate = new Date(thread.latestEmail.date).getTime();
        if (emailDate > latestDate) {
          thread.latestEmail = email;
        }
      }
    });

    return Array.from(threadMap.values());
  }, [emails]);

  // Parse advanced search query
  const parseSearchQuery = (query: string) => {
    const filters = {
      from: '',
      to: '',
      subject: '',
      hasAttachment: false,
      afterDate: null as Date | null,
      beforeDate: null as Date | null,
      generalQuery: ''
    };

    const parts = query.split(/\s+/);
    const generalParts: string[] = [];

    parts.forEach(part => {
      if (part.startsWith('from:')) {
        filters.from = part.substring(5).toLowerCase();
      } else if (part.startsWith('to:')) {
        filters.to = part.substring(3).toLowerCase();
      } else if (part.startsWith('subject:')) {
        filters.subject = part.substring(8).toLowerCase();
      } else if (part === 'has:attachment') {
        filters.hasAttachment = true;
      } else if (part.startsWith('after:')) {
        const dateStr = part.substring(6);
        filters.afterDate = new Date(dateStr);
      } else if (part.startsWith('before:')) {
        const dateStr = part.substring(7);
        filters.beforeDate = new Date(dateStr);
      } else {
        generalParts.push(part);
      }
    });

    filters.generalQuery = generalParts.join(' ').toLowerCase();
    return filters;
  };

  // Filter threads based on search query and selected label
  const filteredThreads = useMemo(() => {
    let filtered = emailThreads;

    // Filter by label
    if (selectedLabel !== 'INBOX') {
      filtered = filtered.filter(thread => {
        const email = thread.latestEmail;
        if (selectedLabel === 'STARRED') return thread.hasStarred;
        if (selectedLabel === 'SENT') return email.labels?.includes('SENT');
        if (selectedLabel === 'DRAFTS') return email.labels?.includes('DRAFT');
        if (selectedLabel === 'TRASH') return email.labels?.includes('TRASH');
        if (selectedLabel === 'ARCHIVE') return !email.labels?.includes('INBOX');
        // Handle custom user labels
        if (userLabels.includes(selectedLabel)) {
          return email.labels?.includes(selectedLabel);
        }
        // Handle category labels
        if (selectedLabel.startsWith('CATEGORY_')) {
          return email.labels?.includes(selectedLabel);
        }
        return true;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const filters = parseSearchQuery(searchQuery);

      filtered = filtered.filter(thread => {
        // Check all emails in thread for matches
        return thread.emails.some(email => {
          // From filter
          if (filters.from && !email.from.toLowerCase().includes(filters.from)) {
            return false;
          }

          // To filter
          if (filters.to && !email.to.toLowerCase().includes(filters.to)) {
            return false;
          }

          // Subject filter
          if (filters.subject && !email.subject.toLowerCase().includes(filters.subject)) {
            return false;
          }

          // Attachment filter
          if (filters.hasAttachment && !email.hasAttachment) {
            return false;
          }

          // Date filters
          if (filters.afterDate || filters.beforeDate) {
            const emailDate = new Date(email.date);
            if (filters.afterDate && emailDate < filters.afterDate) return false;
            if (filters.beforeDate && emailDate > filters.beforeDate) return false;
          }

          // General query
          if (filters.generalQuery) {
            return (
              email.from.toLowerCase().includes(filters.generalQuery) ||
              email.to.toLowerCase().includes(filters.generalQuery) ||
              email.subject.toLowerCase().includes(filters.generalQuery) ||
              email.snippet.toLowerCase().includes(filters.generalQuery)
            );
          }

          return true;
        });
      });
    }

    return filtered;
  }, [emailThreads, searchQuery, selectedLabel, userLabels]);

  // Paginate threads
  const totalPages = Math.ceil(filteredThreads.length / EMAILS_PER_PAGE);
  const paginatedThreads = useMemo(() => {
    const start = currentPage * EMAILS_PER_PAGE;
    return filteredThreads.slice(start, start + EMAILS_PER_PAGE);
  }, [filteredThreads, currentPage]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, selectedLabel]);

  // Fetch emails from live Gmail API
  const fetchEmailsFromAPI = useCallback(async () => {
    if (!walletAddress) {
      // Keep loading state if wallet isn't ready yet
      setLoading(true);
      return;
    }

    setLoading(true);
    setApiError(null);
    setHasFetchedOnce(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/google/emails?wallet_address=${walletAddress}&max_results=5000`
      );

      if (!response.ok) {
        if (response.status === 401) {
          setApiError('Google token expired. Please reconnect your Google account from the Marketplace.');
          throw new Error('Token expired');
        } else if (response.status === 404) {
          setApiError('Google account not connected. Please connect your Google account from the Marketplace.');
          throw new Error('Not connected');
        } else if (response.status === 403) {
          setApiError('Gmail access denied. Please reconnect with Gmail permissions enabled.');
          throw new Error('Permission denied');
        } else {
          setApiError(`Unable to load emails (Error ${response.status}). Please try again or reconnect from Marketplace.`);
          throw new Error(`Failed to fetch emails: ${response.status}`);
        }
      }

      const result = await response.json();
      const emailsData = result.emails || [];

      // Parse emails from API response
      const parsedEmails: Email[] = emailsData.map((msg: GmailApiMessage) => {
        // Decode email body from payload if present
        const { text, html } = decodeEmailBody(msg.payload);

        return {
          id: msg.id || `email-${Math.random().toString(36).substr(2, 9)}`,
          threadId: msg.threadId || msg.id,
          from: msg.from || 'Unknown Sender',
          to: msg.to || '',
          subject: msg.subject || '(No Subject)',
          snippet: msg.snippet || '',
          body: text || msg.body || msg.snippet || '',
          bodyHtml: html || msg.bodyHtml || '',
          date: msg.date || new Date().toLocaleString(),
          starred: msg.starred || false,
          unread: msg.unread !== false,  // Default to unread
          hasAttachment: msg.hasAttachment || false,
          labels: msg.labels || ['INBOX'],
          payload: msg.payload
        };
      });

      setEmails(parsedEmails);
    } catch (error) {
      console.error('Failed to fetch emails from API:', error);
      // Always set error message
      setApiError('Failed to load emails. Please try again.');
      // Fall back to data prop if API fails
      if (data?.messages) {
        const parsedEmails: Email[] = data.messages.map((msg) => {
          const { text, html } = decodeEmailBody(msg.payload);
          return {
            id: msg.id || `email-${Math.random().toString(36).substr(2, 9)}`,
            threadId: msg.threadId || msg.id,
            from: msg.from || 'Unknown Sender',
            to: msg.to || '',
            subject: msg.subject || '(No Subject)',
            snippet: msg.snippet || '',
            body: text || msg.body || msg.snippet || '',
            bodyHtml: html || msg.bodyHtml || '',
            date: msg.date || new Date().toLocaleString(),
            starred: msg.starred || false,
            unread: msg.unread !== false,
            hasAttachment: msg.hasAttachment || false,
            labels: msg.labels || ['INBOX'],
            payload: msg.payload
          };
        });
        setEmails(parsedEmails);
      } else {
        setEmails([]);
      }
    } finally {
      setLoading(false);
    }
  }, [walletAddress, data]);

  // Fetch emails on mount and when wallet changes
  useEffect(() => {
    fetchEmailsFromAPI();
  }, [fetchEmailsFromAPI]);

  // Explicit retry when wallet becomes available (handles race conditions)
  useEffect(() => {
    if (walletAddress && !hasFetchedOnce) {
      fetchEmailsFromAPI();
    }
  }, [walletAddress, hasFetchedOnce, fetchEmailsFromAPI]);

  const loadEmails = async () => {
    setRefreshing(true);
    await fetchEmailsFromAPI();
    setRefreshing(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Don't trigger if composer is open
      if (showComposer) return;

      switch (e.key.toLowerCase()) {
        case '?':
          // Show keyboard shortcuts help
          e.preventDefault();
          setShowKeyboardShortcuts(!showKeyboardShortcuts);
          break;
        case 'c':
          // Compose new email
          e.preventDefault();
          setReplyContext(null);
          setShowComposer(true);
          break;
        case 'e':
          // Archive selected or current email
          if (selectedEmail) {
            handleArchiveEmail(selectedEmail.id);
          } else if (selectedEmails.size > 0) {
            selectedEmails.forEach(id => handleArchiveEmail(id));
            setSelectedEmails(new Set());
          }
          break;
        case '#':
          // Delete selected or current email
          if (selectedEmail) {
            handleDeleteEmail(selectedEmail.id);
          }
          break;
        case 's':
          // Star/unstar selected email
          if (selectedEmail) {
            handleStarEmail(selectedEmail.id, selectedEmail.starred || false);
          }
          break;
        case 'j':
          // Move to next thread in list
          if (filteredThreads.length > 0) {
            const currentThread = selectedEmail ? filteredThreads.find(t => t.threadId === selectedEmail.threadId) : null;
            const currentIndex = currentThread ? filteredThreads.indexOf(currentThread) : -1;
            const nextIndex = Math.min(currentIndex + 1, filteredThreads.length - 1);
            setSelectedEmail(filteredThreads[nextIndex].latestEmail);
          }
          break;
        case 'k':
          // Move to previous thread in list
          if (filteredThreads.length > 0) {
            const currentThread = selectedEmail ? filteredThreads.find(t => t.threadId === selectedEmail.threadId) : null;
            const currentIndex = currentThread ? filteredThreads.indexOf(currentThread) : filteredThreads.length;
            const prevIndex = Math.max(currentIndex - 1, 0);
            setSelectedEmail(filteredThreads[prevIndex].latestEmail);
          }
          break;
        case 'escape':
          // Close email detail view or shortcuts modal
          if (showKeyboardShortcuts) {
            setShowKeyboardShortcuts(false);
          } else {
            setSelectedEmail(null);
          }
          break;
        case '/':
          // Focus search
          e.preventDefault();
          const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
          }
          break;
        case 'r':
          // Reply to email
          if (selectedEmail) {
            e.preventDefault();
            handleReply(selectedEmail, 'reply');
          }
          break;
        case 'a':
          // Reply all
          if (e.shiftKey && selectedEmail) {
            e.preventDefault();
            handleReply(selectedEmail, 'replyAll');
          }
          break;
        case 'f':
          // Forward
          if (selectedEmail) {
            e.preventDefault();
            handleReply(selectedEmail, 'forward');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEmail, selectedEmails, filteredThreads, showComposer, showKeyboardShortcuts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEmails();
    setRefreshing(false);
  };

  const handleStarEmail = async (emailId: string, starred: boolean) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/google/emails/${emailId}?wallet_address=${walletAddress}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ star: !starred })
        }
      );

      if (response.ok) {
        // Update local state
        setEmails(emails.map(e =>
          e.id === emailId ? { ...e, starred: !starred } : e
        ));
      }
    } catch (error) {
      console.error('Failed to star email:', error);
      alert('Failed to star email');
    }
  };

  const handleArchiveEmail = async (emailId: string) => {
    setActionLoading('archive');
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/google/emails/${emailId}?wallet_address=${walletAddress}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ archive: true })
        }
      );

      if (response.ok) {
        // Remove from inbox view
        setEmails(emails.filter(e => e.id !== emailId));
        if (selectedEmail?.id === emailId) {
          setSelectedEmail(null);
        }
      } else {
        // Optimistic update even if API fails
        setEmails(emails.filter(e => e.id !== emailId));
        if (selectedEmail?.id === emailId) {
          setSelectedEmail(null);
        }
      }
    } catch (error) {
      console.error('Failed to archive email:', error);
      // Still remove from view
      setEmails(emails.filter(e => e.id !== emailId));
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteEmail = async (emailId: string) => {
    if (!confirm('Are you sure you want to delete this email?')) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/google/emails/${emailId}?wallet_address=${walletAddress}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setEmails(emails.filter(e => e.id !== emailId));
        if (selectedEmail?.id === emailId) {
          setSelectedEmail(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete email:', error);
      alert('Failed to delete email');
    }
  };

  const handleMarkAsRead = async (emailId: string, unread: boolean) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/google/emails/${emailId}?wallet_address=${walletAddress}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mark_as_read: unread })
        }
      );

      if (response.ok) {
        setEmails(emails.map(e =>
          e.id === emailId ? { ...e, unread: !unread } : e
        ));
      }
    } catch (error) {
      console.error('Failed to update email:', error);
    }
  };

  const handleReply = (email: Email, type: 'reply' | 'replyAll' | 'forward' = 'reply') => {
    let subject = email.subject;
    if (type === 'forward' && !subject.toLowerCase().startsWith('fwd:')) {
      subject = `Fwd: ${subject}`;
    } else if ((type === 'reply' || type === 'replyAll') && !subject.toLowerCase().startsWith('re:')) {
      subject = `Re: ${subject}`;
    }

    setReplyContext({
      to: type === 'forward' ? '' : email.from,
      subject,
      type
    });
    setShowComposer(true);
  };

  const toggleEmailSelection = (emailId: string) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(emailId)) {
      newSelected.delete(emailId);
    } else {
      newSelected.add(emailId);
    }
    setSelectedEmails(newSelected);
  };

  const toggleThread = (threadId: string) => {
    const newExpanded = new Set(expandedThreads);
    if (newExpanded.has(threadId)) {
      newExpanded.delete(threadId);
    } else {
      newExpanded.add(threadId);
    }
    setExpandedThreads(newExpanded);
  };

  const renderEmailList = () => (
    <div className="flex-1 overflow-auto">
      {/* Search Bar */}
      <div className="sticky top-0 bg-white border-b px-4 py-3 z-10">
        <div className="mb-3">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2 border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search: Try 'from:john' or 'has:attachment' or 'after:2024-01-01'"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full text-gray-900 placeholder:text-gray-500"
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
          {searchQuery && (
            <div className="mt-1 px-2 text-xs text-gray-500">
              Search operators: from:, to:, subject:, has:attachment, after:YYYY-MM-DD, before:YYYY-MM-DD
            </div>
          )}
        </div>

        {/* Category Tabs (Gmail-style) */}
        {selectedLabel === 'INBOX' && (
          <div className="flex gap-4 mb-3 border-b border-gray-200 -mx-4 px-4">
            {['INBOX', 'CATEGORY_PRIMARY', 'CATEGORY_SOCIAL', 'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES'].map((category) => {
              const labels = {
                'INBOX': 'All',
                'CATEGORY_PRIMARY': 'Primary',
                'CATEGORY_SOCIAL': 'Social',
                'CATEGORY_PROMOTIONS': 'Promotions',
                'CATEGORY_UPDATES': 'Updates'
              };
              const isActive = selectedLabel === category;
              const count = category === 'INBOX'
                ? emailThreads.length
                : emailThreads.filter(t => t.latestEmail.labels?.includes(category)).length;

              return (
                <button
                  key={category}
                  onClick={() => setSelectedLabel(category)}
                  className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {labels[category as keyof typeof labels]}
                  {count > 0 && (
                    <span className={`ml-1 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                      ({count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              className="rounded border-gray-300 w-4 h-4"
              checked={selectedEmails.size > 0 && selectedEmails.size === filteredThreads.flatMap(t => t.emails).length}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedEmails(new Set(filteredThreads.flatMap(t => t.emails.map(e => e.id))));
                } else {
                  setSelectedEmails(new Set());
                }
              }}
            />
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50 text-gray-600 hover:text-gray-900 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowKeyboardShortcuts(true)}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-600 hover:text-gray-900 transition-colors"
              title="Keyboard shortcuts (?)"
            >
              <span className="text-sm font-medium">?</span>
            </button>
            {selectedEmails.size > 0 && (
              <>
                <div className="w-px h-5 bg-gray-300 mx-1"></div>
                <button
                  onClick={() => {
                    selectedEmails.forEach(id => handleArchiveEmail(id));
                    setSelectedEmails(new Set());
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-600 hover:text-gray-900 transition-colors"
                  title="Archive selected"
                >
                  <Archive className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete ${selectedEmails.size} selected emails?`)) {
                      selectedEmails.forEach(id => handleDeleteEmail(id));
                      setSelectedEmails(new Set());
                    }
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-600 hover:text-red-600 transition-colors"
                  title="Delete selected"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <span className="text-sm text-gray-500 ml-2">{selectedEmails.size} selected</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <span>
              {filteredThreads.length === 0
                ? '0 conversations'
                : `${currentPage * EMAILS_PER_PAGE + 1}-${Math.min((currentPage + 1) * EMAILS_PER_PAGE, filteredThreads.length)} of ${filteredThreads.length}`}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Email List */}
      {loading ? (
        <div className="divide-y divide-gray-100">
          {[...Array(10)].map((_, i) => (
            <GmailRowSkeleton key={i} />
          ))}
        </div>
      ) : apiError ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="p-4 bg-red-100 rounded-full mb-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Unable to load emails
          </h3>
          <p className="text-gray-600 text-center max-w-sm mb-4">
            {apiError}
          </p>
          <div className="flex gap-3">
            {/* Show reconnect button for token-related errors */}
            {(apiError.toLowerCase().includes('expired') ||
              apiError.toLowerCase().includes('reconnect') ||
              apiError.toLowerCase().includes('not connected') ||
              apiError.toLowerCase().includes('permission denied')) && (
              <a
                href="/marketplace"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium"
              >
                <RefreshCw className="h-4 w-4" />
                Reconnect Google
              </a>
            )}
            <button
              onClick={loadEmails}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </div>
        </div>
      ) : paginatedThreads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="p-4 bg-gray-100 rounded-full mb-4">
            {searchQuery ? (
              <Search className="h-12 w-12 text-gray-400" />
            ) : (
              <MailOpen className="h-12 w-12 text-gray-400" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery ? 'No emails found' : selectedLabel !== 'INBOX' ? `No ${selectedLabel.toLowerCase()} emails` : 'No emails yet'}
          </h3>
          <p className="text-gray-600 text-center max-w-sm">
            {searchQuery
              ? `No emails match "${searchQuery}". Try a different search term.`
              : 'Your Gmail inbox will appear here after syncing.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {paginatedThreads.map((thread) => {
            const isExpanded = expandedThreads.has(thread.threadId);
            const displayEmails = isExpanded ? thread.emails : [thread.latestEmail];

            return (
              <div key={thread.threadId}>
                {displayEmails.map((email, index) => (
            <div
              key={email.id}
              className={`
                group flex items-center gap-2 px-4 py-2.5 cursor-pointer transition-all border-l-4
                ${email.unread
                  ? 'bg-white border-l-blue-500 hover:shadow-[0_1px_3px_rgba(0,0,0,0.12)]'
                  : 'bg-white border-l-transparent hover:shadow-[0_1px_3px_rgba(0,0,0,0.08)]'}
                ${selectedEmails.has(email.id) ? 'bg-blue-50' : ''}
              `}
              onClick={() => {
                setSelectedEmail(email);
                if (email.unread) {
                  handleMarkAsRead(email.id, true);
                }
              }}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                className="rounded border-gray-300 w-4 h-4"
                checked={selectedEmails.has(email.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleEmailSelection(email.id);
                }}
              />

              {/* Star */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStarEmail(email.id, email.starred || false);
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <Star className={`h-4 w-4 transition-all ${email.starred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`} />
              </button>

              {/* Email Content */}
              <div className="flex-1 min-w-0 flex items-center gap-3">
                {/* Sender */}
                <span className={`w-48 truncate text-sm ${email.unread ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                  {email.from.split('<')[0].trim()}
                </span>

                {/* Subject & Snippet */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className={`truncate text-sm ${email.unread ? 'font-semibold text-gray-900' : 'text-gray-800'}`}>
                    {email.subject}
                    {index === 0 && thread.emailCount > 1 && (
                      <span className="ml-2 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                        {thread.emailCount}
                      </span>
                    )}
                  </span>
                  <span className="text-gray-400 text-sm">-</span>
                  <span className="text-sm text-gray-500 truncate flex-1">{email.snippet}</span>
                </div>

                {/* Attachment indicator */}
                {email.hasAttachment && (
                  <Paperclip className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}
              </div>

              {/* Date (hidden on hover) / Hover Actions (shown on hover) */}
              <div className="flex items-center gap-1 min-w-[140px] justify-end">
                {/* Date - visible by default, hidden on hover */}
                <span className="text-xs text-gray-500 whitespace-nowrap group-hover:hidden">
                  {email.date}
                </span>

                {/* Hover Actions - hidden by default, shown on hover */}
                <div className="hidden group-hover:flex items-center gap-0.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleArchiveEmail(email.id);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 transition-colors"
                    title="Archive"
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEmail(email.id);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(email.id, email.unread || false);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 transition-colors"
                    title={email.unread ? 'Mark as read' : 'Mark as unread'}
                  >
                    {email.unread ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Snooze - hide from view for now (simple implementation)
                      const snoozedEmails = JSON.parse(localStorage.getItem('snoozedEmails') || '[]');
                      snoozedEmails.push({
                        id: email.id,
                        snoozeUntil: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString() // 3 hours
                      });
                      localStorage.setItem('snoozedEmails', JSON.stringify(snoozedEmails));
                      setEmails(emails.filter(e => e.id !== email.id));
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 transition-colors"
                    title="Snooze for 3 hours"
                  >
                    <Clock className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
                ))}

                {/* Thread expand/collapse button */}
                {thread.emailCount > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleThread(thread.threadId);
                    }}
                    className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-1"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronLeft className="h-4 w-4" />
                        <span>Hide {thread.emailCount - 1} older message{thread.emailCount - 1 > 1 ? 's' : ''}</span>
                      </>
                    ) : (
                      <>
                        <ChevronRight className="h-4 w-4" />
                        <span>Show {thread.emailCount - 1} older message{thread.emailCount - 1 > 1 ? 's' : ''}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderEmailDetail = () => {
    if (!selectedEmail) return null;

    // Extract attachments from payload
    const extractAttachments = (payload: EmailPayload | undefined): Array<{ filename: string; mimeType: string; size: number; attachmentId?: string }> => {
      const attachments: Array<{ filename: string; mimeType: string; size: number; attachmentId?: string }> = [];

      if (!payload) return attachments;

      const processPayload = (part: EmailPayload | EmailPart) => {
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            filename: part.filename,
            mimeType: part.mimeType || 'application/octet-stream',
            size: part.body?.size || 0,
            attachmentId: part.body.attachmentId
          });
        }

        if (part.parts) {
          part.parts.forEach(processPayload);
        }
      };

      processPayload(payload);
      return attachments;
    };

    const attachments = extractAttachments(selectedEmail.payload);

    const formatFileSize = (bytes: number): string => {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const getFileIcon = (mimeType: string) => {
      if (mimeType.startsWith('image/')) return '🖼️';
      if (mimeType.startsWith('video/')) return '🎥';
      if (mimeType.startsWith('audio/')) return '🎵';
      if (mimeType.includes('pdf')) return '📄';
      if (mimeType.includes('zip') || mimeType.includes('compressed')) return '📦';
      if (mimeType.includes('document') || mimeType.includes('word')) return '📝';
      if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
      if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
      return '📎';
    };

    return (
      <div className="flex-1 bg-white flex flex-col">
        {/* Email Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-start justify-between mb-4">
            <button
              onClick={() => setSelectedEmail(null)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleArchiveEmail(selectedEmail.id)}
                disabled={actionLoading === 'archive'}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
                title="Archive"
              >
                <Archive className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleDeleteEmail(selectedEmail.id)}
                className="p-2 hover:bg-red-50 rounded-lg text-gray-600 hover:text-red-600 transition-colors"
                title="Delete"
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleStarEmail(selectedEmail.id, selectedEmail.starred || false)}
                className="p-2 hover:bg-yellow-50 rounded-lg transition-colors"
                title={selectedEmail.starred ? 'Unstar' : 'Star'}
              >
                <Star className={`h-5 w-5 ${selectedEmail.starred ? 'fill-yellow-500 text-yellow-500' : 'text-gray-600 hover:text-yellow-500'}`} />
              </button>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{selectedEmail.subject}</h1>
          <div className="flex items-start justify-between bg-gray-50 rounded-lg p-4">
            <div>
              <p className="font-bold text-gray-900">{selectedEmail.from}</p>
              <p className="text-sm text-gray-600">to {selectedEmail.to || 'me'}</p>
            </div>
            <p className="text-sm font-medium text-gray-700">{selectedEmail.date}</p>
          </div>
        </div>

        {/* Email Body */}
        <div className="flex-1 overflow-auto px-6 py-6">
          {selectedEmail.bodyHtml ? (
            <div
              className="prose max-w-none text-gray-900"
              dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
            />
          ) : (
            <div className="prose max-w-none">
              <p className="text-gray-900 leading-relaxed whitespace-pre-wrap text-base">
                {selectedEmail.body || selectedEmail.snippet}
              </p>
            </div>
          )}

          {/* Attachments Section */}
          {attachments.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments ({attachments.length})
              </h3>
              <div className="space-y-2">
                {attachments.map((attachment, index) => (
                  <a
                    key={index}
                    href={`${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/google/emails/${selectedEmail.id}/attachments/${attachment.attachmentId}?wallet_address=${walletAddress}`}
                    download={attachment.filename}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors group"
                  >
                    <span className="text-2xl">{getFileIcon(attachment.mimeType)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{attachment.filename}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(attachment.size)} • {attachment.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
                      </p>
                    </div>
                    <button className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md group-hover:bg-blue-100 transition-colors">
                      Download
                    </button>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center gap-3 bg-gray-50">
          <button
            onClick={() => handleReply(selectedEmail, 'reply')}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Reply className="h-4 w-4" />
            Reply
          </button>
          <button
            onClick={() => handleReply(selectedEmail, 'replyAll')}
            className="flex items-center gap-2 px-5 py-2.5 border-2 border-gray-200 text-gray-800 rounded-lg hover:bg-white hover:border-gray-300 transition-colors font-medium"
          >
            <ReplyAll className="h-4 w-4" />
            Reply All
          </button>
          <button
            onClick={() => handleReply(selectedEmail, 'forward')}
            className="flex items-center gap-2 px-5 py-2.5 border-2 border-gray-200 text-gray-800 rounded-lg hover:bg-white hover:border-gray-300 transition-colors font-medium"
          >
            <Forward className="h-4 w-4" />
            Forward
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* API Error Banner */}
      {apiError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm font-medium">{apiError}</span>
          </div>
          <button
            onClick={() => setApiError(null)}
            className="text-red-500 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 bg-white flex flex-col">
        {/* Gmail-style Compose FAB Button */}
        <div className="p-4">
          <button
            onClick={() => {
              setReplyContext(null);
              setShowComposer(true);
            }}
            className="flex items-center gap-3 w-full px-6 py-3.5 bg-white border border-gray-200 rounded-2xl shadow-md hover:shadow-lg hover:bg-gray-50 transition-all group"
          >
            <div className="relative">
              <Pencil className="h-5 w-5 text-gray-700 group-hover:text-blue-600 transition-colors" />
            </div>
            <span className="text-gray-800 font-medium text-[15px]">Compose</span>
          </button>
        </div>

        {/* Labels Navigation */}
        <div className="flex-1 overflow-auto px-2">
          <div className="space-y-0.5">
            {LABELS.map((label) => {
              const Icon = label.icon;
              const isActive = selectedLabel === label.id;
              const unreadCount = label.id === 'INBOX' ? emails.filter(e => e.unread).length : 0;
              return (
                <button
                  key={label.id}
                  onClick={() => setSelectedLabel(label.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2 rounded-r-full transition-all
                    ${isActive
                      ? 'bg-blue-100 text-blue-800 font-semibold'
                      : 'hover:bg-gray-100 text-gray-700 font-medium'
                    }
                  `}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-blue-700' : label.color}`} />
                  <span className="flex-1 text-left text-[14px]">{label.label}</span>
                  {unreadCount > 0 && label.id === 'INBOX' && (
                    <span className="text-xs font-bold text-blue-600">{unreadCount}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Labels Section */}
          {userLabels.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Labels</div>
              <div className="space-y-0.5">
                {userLabels.map((label, index) => {
                  const isActive = selectedLabel === label;
                  const labelCount = emails.filter(e => e.labels?.includes(label)).length;
                  return (
                    <button
                      key={label}
                      onClick={() => setSelectedLabel(label)}
                      className={`w-full flex items-center gap-3 px-4 py-2 rounded-r-full transition-all ${
                        isActive
                          ? 'bg-blue-100 text-blue-800 font-semibold'
                          : 'hover:bg-gray-100 text-gray-700 font-medium'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full ${labelColors[index % labelColors.length]}`}></div>
                      <span className="flex-1 text-left text-[14px] truncate">{label.replace('Label_', '').replace(/_/g, ' ')}</span>
                      {labelCount > 0 && (
                        <span className="text-xs text-gray-500">{labelCount}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Categories Section */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Categories</div>
            <div className="space-y-0.5">
              {['Primary', 'Social', 'Promotions', 'Updates'].map((category) => {
                const categoryLabel = `CATEGORY_${category.toUpperCase()}`;
                const categoryCount = emails.filter(e => e.labels?.includes(categoryLabel)).length;
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedLabel(categoryLabel)}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-r-full transition-all ${
                      selectedLabel === categoryLabel
                        ? 'bg-blue-100 text-blue-800 font-semibold'
                        : 'hover:bg-gray-100 text-gray-700 font-medium'
                    }`}
                  >
                    <Tag className={`h-4 w-4 ${selectedLabel === categoryLabel ? 'text-blue-700' : 'text-gray-500'}`} />
                    <span className="flex-1 text-left text-[14px]">{category}</span>
                    {categoryCount > 0 && (
                      <span className="text-xs text-gray-500">{categoryCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {selectedEmail ? renderEmailDetail() : renderEmailList()}
      </div>

      {/* Email Composer Modal */}
      {showComposer && (
        <EmailComposer
          walletAddress={walletAddress}
          onClose={() => {
            setShowComposer(false);
            setReplyContext(null);
          }}
          replyTo={replyContext ? {
            to: replyContext.to,
            subject: replyContext.subject,
            threadId: selectedEmail?.threadId
          } : undefined}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      {showKeyboardShortcuts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Keyboard Shortcuts</h2>
              <button
                onClick={() => setShowKeyboardShortcuts(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Compose & Actions</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Compose email</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">c</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Reply</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">r</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Reply all</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">Shift + a</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Forward</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">f</kbd>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Navigation</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Next conversation</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">j</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Previous conversation</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">k</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Search</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">/</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Close / Go back</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">Esc</kbd>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Email Management</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Archive</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">e</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Delete</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">#</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Star / Unstar</span>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">s</kbd>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Search Operators</h3>
                  <div className="space-y-2 text-sm">
                    <div className="text-gray-600">
                      <code className="bg-gray-100 px-1 rounded">from:name</code> - From sender
                    </div>
                    <div className="text-gray-600">
                      <code className="bg-gray-100 px-1 rounded">to:name</code> - To recipient
                    </div>
                    <div className="text-gray-600">
                      <code className="bg-gray-100 px-1 rounded">subject:text</code> - In subject
                    </div>
                    <div className="text-gray-600">
                      <code className="bg-gray-100 px-1 rounded">has:attachment</code> - Has files
                    </div>
                    <div className="text-gray-600">
                      <code className="bg-gray-100 px-1 rounded">after:2024-01-01</code> - After date
                    </div>
                    <div className="text-gray-600">
                      <code className="bg-gray-100 px-1 rounded">before:2024-12-31</code> - Before date
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-gray-500 text-center">
                  Press <kbd className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">?</kbd> anytime to show/hide shortcuts
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
