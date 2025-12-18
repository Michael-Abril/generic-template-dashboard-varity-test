'use client';

import { useState, useEffect } from 'react';
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
  X
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
  date: string;
  starred?: boolean;
  unread?: boolean;
  hasAttachment?: boolean;
  labels?: string[];
  payload?: any;
}

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

  // Load emails from data prop (already fetched by parent)
  useEffect(() => {
    if (data?.messages) {
      // Data is already synced from Google - use the data prop
      const parsedEmails = data.messages.map((msg: any) => ({
        id: msg.id || `email-${Math.random().toString(36).substr(2, 9)}`,
        threadId: msg.threadId || msg.id,
        from: msg.from || 'Unknown Sender',
        to: msg.to || '',
        subject: msg.subject || '(No Subject)',
        snippet: msg.snippet || '',
        date: msg.date || new Date().toLocaleString(),
        starred: msg.starred || false,
        unread: msg.unread !== false,  // Default to unread
        hasAttachment: msg.hasAttachment || false,
        labels: msg.labels || ['INBOX'],
        payload: msg.payload
      }));
      setEmails(parsedEmails);
      setLoading(false);
    } else {
      // No data synced yet
      setEmails([]);
      setLoading(false);
    }
  }, [data]);

  const loadEmails = async () => {
    // Refresh by calling parent's onRefresh if available
    // For now, just use the data prop
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

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
    // Gmail Archive = Remove INBOX label
    console.log('Archive email:', emailId);
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

  const handleReply = (email: Email) => {
    setShowComposer(true);
    // Pre-fill composer with reply data
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
      {/* Toolbar */}
      <div className="sticky top-0 bg-white border-b px-4 py-2 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            className="rounded"
            checked={selectedEmails.size > 0 && selectedEmails.size === emails.length}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedEmails(new Set(emails.map(e => e.id)));
              } else {
                setSelectedEmails(new Set());
              }
            }}
          />
          <button
            onClick={() => setShowComposer(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Mail className="h-4 w-4" />
            <span className="hidden md:inline">Compose</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>1-{emails.length} of {emails.length}</span>
          <button className="p-1 hover:bg-gray-100 rounded">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="p-1 hover:bg-gray-100 rounded">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Email List */}
      <div className="divide-y">
        {emails.map((email) => (
          <div
            key={email.id}
            className={`
              flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors
              ${email.unread ? 'bg-blue-50' : 'bg-white'}
              ${selectedEmails.has(email.id) ? 'bg-blue-100' : ''}
            `}
            onClick={() => setSelectedEmail(email)}
          >
            <input
              type="checkbox"
              className="rounded"
              checked={selectedEmails.has(email.id)}
              onChange={(e) => {
                e.stopPropagation();
                toggleEmailSelection(email.id);
              }}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStarEmail(email.id, email.starred || false);
              }}
              className="p-1"
            >
              <Star className={`h-4 w-4 ${email.starred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold truncate ${email.unread ? 'text-gray-900' : 'text-gray-700'}`}>
                      {email.from}
                    </span>
                    {email.hasAttachment && <Paperclip className="h-3 w-3 text-gray-400" />}
                  </div>
                  <p className={`truncate ${email.unread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                    {email.subject}
                  </p>
                  <p className="text-sm text-gray-500 truncate">{email.snippet}</p>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">{email.date}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderEmailDetail = () => {
    if (!selectedEmail) return null;

    return (
      <div className="flex-1 bg-white flex flex-col">
        {/* Email Header */}
        <div className="border-b px-6 py-4">
          <div className="flex items-start justify-between mb-4">
            <button
              onClick={() => setSelectedEmail(null)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleArchiveEmail(selectedEmail.id)}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Archive"
              >
                <Archive className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleDeleteEmail(selectedEmail.id)}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Delete"
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleStarEmail(selectedEmail.id, selectedEmail.starred || false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Star"
              >
                <Star className={`h-5 w-5 ${selectedEmail.starred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
              </button>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{selectedEmail.subject}</h1>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-gray-900">{selectedEmail.from}</p>
              <p className="text-sm text-gray-500">to {selectedEmail.to}</p>
            </div>
            <p className="text-sm text-gray-500">{selectedEmail.date}</p>
          </div>
        </div>

        {/* Email Body */}
        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="prose max-w-none">
            <p>{selectedEmail.snippet}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t px-6 py-4 flex items-center gap-2">
          <button
            onClick={() => handleReply(selectedEmail)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Reply className="h-4 w-4" />
            Reply
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
            <ReplyAll className="h-4 w-4" />
            Reply All
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
            <Forward className="h-4 w-4" />
            Forward
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-200px)] bg-white rounded-lg border overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r bg-gray-50 p-4">
        <div className="space-y-1">
          {LABELS.map((label) => {
            const Icon = label.icon;
            const isActive = selectedLabel === label.id;
            return (
              <button
                key={label.id}
                onClick={() => setSelectedLabel(label.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors
                  ${isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'hover:bg-gray-100 text-gray-700'
                  }
                `}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-blue-700' : label.color}`} />
                <span className="font-medium">{label.label}</span>
              </button>
            );
          })}
        </div>

        {/* Labels Section */}
        <div className="mt-6">
          <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Labels</div>
          <div className="space-y-1">
            <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">
              <Tag className="h-4 w-4 text-green-500" />
              <span className="font-medium">Personal</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700">
              <Tag className="h-4 w-4 text-purple-500" />
              <span className="font-medium">Work</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {selectedEmail ? renderEmailDetail() : renderEmailList()}

      {/* Email Composer Modal */}
      {showComposer && (
        <EmailComposer
          walletAddress={walletAddress}
          onClose={() => setShowComposer(false)}
        />
      )}
    </div>
  );
}
