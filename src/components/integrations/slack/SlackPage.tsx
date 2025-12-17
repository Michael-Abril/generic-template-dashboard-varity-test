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

interface SlackPageProps {
  walletAddress: string;
  data: any;
}

export function SlackPage({ walletAddress, data }: SlackPageProps) {
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [channels, setChannels] = useState<any[]>([]);
  const [dms, setDms] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (data) {
      // Process data from backend
      const channelsData = data.data?.channels?.records || [];
      const messagesData = data.data?.messages?.records || [];
      const usersData = data.data?.users?.records || [];

      setChannels(channelsData.filter((c: any) => c.type === 'channel'));

      // Create DM list from users
      const dmsList = usersData.map((user: any) => ({
        id: user.id,
        name: user.real_name || user.name,
        type: 'dm',
        unread: 0,
        online: true,
        status_text: user.status_text
      }));
      setDms(dmsList);

      // Select first channel by default
      if (channelsData.length > 0) {
        setSelectedChannel(channelsData[0]);
        // Filter messages for this channel
        const channelMessages = messagesData.filter(
          (m: any) => m.channel_id === channelsData[0].id
        );
        setMessages(channelMessages);
      }

      setLoading(false);
    }
  }, [data]);

  const handleChannelSelect = (channel: any) => {
    setSelectedChannel(channel);
    setSelectedThread(null);

    // Filter messages for selected channel
    const channelMessages = data?.data?.messages?.records?.filter(
      (m: any) => m.channel_id === channel.id
    ) || [];
    setMessages(channelMessages);
  };

  const handleThreadSelect = (message: any) => {
    setSelectedThread(message);
  };

  const handleSendMessage = async (text: string, files?: File[]) => {
    if (!selectedChannel) return;

    try {
      const formData = new FormData();
      formData.append('channel', selectedChannel.id);
      formData.append('text', text);
      formData.append('wallet_address', walletAddress);

      if (selectedThread) {
        formData.append('thread_ts', selectedThread.timestamp);
      }

      if (files && files.length > 0) {
        files.forEach(file => formData.append('files', file));
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/slack/messages`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (response.ok) {
        // Refresh messages
        const newMessage = await response.json();
        setMessages([...messages, newMessage.data]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleReaction = async (messageTs: string, emoji: string) => {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/slack/reactions`,
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
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
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
                <button className="p-2 hover:bg-gray-100 rounded">
                  <Phone className="h-5 w-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded">
                  <Video className="h-5 w-5 text-gray-600" />
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

            {/* Messages */}
            <div className="flex-1 overflow-hidden">
              <MessageList
                messages={messages}
                onThreadClick={handleThreadSelect}
                onReaction={handleReaction}
              />
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
            onSendReply={(text, files) => handleSendMessage(text, files)}
            onReaction={handleReaction}
          />
        </div>
      )}
    </div>
  );
}
