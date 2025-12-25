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
  Filter,
  Tag,
  MoreVertical,
  Paperclip,
  Reply,
  ReplyAll,
  Forward,
  Download,
  X,
  MailOpen,
  MailWarning,
  Clock,
  Pencil,
  Eye,
  EyeOff
} from 'lucide-react';
import { EmailComposer } from './EmailComposer';

interface GmailInboxProps {
  walletAddress: string;
  data: any;
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
  payload?: any;
}

// Helper to decode base64 email body
const decodeEmailBody = (payload: any): { text: string; html: string } => {
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
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [replyContext, setReplyContext] = useState<{ to: string; subject: string; type: 'reply' | 'replyAll' | 'forward' } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
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

  // Filter emails based on search query and selected label
  const filteredEmails = useMemo(() => {
    let filtered = emails;

    // Filter by label
    if (selectedLabel !== 'INBOX') {
      filtered = filtered.filter(email => {
        if (selectedLabel === 'STARRED') return email.starred;
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
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(email =>
        email.from.toLowerCase().includes(query) ||
        email.to.toLowerCase().includes(query) ||
        email.subject.toLowerCase().includes(query) ||
        email.snippet.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [emails, searchQuery, selectedLabel]);

  // Paginate emails
  const totalPages = Math.ceil(filteredEmails.length / EMAILS_PER_PAGE);
  const paginatedEmails = useMemo(() => {
    const start = currentPage * EMAILS_PER_PAGE;
    return filteredEmails.slice(start, start + EMAILS_PER_PAGE);
  }, [filteredEmails, currentPage]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, selectedLabel]);

  // Fetch emails from live Gmail API
  const fetchEmailsFromAPI = useCallback(async () => {
    if (!walletAddress) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/google/emails?wallet_address=${walletAddress}&max_results=5000`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch emails: ${response.status}`);
      }

      const result = await response.json();
      const emailsData = result.emails || [];

      // Parse emails from API response
      const parsedEmails = emailsData.map((msg: any) => {
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
      // Fall back to data prop if API fails
      if (data?.messages) {
        const parsedEmails = data.messages.map((msg: any) => {
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
          // Move to next email in list
          if (filteredEmails.length > 0) {
            const currentIndex = selectedEmail
              ? filteredEmails.findIndex(e => e.id === selectedEmail.id)
              : -1;
            const nextIndex = Math.min(currentIndex + 1, filteredEmails.length - 1);
            setSelectedEmail(filteredEmails[nextIndex]);
          }
          break;
        case 'k':
          // Move to previous email in list
          if (filteredEmails.length > 0) {
            const currentIndex = selectedEmail
              ? filteredEmails.findIndex(e => e.id === selectedEmail.id)
              : filteredEmails.length;
            const prevIndex = Math.max(currentIndex - 1, 0);
            setSelectedEmail(filteredEmails[prevIndex]);
          }
          break;
        case 'escape':
          // Close email detail view
          setSelectedEmail(null);
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
  }, [selectedEmail, selectedEmails, filteredEmails, showComposer]);

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

  const renderEmailList = () => (
    <div className="flex-1 overflow-auto">
      {/* Search Bar */}
      <div className="sticky top-0 bg-white border-b px-4 py-3 z-10">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2 border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all mb-3">
          <Search className="h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search emails by sender, subject, or content..."
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

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              className="rounded border-gray-300 w-4 h-4"
              checked={selectedEmails.size > 0 && selectedEmails.size === filteredEmails.length}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedEmails(new Set(filteredEmails.map(e => e.id)));
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
              {filteredEmails.length === 0
                ? '0 results'
                : `${currentPage * EMAILS_PER_PAGE + 1}-${Math.min((currentPage + 1) * EMAILS_PER_PAGE, filteredEmails.length)} of ${filteredEmails.length}`}
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
      {paginatedEmails.length === 0 ? (
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
          {paginatedEmails.map((email) => (
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
        </div>
      )}
    </div>
  );

  const renderEmailDetail = () => {
    if (!selectedEmail) return null;

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
    <div className="flex h-[calc(100vh-200px)] bg-white rounded-lg border border-gray-200 overflow-hidden">
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
    </div>
  );
}
