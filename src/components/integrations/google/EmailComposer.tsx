'use client';

import { useState, useRef } from 'react';
import {
  X,
  Minimize2,
  Maximize2,
  Paperclip,
  Image,
  Link as LinkIcon,
  Smile,
  Send,
  Trash2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered
} from 'lucide-react';

interface EmailComposerProps {
  walletAddress: string;
  onClose: () => void;
  onSent?: () => void;
  replyTo?: {
    to: string;
    subject: string;
    threadId?: string;
  };
}

export function EmailComposer({ walletAddress, onClose, onSent, replyTo }: EmailComposerProps) {
  const [minimized, setMinimized] = useState(false);
  const [to, setTo] = useState(replyTo?.to || '');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(replyTo?.subject || '');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyEditorRef = useRef<HTMLDivElement>(null);

  // Formatting command helper
  const execFormatCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    bodyEditorRef.current?.focus();
  };

  const handleSend = async () => {
    // Get body content from contentEditable div
    const bodyContent = bodyEditorRef.current?.innerHTML || body;

    if (!to || !subject) {
      alert('Please fill in recipient and subject');
      return;
    }

    setSending(true);
    try {
      // API call to send email
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/google/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: walletAddress,
          to: to.split(',').map(email => email.trim()),
          cc: cc ? cc.split(',').map(email => email.trim()) : [],
          bcc: bcc ? bcc.split(',').map(email => email.trim()) : [],
          subject,
          body: bodyContent,
          threadId: replyTo?.threadId
        })
      });

      if (response.ok) {
        alert('Email sent successfully!');
        onSent?.();
        onClose();
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      console.error('Send email error:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleAttachFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  if (minimized) {
    return (
      <div className="fixed bottom-0 right-4 w-80 bg-white border rounded-t-lg shadow-lg z-50">
        <div className="px-4 py-3 bg-gray-800 text-white rounded-t-lg flex items-center justify-between">
          <span className="font-medium truncate">New Message</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setMinimized(false)} className="hover:bg-gray-700 rounded p-1">
              <Maximize2 className="h-4 w-4" />
            </button>
            <button onClick={onClose} className="hover:bg-gray-700 rounded p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 bg-gray-800 text-white rounded-t-lg flex items-center justify-between">
          <span className="font-medium">New Message</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setMinimized(true)} className="hover:bg-gray-700 rounded p-1">
              <Minimize2 className="h-4 w-4" />
            </button>
            <button onClick={onClose} className="hover:bg-gray-700 rounded p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* To/CC/BCC */}
        <div className="border-b">
          <div className="flex items-center px-4 py-2 border-b">
            <label className="w-16 text-sm text-gray-600">To</label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Recipients"
              className="flex-1 outline-none text-sm"
            />
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => setShowCc(!showCc)}
                className="text-gray-600 hover:text-gray-900"
              >
                Cc
              </button>
              <button
                onClick={() => setShowBcc(!showBcc)}
                className="text-gray-600 hover:text-gray-900"
              >
                Bcc
              </button>
            </div>
          </div>

          {showCc && (
            <div className="flex items-center px-4 py-2 border-b">
              <label className="w-16 text-sm text-gray-600">Cc</label>
              <input
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="Cc recipients"
                className="flex-1 outline-none text-sm"
              />
            </div>
          )}

          {showBcc && (
            <div className="flex items-center px-4 py-2 border-b">
              <label className="w-16 text-sm text-gray-600">Bcc</label>
              <input
                type="text"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder="Bcc recipients"
                className="flex-1 outline-none text-sm"
              />
            </div>
          )}

          <div className="flex items-center px-4 py-2">
            <label className="w-16 text-sm text-gray-600">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="flex-1 outline-none text-sm"
            />
          </div>
        </div>

        {/* Formatting Toolbar */}
        <div className="border-b px-4 py-2 flex items-center gap-1">
          <button
            onClick={() => execFormatCommand('bold')}
            className="p-2 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900"
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            onClick={() => execFormatCommand('italic')}
            className="p-2 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900"
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            onClick={() => execFormatCommand('underline')}
            className="p-2 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900"
            title="Underline (Ctrl+U)"
          >
            <Underline className="h-4 w-4" />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-2" />
          <button
            onClick={() => execFormatCommand('justifyLeft')}
            className="p-2 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900"
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => execFormatCommand('justifyCenter')}
            className="p-2 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900"
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </button>
          <button
            onClick={() => execFormatCommand('justifyRight')}
            className="p-2 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900"
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-2" />
          <button
            onClick={() => execFormatCommand('insertUnorderedList')}
            className="p-2 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900"
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => execFormatCommand('insertOrderedList')}
            className="p-2 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900"
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </button>
        </div>

        {/* Rich Text Body Editor */}
        <div className="flex-1 overflow-auto bg-white">
          <div
            ref={bodyEditorRef}
            contentEditable
            className="w-full min-h-[200px] px-4 py-3 outline-none focus:bg-gray-50 transition-colors text-gray-900"
            style={{ lineHeight: '1.6', color: '#111827' }}
            onInput={(e) => setBody(e.currentTarget.innerHTML)}
            data-placeholder="Compose your message..."
            suppressContentEditableWarning
          />
        </div>
        <style jsx>{`
          [data-placeholder]:empty:before {
            content: attr(data-placeholder);
            color: #9ca3af;
            pointer-events: none;
          }
          [contenteditable] {
            color: #111827 !important;
            caret-color: #111827;
          }
        `}</style>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="border-t px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center gap-2 bg-gray-100 rounded px-3 py-2">
                  <Paperclip className="h-4 w-4 text-gray-600" />
                  <span className="text-sm">{file.name}</span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="text-gray-600 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {sending ? 'Sending...' : 'Send'}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleAttachFile}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-gray-100 rounded"
              title="Attach file"
            >
              <Paperclip className="h-5 w-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded" title="Insert image">
              <Image className="h-5 w-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded" title="Insert link">
              <LinkIcon className="h-5 w-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded" title="Insert emoji">
              <Smile className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded text-gray-600"
            title="Delete draft"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
