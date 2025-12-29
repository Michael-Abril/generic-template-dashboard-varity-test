'use client';

import React, { useRef, useEffect, useState } from 'react';
import {
  MoreVertical,
  Smile,
  MessageSquare,
  Bookmark,
  Share,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Download
} from 'lucide-react';
import { SlackMessage, MessageListProps } from '@/types/slack';

export function MessageList({
  messages,
  onThreadClick,
  onReaction
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(parseFloat(timestamp) * 1000);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  const getUserAvatar = (userId: string) => {
    // Generate a color based on user ID
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500'
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

  const formatMessageText = (text: string) => {
    // Basic markdown-style formatting for Slack
    // Convert *bold* to <strong>
    let formatted = text.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
    // Convert _italic_ to <em>
    formatted = formatted.replace(/_(.*?)_/g, '<em>$1</em>');
    // Convert ~strikethrough~ to <del>
    formatted = formatted.replace(/~(.*?)~/g, '<del>$1</del>');
    // Convert `code` to <code>
    formatted = formatted.replace(/`(.*?)`/g, '<code class="bg-gray-100 text-red-600 px-1 rounded">$1</code>');

    return formatted;
  };

  const commonEmojis = ['👍', '❤️', '😂', '😊', '🎉', '👀', '🔥', '✅'];

  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="text-center text-gray-500">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-bold mb-2">No messages yet</h3>
          <p>Be the first to send a message in this channel</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className="group hover:bg-gray-50 -mx-4 px-4 py-2 relative"
          onMouseEnter={() => setHoveredMessage(message.id)}
          onMouseLeave={() => setHoveredMessage(null)}
        >
          <div className="flex gap-3">
            {/* Avatar */}
            <div className="flex-shrink-0">{getUserAvatar(message.user)}</div>

            {/* Message Content */}
            <div className="flex-1 min-w-0">
              {/* User and Timestamp */}
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-bold text-gray-900">{message.user}</span>
                <span className="text-xs text-gray-500">
                  {formatTimestamp(message.timestamp)}
                </span>
              </div>

              {/* Message Text */}
              <div
                className="text-gray-900 break-words"
                dangerouslySetInnerHTML={{
                  __html: formatMessageText(message.text || '')
                }}
              />

              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-2 space-y-2">
                  {message.attachments.map((attachment, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded p-3 bg-white"
                    >
                      <div className="flex items-center gap-2">
                        {attachment.mimetype?.startsWith('image/') ? (
                          <ImageIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <FileText className="h-5 w-5 text-gray-400" />
                        )}
                        <span className="text-sm font-medium">
                          {attachment.name || 'Attachment'}
                        </span>
                        <Download className="h-4 w-4 ml-auto text-gray-400 hover:text-gray-600 cursor-pointer" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reactions */}
              {message.reactions && message.reactions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {message.reactions.map((reaction, idx) => (
                    <button
                      key={idx}
                      onClick={() => onReaction(message.timestamp, reaction.emoji)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 text-sm"
                    >
                      <span>{reaction.emoji}</span>
                      <span className="text-gray-700 font-medium">
                        {reaction.count}
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={() => setShowEmojiPicker(message.id)}
                    className="inline-flex items-center px-2 py-1 hover:bg-gray-100 rounded border border-gray-200 text-sm"
                  >
                    <Smile className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
              )}

              {/* Thread Reply Count */}
              {message.reply_count && message.reply_count > 0 && (
                <button
                  onClick={() => onThreadClick(message)}
                  className="mt-2 flex items-center gap-2 text-sm text-blue-600 hover:underline"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>{message.reply_count} {message.reply_count === 1 ? 'reply' : 'replies'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Hover Actions */}
          {hoveredMessage === message.id && (
            <div className="absolute top-0 right-4 -mt-3 flex items-center gap-1 bg-white border border-gray-200 rounded shadow-lg">
              <button
                onClick={() => setShowEmojiPicker(message.id)}
                className="p-2 hover:bg-gray-100 rounded"
                title="Add reaction"
              >
                <Smile className="h-4 w-4" />
              </button>
              <button
                onClick={() => onThreadClick(message)}
                className="p-2 hover:bg-gray-100 rounded"
                title="Reply in thread"
              >
                <MessageSquare className="h-4 w-4" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded" title="Save">
                <Bookmark className="h-4 w-4" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded" title="Share">
                <Share className="h-4 w-4" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded" title="More">
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Emoji Picker */}
          {showEmojiPicker === message.id && (
            <div className="absolute top-8 right-4 bg-white border border-gray-200 rounded shadow-xl p-3 z-10">
              <div className="flex gap-1 flex-wrap max-w-xs">
                {commonEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReaction(message.timestamp, emoji);
                      setShowEmojiPicker(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded text-xl"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
