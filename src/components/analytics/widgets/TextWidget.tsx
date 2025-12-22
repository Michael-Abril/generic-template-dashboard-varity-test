'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Edit3, Check, X, Type } from 'lucide-react';

interface TextWidgetProps {
  content: string;
  onChange: (content: string) => void;
  variant?: 'note' | 'header' | 'markdown';
  placeholder?: string;
  editable?: boolean;
}

export default function TextWidget({
  content,
  onChange,
  variant = 'note',
  placeholder = 'Click to add text...',
  editable = true
}: TextWidgetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [isEditing]);

  const handleSave = () => {
    onChange(editedContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
    if (e.key === 'Enter' && e.metaKey) {
      handleSave();
    }
  };

  if (variant === 'header') {
    return (
      <div className="h-full flex items-center">
        {isEditing ? (
          <div className="flex items-center gap-2 w-full">
            <input
              type="text"
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
              className="flex-1 text-xl font-bold text-gray-900 bg-transparent border-b-2 border-blue-500 outline-none"
              placeholder="Section title..."
              autoFocus
            />
            <button
              onClick={handleSave}
              className="p-1 text-green-600 hover:bg-green-50 rounded"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 text-gray-500 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            className="flex items-center gap-2 w-full group cursor-pointer"
            onClick={() => editable && setIsEditing(true)}
          >
            <h2 className="text-xl font-bold text-gray-900">
              {content || placeholder}
            </h2>
            {editable && (
              <Edit3 className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {isEditing ? (
        <div className="h-full flex flex-col">
          <textarea
            ref={textareaRef}
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 w-full p-3 text-sm text-gray-700 bg-white border border-blue-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder={placeholder}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">
              Press Cmd+Enter to save, Esc to cancel
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`h-full rounded-lg cursor-pointer group transition-all ${
            content ? 'bg-white' : 'bg-gray-50 border-2 border-dashed border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => editable && setIsEditing(true)}
        >
          {content ? (
            <div className="h-full p-3 relative">
              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                {content}
              </div>
              {editable && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit3 className="w-4 h-4 text-gray-400" />
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Type className="w-8 h-8 mb-2" />
              <span className="text-sm">{placeholder}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
