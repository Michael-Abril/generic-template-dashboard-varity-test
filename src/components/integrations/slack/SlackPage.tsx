'use client';

import React, { useState, useEffect } from 'react';
import {
  Hash,
  Lock,
  Users,
  ChevronDown,
  Plus,
  Search,
  Bell,
  Clock,
  Bookmark,
  MoreHorizontal,
  Phone,
  Video,
  Info,
  Settings,
  X
} from 'lucide-react';
import { ChannelList } from './ChannelList';
import { MessageList } from './MessageList';
import { MessageComposer } from './MessageComposer';
import { ThreadPanel } from './ThreadPanel';
import {
  SlackChannel,
  SlackMessage,
  SlackUser,
  SlackChannelsResponse,
  SlackUsersResponse,
  SlackMessagesResponse,
  SlackPageProps
} from '@/types/slack';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function SlackPage({ walletAddress }: SlackPageProps) {
  const [selectedChannel, setSelectedChannel] = useState<SlackChannel | null>(null);
  const [selectedThread, setSelectedThread] = useState<SlackMessage | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [dms, setDms] = useState<SlackChannel[]>([]);
  const [messages, setMessages] = useState<SlackMessage[]>([]);
  const [allMessages, setAllMessages] = useState<SlackMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch channels and users via live API on mount
  useEffect(() => {
    const fetchLiveData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch channels and users in parallel via live API
        const [channelsRes, usersRes] = await Promise.all([
          fetch(`${API_URL}/api/v1/integrations/slack/channels?wallet_address=${walletAddress}`),
          fetch(`${API_URL}/api/v1/integrations/slack/users?wallet_address=${walletAddress}`)
        ]);

        if (!channelsRes.ok) {
          const err = await channelsRes.json();
          throw new Error(err.detail || 'Failed to fetch channels');
        }
        if (!usersRes.ok) {
          const err = await usersRes.json();
          throw new Error(err.detail || 'Failed to fetch users');
        }

        const channelsData = await channelsRes.json() as SlackChannelsResponse;
        const usersData = await usersRes.json() as SlackUsersResponse;

        const fetchedChannels = channelsData.channels || [];
        setChannels(fetchedChannels);

        // Create DM list from users
        const dmsList: SlackChannel[] = (usersData.users || []).map((user: SlackUser) => ({
          id: user.id,
          name: user.real_name || user.name,
          type: 'dm' as const,
          unread: 0,
          online: true,
          status_text: user.status_text,
          image_48: user.image_48
        }));
        setDms(dmsList);

        // Select first channel by default and fetch its messages
        if (fetchedChannels.length > 0) {
          const firstChannel = fetchedChannels[0];
          setSelectedChannel(firstChannel);
          await fetchMessagesForChannel(firstChannel.id);
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load workspace';
        console.error('Failed to fetch Slack data:', err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (walletAddress) {
      fetchLiveData();
    }
  }, [walletAddress]);

  // Fetch messages for a specific channel via live API
  const fetchMessagesForChannel = async (channelId: string) => {
    setMessagesLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/v1/integrations/slack/messages?wallet_address=${walletAddress}&channel=${channelId}`
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to fetch messages');
      }

      const data = await response.json() as SlackMessagesResponse;
      const fetchedMessages = data.messages || [];
      setMessages(fetchedMessages);
      setAllMessages(fetchedMessages); // For search within channel
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleChannelSelect = async (channel: SlackChannel) => {
    setSelectedChannel(channel);
    setSelectedThread(null);
    setSearchQuery('');

    // Fetch messages for selected channel via live API
    await fetchMessagesForChannel(channel.id);
  };

  const handleThreadSelect = (message: SlackMessage) => {
    setSelectedThread(message);
  };

  const handleSendMessage = async (text: string, files?: File[]) => {
    if (!selectedChannel) return;

    try {
      const response = await fetch(
        `${API_URL}/api/v1/integrations/slack/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet_address: walletAddress,
            channel: selectedChannel.id,
            text: text,
            thread_ts: selectedThread?.timestamp || undefined,
            reply_broadcast: false
          })
        }
      );

      if (response.ok) {
        // Refresh messages from server to get the new message
        await fetchMessagesForChannel(selectedChannel.id);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleReaction = async (messageTs: string, emoji: string) => {
    if (!selectedChannel) return;
    try {
      await fetch(
        `${API_URL}/api/v1/integrations/slack/reactions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet_address: walletAddress,
            channel: selectedChannel.id,
            timestamp: messageTs,
            emoji: emoji
          })
        }
      );
      // Refresh messages to show new reaction
      await fetchMessagesForChannel(selectedChannel.id);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      // Reset to all messages for current channel
      setMessages(allMessages);
      return;
    }

    // Search within current channel's messages
    const searchResults = allMessages.filter((m: SlackMessage) => {
      const text = m.text?.toLowerCase() || '';
      const user = m.user?.toLowerCase() || '';
      const searchTerm = query.toLowerCase();

      return text.includes(searchTerm) || user.includes(searchTerm);
    });

    setMessages(searchResults);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-purple-600 border-t-transparent mx-auto"></div>
          <p className="text-gray-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mb-4 h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <X className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-gray-900">Failed to load Slack</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar - Channel List */}
      <div className="w-64 bg-purple-900 text-white flex flex-col">
        {/* Workspace Header */}
        <div className="p-4 border-b border-purple-700">
          <button className="flex items-center justify-between w-full hover:bg-purple-800 rounded px-2 py-1">
            <span className="font-bold text-lg">My Workspace</span>
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-1">
            <button className="flex items-center gap-2 w-full px-3 py-1.5 rounded hover:bg-purple-800 text-sm">
              <Bell className="h-4 w-4" />
              Activity
            </button>
            <button className="flex items-center gap-2 w-full px-3 py-1.5 rounded hover:bg-purple-800 text-sm">
              <Clock className="h-4 w-4" />
              Later
            </button>
            <button className="flex items-center gap-2 w-full px-3 py-1.5 rounded hover:bg-purple-800 text-sm">
              <Bookmark className="h-4 w-4" />
              Saved items
            </button>
            <button className="flex items-center gap-2 w-full px-3 py-1.5 rounded hover:bg-purple-800 text-sm">
              <MoreHorizontal className="h-4 w-4" />
              More
            </button>
          </div>

          <div className="border-t border-purple-700 my-2"></div>

          {/* Channel List Component */}
          <ChannelList
            channels={channels}
            dms={dms}
            selectedChannel={selectedChannel}
            onSelectChannel={handleChannelSelect}
          />
        </div>
      </div>

      {/* Main Content - Messages */}
      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <>
            {/* Channel Header */}
            <div className="h-14 border-b border-gray-200 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedChannel.type === 'channel' ? (
                  selectedChannel.is_private ? (
                    <Lock className="h-5 w-5 text-gray-600" />
                  ) : (
                    <Hash className="h-5 w-5 text-gray-600" />
                  )
                ) : (
                  <div className="h-6 w-6 rounded bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
                    {selectedChannel.name[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="font-bold text-lg">{selectedChannel.name}</h2>
                  {selectedChannel.topic && (
                    <p className="text-xs text-gray-600">{selectedChannel.topic}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="p-2 hover:bg-gray-100 rounded relative group"
                  title="Coming Soon"
                >
                  <Phone className="h-5 w-5 text-gray-600" />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Phone calls - Coming Soon
                  </span>
                </button>
                <button
                  className="p-2 hover:bg-gray-100 rounded relative group"
                  title="Coming Soon"
                >
                  <Video className="h-5 w-5 text-gray-600" />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Video calls - Coming Soon
                  </span>
                </button>
                <button
                  className="p-2 hover:bg-gray-100 rounded"
                  onClick={() => setShowSearch(!showSearch)}
                >
                  <Search className="h-5 w-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded">
                  <Info className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            {showSearch && (
              <div className="border-b border-gray-200 p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => handleSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {searchQuery && (
                  <p className="mt-2 text-sm text-gray-600">
                    Found {messages.length} message{messages.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-hidden">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent mx-auto"></div>
                    <p className="text-sm text-gray-500">Loading messages...</p>
                  </div>
                </div>
              ) : (
                <MessageList
                  messages={messages}
                  onThreadClick={handleThreadSelect}
                  onReaction={handleReaction}
                />
              )}
            </div>

            {/* Message Composer */}
            <div className="border-t border-gray-200 p-4">
              <MessageComposer
                onSend={handleSendMessage}
                placeholder={`Message #${selectedChannel.name}`}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Hash className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-bold mb-2">Select a channel</h3>
              <p>Choose a channel from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Thread Panel (when thread is selected) */}
      {selectedThread && (
        <div className="w-96 border-l border-gray-200 bg-white flex flex-col">
          <div className="h-14 border-b border-gray-200 px-4 flex items-center justify-between">
            <h3 className="font-bold">Thread</h3>
            <button
              onClick={() => setSelectedThread(null)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <ThreadPanel
            thread={selectedThread}
            channelId={selectedChannel?.id || ''}
            walletAddress={walletAddress}
            onSendReply={(text, files) => handleSendMessage(text, files)}
            onReaction={handleReaction}
          />
        </div>
      )}
    </div>
  );
}
