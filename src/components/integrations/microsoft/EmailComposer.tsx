'use client';

import { useState, useRef, useCallback } from 'react';
import {
  X,
  Send,
  Paperclip,
  Image as ImageIcon,
  Smile,
  Bold,
  Italic,
  Underline,
  List,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  Minimize2,
  Save,
  ListOrdered
} from 'lucide-react';

interface EmailComposerProps {
  walletAddress: string;
  onClose: () => void;
  onSent?: () => void;
  replyTo?: {
    subject: string;
    from: string;
    body: string;
  };
}

export default function EmailComposer({ walletAddress, onClose, onSent, replyTo }: EmailComposerProps) {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(replyTo ? `RE: ${replyTo.subject}` : '');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [importance, setImportance] = useState<'low' | 'normal' | 'high'>('normal');

  const editorRef = useRef<HTMLDivElement>(null);

  // Initialize the editor with reply content if present
  const getInitialContent = () => {
    if (replyTo) {
      return `<br/><br/><hr/><p>On ${new Date().toLocaleString()}, ${replyTo.from} wrote:</p><blockquote style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 10px; color: #666;">${replyTo.body}</blockquote>`;
    }
    return '';
  };

  // Execute formatting command
  const execFormatCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }, []);

  const handleBold = () => execFormatCommand('bold');
  const handleItalic = () => execFormatCommand('italic');
  const handleUnderline = () => execFormatCommand('underline');
  const handleAlignLeft = () => execFormatCommand('justifyLeft');
  const handleAlignCenter = () => execFormatCommand('justifyCenter');
  const handleAlignRight = () => execFormatCommand('justifyRight');
  const handleBulletList = () => execFormatCommand('insertUnorderedList');
  const handleNumberedList = () => execFormatCommand('insertOrderedList');

  const handleInsertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      execFormatCommand('createLink', url);
    }
  };

  const getEditorContent = (): string => {
    return editorRef.current?.innerHTML || '';
  };

  const handleSend = async () => {
    if (!to || !subject) {
      alert('Please fill in recipient and subject');
      return;
    }

    const body = getEditorContent();

    setIsSending(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/microsoft/mail/send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet_address: walletAddress,
            to: to.split(',').map((e) => e.trim()),
            subject,
            body,
            cc: cc ? cc.split(',').map((e) => e.trim()) : undefined,
            bcc: bcc ? bcc.split(',').map((e) => e.trim()) : undefined,
            importance
          })
        }
      );

      if (response.ok) {
        alert('Email sent successfully!');
        onSent?.();
        onClose();
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail || 'Failed to send email'}`);
      }
    } catch (error) {
      alert('Network error. Please try again.');
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveDraft = async () => {
    const body = getEditorContent();

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/microsoft/mail/drafts`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet_address: walletAddress,
            to: to.split(',').map((e) => e.trim()),
            subject,
            body,
            cc: cc ? cc.split(',').map((e) => e.trim()) : undefined,
            importance
          })
        }
      );

      if (response.ok) {
        alert('Draft saved successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail || 'Failed to save draft'}`);
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Network error. Please try again.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div
      className={`flex flex-col bg-white ${
        isFullscreen ? 'fixed inset-0 z-50' : 'h-full rounded-lg shadow-2xl'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-500">
        <h2 className="text-lg font-semibold text-white">New Message</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="rounded-lg p-2 hover:bg-white/20 transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-5 w-5 text-white" />
            ) : (
              <Maximize2 className="h-5 w-5 text-white" />
            )}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-white/20 transition-colors"
            title="Close"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      {/* Recipients */}
      <div className="border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-2">
          <label className="w-16 text-sm font-medium text-gray-700">To:</label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="Recipients (comma-separated)"
            className="flex-1 border-none py-1 text-sm focus:outline-none text-gray-900"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCc(!showCc)}
              className={`text-sm ${showCc ? 'text-blue-700 font-medium' : 'text-blue-600'} hover:text-blue-700`}
            >
              Cc
            </button>
            <button
              onClick={() => setShowBcc(!showBcc)}
              className={`text-sm ${showBcc ? 'text-blue-700 font-medium' : 'text-blue-600'} hover:text-blue-700`}
            >
              Bcc
            </button>
          </div>
        </div>

        {showCc && (
          <div className="mt-2 flex items-center gap-2">
            <label className="w-16 text-sm font-medium text-gray-700">Cc:</label>
            <input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="Cc recipients"
              className="flex-1 border-none py-1 text-sm focus:outline-none text-gray-900"
            />
          </div>
        )}

        {showBcc && (
          <div className="mt-2 flex items-center gap-2">
            <label className="w-16 text-sm font-medium text-gray-700">Bcc:</label>
            <input
              type="text"
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              placeholder="Bcc recipients"
              className="flex-1 border-none py-1 text-sm focus:outline-none text-gray-900"
            />
          </div>
        )}
      </div>

      {/* Subject */}
      <div className="border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-2">
          <label className="w-16 text-sm font-medium text-gray-700">Subject:</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
            className="flex-1 border-none py-1 text-sm focus:outline-none text-gray-900"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b border-gray-200 px-6 py-2 bg-gray-50">
        <div className="flex items-center gap-1">
          <button
            onClick={handleBold}
            className="rounded p-2 hover:bg-gray-200 transition-colors"
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4 text-gray-700" />
          </button>
          <button
            onClick={handleItalic}
            className="rounded p-2 hover:bg-gray-200 transition-colors"
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4 text-gray-700" />
          </button>
          <button
            onClick={handleUnderline}
            className="rounded p-2 hover:bg-gray-200 transition-colors"
            title="Underline (Ctrl+U)"
          >
            <Underline className="h-4 w-4 text-gray-700" />
          </button>
          <div className="mx-2 h-6 w-px bg-gray-300"></div>
          <button
            onClick={handleAlignLeft}
            className="rounded p-2 hover:bg-gray-200 transition-colors"
            title="Align left"
          >
            <AlignLeft className="h-4 w-4 text-gray-700" />
          </button>
          <button
            onClick={handleAlignCenter}
            className="rounded p-2 hover:bg-gray-200 transition-colors"
            title="Align center"
          >
            <AlignCenter className="h-4 w-4 text-gray-700" />
          </button>
          <button
            onClick={handleAlignRight}
            className="rounded p-2 hover:bg-gray-200 transition-colors"
            title="Align right"
          >
            <AlignRight className="h-4 w-4 text-gray-700" />
          </button>
          <div className="mx-2 h-6 w-px bg-gray-300"></div>
          <button
            onClick={handleBulletList}
            className="rounded p-2 hover:bg-gray-200 transition-colors"
            title="Bullet list"
          >
            <List className="h-4 w-4 text-gray-700" />
          </button>
          <button
            onClick={handleNumberedList}
            className="rounded p-2 hover:bg-gray-200 transition-colors"
            title="Numbered list"
          >
            <ListOrdered className="h-4 w-4 text-gray-700" />
          </button>
          <button
            onClick={handleInsertLink}
            className="rounded p-2 hover:bg-gray-200 transition-colors"
            title="Insert link"
          >
            <LinkIcon className="h-4 w-4 text-gray-700" />
          </button>
          <div className="mx-2 h-6 w-px bg-gray-300"></div>
          <label className="cursor-pointer rounded p-2 hover:bg-gray-200 transition-colors" title="Attach file">
            <Paperclip className="h-4 w-4 text-gray-700" />
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <button className="rounded p-2 hover:bg-gray-200 transition-colors" title="Insert image">
            <ImageIcon className="h-4 w-4 text-gray-700" />
          </button>
          <button className="rounded p-2 hover:bg-gray-200 transition-colors" title="Insert emoji">
            <Smile className="h-4 w-4 text-gray-700" />
          </button>
          <div className="mx-2 h-6 w-px bg-gray-300"></div>
          <select
            value={importance}
            onChange={(e) => setImportance(e.target.value as 'low' | 'normal' | 'high')}
            className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:border-blue-500 text-gray-900"
          >
            <option value="low">Low Priority</option>
            <option value="normal">Normal</option>
            <option value="high">High Priority</option>
          </select>
        </div>
      </div>

      {/* Message Body - Rich Text Editor */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div
          ref={editorRef}
          contentEditable
          className="h-full w-full min-h-[200px] text-sm focus:outline-none text-gray-900 prose prose-sm max-w-none"
          style={{ whiteSpace: 'pre-wrap' }}
          dangerouslySetInnerHTML={{ __html: getInitialContent() }}
          onKeyDown={(e) => {
            // Handle keyboard shortcuts
            if (e.ctrlKey || e.metaKey) {
              switch (e.key.toLowerCase()) {
                case 'b':
                  e.preventDefault();
                  handleBold();
                  break;
                case 'i':
                  e.preventDefault();
                  handleItalic();
                  break;
                case 'u':
                  e.preventDefault();
                  handleUnderline();
                  break;
              }
            }
          }}
        />
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="border-t border-gray-200 px-6 py-3">
          <p className="mb-2 text-sm font-medium text-gray-700">
            Attachments ({attachments.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2"
              >
                <Paperclip className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700">{file.name}</span>
                <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="ml-2 text-gray-400 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 bg-gray-50">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSend}
            disabled={isSending}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Send className="h-4 w-4" />
            {isSending ? 'Sending...' : 'Send'}
          </button>
          <button
            onClick={handleSaveDraft}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            <Save className="h-4 w-4" />
            Save Draft
          </button>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          Discard
        </button>
      </div>
    </div>
  );
}
