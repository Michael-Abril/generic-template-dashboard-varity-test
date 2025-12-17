'use client';

import React, { useState, useRef, KeyboardEvent } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  AtSign,
  Hash,
  Smile,
  Paperclip,
  Send,
  Video,
  Mic,
  X
} from 'lucide-react';

interface MessageComposerProps {
  onSend: (text: string, files?: File[]) => void;
  placeholder?: string;
  initialValue?: string;
}

export function MessageComposer({
  onSend,
  placeholder = 'Type a message...',
  initialValue = ''
}: MessageComposerProps) {
  const [message, setMessage] = useState(initialValue);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [showFormatting, setShowFormatting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (message.trim() || attachedFiles.length > 0) {
      onSend(message.trim(), attachedFiles);
      setMessage('');
      setAttachedFiles([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  const insertFormatting = (prefix: string, suffix: string = prefix) => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = message.substring(start, end);
    const newText =
      message.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      message.substring(end);

    setMessage(newText);
    textareaRef.current.focus();

    // Set cursor position after formatting
    setTimeout(() => {
      if (!textareaRef.current) return;
      const newPosition = start + prefix.length + selectedText.length;
      textareaRef.current.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachedFiles([...attachedFiles, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      {/* Formatting Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-200">
        <button
          onClick={() => insertFormatting('*')}
          className="p-1.5 hover:bg-gray-100 rounded"
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          onClick={() => insertFormatting('_')}
          className="p-1.5 hover:bg-gray-100 rounded"
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          onClick={() => insertFormatting('~')}
          className="p-1.5 hover:bg-gray-100 rounded"
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </button>
        <button
          onClick={() => insertFormatting('`')}
          className="p-1.5 hover:bg-gray-100 rounded"
          title="Code"
        >
          <Code className="h-4 w-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <button
          onClick={() => insertFormatting('<', '|link>')}
          className="p-1.5 hover:bg-gray-100 rounded"
          title="Link"
        >
          <LinkIcon className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            const start = message.length === 0 || message.endsWith('\n') ? '' : '\n';
            insertFormatting(start + '• ', '');
          }}
          className="p-1.5 hover:bg-gray-100 rounded"
          title="Bullet list"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            const start = message.length === 0 || message.endsWith('\n') ? '' : '\n';
            insertFormatting(start + '1. ', '');
          }}
          className="p-1.5 hover:bg-gray-100 rounded"
          title="Numbered list"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            const start = message.length === 0 || message.endsWith('\n') ? '' : '\n';
            insertFormatting(start + '> ', '');
          }}
          className="p-1.5 hover:bg-gray-100 rounded"
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <button
          onClick={() => insertFormatting('@')}
          className="p-1.5 hover:bg-gray-100 rounded"
          title="Mention"
        >
          <AtSign className="h-4 w-4" />
        </button>
        <button
          onClick={() => insertFormatting('#')}
          className="p-1.5 hover:bg-gray-100 rounded"
          title="Channel"
        >
          <Hash className="h-4 w-4" />
        </button>
        <button className="p-1.5 hover:bg-gray-100 rounded" title="Emoji">
          <Smile className="h-4 w-4" />
        </button>
      </div>

      {/* Attached Files */}
      {attachedFiles.length > 0 && (
        <div className="p-2 border-b border-gray-200 bg-gray-50">
          <div className="space-y-1">
            {attachedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-white border border-gray-200 rounded p-2"
              >
                <Paperclip className="h-4 w-4 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{file.name}</div>
                  <div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Text Input */}
      <div className="p-3">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full resize-none focus:outline-none text-sm"
          rows={1}
          style={{ minHeight: '24px', maxHeight: '200px' }}
        />
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between px-3 pb-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 hover:bg-gray-100 rounded"
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button className="p-1.5 hover:bg-gray-100 rounded" title="Record video">
            <Video className="h-4 w-4" />
          </button>
          <button className="p-1.5 hover:bg-gray-100 rounded" title="Record audio">
            <Mic className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={handleSend}
          disabled={!message.trim() && attachedFiles.length === 0}
          className={`
            p-2 rounded
            ${
              message.trim() || attachedFiles.length > 0
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
          title="Send message (Enter)"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {/* Formatting Help */}
      <div className="px-3 pb-2 text-xs text-gray-500">
        <button
          onClick={() => setShowFormatting(!showFormatting)}
          className="hover:text-gray-700"
        >
          {showFormatting ? 'Hide' : 'Show'} formatting help
        </button>
        {showFormatting && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs space-y-1">
            <div><code className="bg-gray-200 px-1 rounded">*text*</code> for <strong>bold</strong></div>
            <div><code className="bg-gray-200 px-1 rounded">_text_</code> for <em>italic</em></div>
            <div><code className="bg-gray-200 px-1 rounded">~text~</code> for <del>strikethrough</del></div>
            <div><code className="bg-gray-200 px-1 rounded">`text`</code> for <code className="bg-gray-200 px-1 rounded">code</code></div>
            <div><code className="bg-gray-200 px-1 rounded">@username</code> to mention someone</div>
            <div><code className="bg-gray-200 px-1 rounded">#channel</code> to link a channel</div>
          </div>
        )}
      </div>
    </div>
  );
}
