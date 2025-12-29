'use client';

import React, { useState, useEffect } from 'react';
import { MessageComposer } from './MessageComposer';
import { Smile, MoreVertical, Bookmark, Share } from 'lucide-react';
import { SlackThreadMessage, ThreadPanelProps } from '@/types/slack';

export function ThreadPanel({
  thread,
  channelId,
  walletAddress,
  onSendReply,
  onReaction
}: ThreadPanelProps) {
  const [replies, setReplies] = useState<SlackThreadMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch thread replies from backend
    const fetchReplies = async () => {
      if (!thread || !thread.timestamp) {
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/slack/threads/${channelId}/${thread.timestamp}?wallet_address=${walletAddress}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch thread replies: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && data.data) {
          // Transform Slack messages to SlackThreadMessage format
          const transformedReplies: SlackThreadMessage[] = data.data
            .filter((msg: SlackThreadMessage) => msg.timestamp !== thread.timestamp) // Exclude parent message
            .map((msg: SlackThreadMessage) => ({
              id: msg.id || msg.timestamp,
              user: msg.user || 'Unknown',
              text: msg.text || '',
              timestamp: msg.timestamp,
              reactions: msg.reactions?.map((r) => ({
                emoji: r.emoji,
                count: r.count,
                users: r.users
              })) || []
            }));

          setReplies(transformedReplies);
        } else {
          setReplies([]);
        }
      } catch (error) {
        console.error('Failed to fetch thread replies:', error);
        setReplies([]);
      } finally {
        setLoading(false);
      }
    };

    if (thread) {
      fetchReplies();
    }
  }, [thread, channelId, walletAddress]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(parseFloat(timestamp) * 1000);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getUserAvatar = (userId: string) => {
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500'
    ];
    const colorIndex =
      userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) %
      colors.length;

    return (
      <div
        className={`h-9 w-9 rounded flex items-center justify-center text-white font-bold ${colors[colorIndex]}`}
      >
        {userId.substring(0, 2).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Original Message */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex gap-3">
          <div className="flex-shrink-0">{getUserAvatar(thread.user)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-bold text-gray-900">{thread.user}</span>
              <span className="text-xs text-gray-500">
                {formatTimestamp(thread.timestamp)}
              </span>
            </div>
            <div className="text-gray-900 break-words">{thread.text}</div>
            {thread.reactions && thread.reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {thread.reactions.map((reaction, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => onReaction(thread.timestamp, reaction.emoji)}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 text-sm"
                  >
                    <span>{reaction.emoji}</span>
                    <span className="text-gray-700 font-medium">
                      {reaction.count}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Replies Count */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
        {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
      </div>

      {/* Thread Replies */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="text-center text-gray-500 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-purple-600 mx-auto mb-2"></div>
            <p className="text-sm">Loading replies...</p>
          </div>
        ) : replies.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">No replies yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Be the first to reply to this thread
            </p>
          </div>
        ) : (
          replies.map((reply) => (
            <div key={reply.id} className="flex gap-3 group">
              <div className="flex-shrink-0">{getUserAvatar(reply.user)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-bold text-gray-900">{reply.user}</span>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(reply.timestamp)}
                  </span>
                </div>
                <div className="text-gray-900 break-words">{reply.text}</div>
                {reply.reactions && reply.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {reply.reactions.map((reaction, idx) => (
                      <button
                        key={idx}
                        onClick={() => onReaction(reply.timestamp, reaction.emoji)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 text-sm"
                      >
                        <span>{reaction.emoji}</span>
                        <span className="text-gray-700 font-medium">
                          {reaction.count}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Hover Actions */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-1">
                  <button
                    className="p-1 hover:bg-gray-100 rounded"
                    title="Add reaction"
                  >
                    <Smile className="h-4 w-4" />
                  </button>
                  <button className="p-1 hover:bg-gray-100 rounded" title="More">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reply Composer */}
      <div className="border-t border-gray-200 p-4">
        <MessageComposer
          onSend={onSendReply}
          placeholder="Reply to thread..."
        />
        <div className="mt-2">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" className="rounded" />
            <span>Also send to channel</span>
          </label>
        </div>
      </div>
    </div>
  );
}
