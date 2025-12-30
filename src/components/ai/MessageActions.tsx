'use client';

/**
 * MessageActions - Enhanced Message Action Buttons
 *
 * Provides feedback buttons (thumbs up/down), copy, retry, and more
 * for AI chat messages. Appears on hover like ChatGPT/Claude.
 *
 * Created: December 30, 2025
 */

import React, { useState } from 'react';
import {
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Pencil,
  Mail,
  FileText,
  Share2,
  MoreHorizontal
} from 'lucide-react';
import { logger } from '@/lib/logger';

interface MessageActionsProps {
  /** Message content for copy functionality */
  content: string;
  /** Message role */
  role: 'user' | 'assistant';
  /** Message index */
  messageIndex: number;
  /** Is this the last message */
  isLastMessage?: boolean;
  /** Is currently loading */
  isLoading?: boolean;
  /** Is visible (controlled by hover state) */
  isVisible?: boolean;
  /** Current feedback state */
  feedback?: 'up' | 'down' | null;
  /** Handler for edit button (user messages) */
  onEdit?: () => void;
  /** Handler for regenerate button (assistant messages) */
  onRegenerate?: () => void;
  /** Handler for feedback */
  onFeedback?: (type: 'up' | 'down') => void;
  /** Handler for email action */
  onSendAsEmail?: () => void;
  /** Handler for save as document action */
  onSaveAsDocument?: () => void;
  /** Custom className */
  className?: string;
}

export function MessageActions({
  content,
  role,
  messageIndex,
  isLastMessage = false,
  isLoading = false,
  isVisible = true,
  feedback,
  onEdit,
  onRegenerate,
  onFeedback,
  onSendAsEmail,
  onSaveAsDocument,
  className = ''
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [showMore, setShowMore] = useState(false);

  // Copy message content to clipboard
  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      logger.error('Failed to copy message:', error);
    }
  };

  return (
    <div
      className={`flex items-center gap-1 mt-1.5 transition-opacity duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } ${role === 'user' ? 'justify-end' : 'justify-start'} ${className}`}
    >
      {/* Copy button - always visible */}
      <button
        onClick={copyMessage}
        className={`p-1.5 rounded-lg transition-colors ${
          copied
            ? 'bg-green-100 text-green-600'
            : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
        }`}
        title={copied ? 'Copied!' : 'Copy message'}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>

      {/* User message actions */}
      {role === 'user' && onEdit && (
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          title="Edit message"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Assistant message actions */}
      {role === 'assistant' && (
        <>
          {/* Feedback buttons */}
          {onFeedback && (
            <>
              <button
                onClick={() => onFeedback('up')}
                className={`p-1.5 rounded-lg transition-colors ${
                  feedback === 'up'
                    ? 'bg-green-100 text-green-600'
                    : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                }`}
                title="Good response"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onFeedback('down')}
                className={`p-1.5 rounded-lg transition-colors ${
                  feedback === 'down'
                    ? 'bg-red-100 text-red-600'
                    : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                }`}
                title="Poor response"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* Regenerate button - only on last message */}
          {isLastMessage && onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={isLoading}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              title="Regenerate response"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Quick Actions - Send as Email */}
          {onSendAsEmail && (
            <button
              onClick={onSendAsEmail}
              className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
              title="Send as email"
            >
              <Mail className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Quick Actions - Save as Document */}
          {onSaveAsDocument && (
            <button
              onClick={onSaveAsDocument}
              className="p-1.5 rounded-lg hover:bg-green-100 text-gray-400 hover:text-green-600 transition-colors"
              title="Save as document"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Compact action bar that appears below messages
 */
export function MessageActionBar({
  content,
  role,
  feedback,
  isLoading = false,
  onCopy,
  onRegenerate,
  onFeedback,
  className = ''
}: {
  content: string;
  role: 'user' | 'assistant';
  feedback?: 'up' | 'down' | null;
  isLoading?: boolean;
  onCopy?: () => void;
  onRegenerate?: () => void;
  onFeedback?: (type: 'up' | 'down') => void;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      logger.error('Failed to copy:', error);
    }
  };

  return (
    <div className={`flex items-center gap-0.5 text-gray-400 ${className}`}>
      {/* Copy */}
      <button
        onClick={handleCopy}
        className={`p-1 rounded hover:bg-gray-100 transition-colors ${
          copied ? 'text-green-500' : 'hover:text-gray-600'
        }`}
        title={copied ? 'Copied!' : 'Copy'}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>

      {role === 'assistant' && (
        <>
          {/* Divider */}
          <div className="w-px h-3 bg-gray-200 mx-1" />

          {/* Feedback */}
          {onFeedback && (
            <>
              <button
                onClick={() => onFeedback('up')}
                className={`p-1 rounded transition-colors ${
                  feedback === 'up' ? 'text-green-500 bg-green-50' : 'hover:bg-gray-100 hover:text-gray-600'
                }`}
                title="Good response"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onFeedback('down')}
                className={`p-1 rounded transition-colors ${
                  feedback === 'down' ? 'text-red-500 bg-red-50' : 'hover:bg-gray-100 hover:text-gray-600'
                }`}
                title="Poor response"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* Regenerate */}
          {onRegenerate && (
            <>
              <div className="w-px h-3 bg-gray-200 mx-1" />
              <button
                onClick={onRegenerate}
                disabled={isLoading}
                className="p-1 rounded hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-50"
                title="Regenerate"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default MessageActions;
