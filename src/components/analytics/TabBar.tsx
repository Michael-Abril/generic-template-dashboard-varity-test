'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  X,
  ChevronDown,
  Edit3,
  Copy,
  Trash2,
  Check,
  GripVertical,
  LayoutTemplate
} from 'lucide-react';

export interface DashboardTab {
  id: string;
  name: string;
  icon?: string;
  isDefault?: boolean;
  createdAt: string;
}

interface TabBarProps {
  tabs: DashboardTab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onAddTab: () => void;
  onRenameTab: (tabId: string, newName: string) => void;
  onDeleteTab: (tabId: string) => void;
  onDuplicateTab: (tabId: string) => void;
  onReorderTabs: (tabs: DashboardTab[]) => void;
  onOpenTemplates: () => void;
}

export default function TabBar({
  tabs,
  activeTabId,
  onTabChange,
  onAddTab,
  onRenameTab,
  onDeleteTab,
  onDuplicateTab,
  onReorderTabs,
  onOpenTemplates
}: TabBarProps) {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [contextMenuTab, setContextMenuTab] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [draggedTab, setDraggedTab] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Focus input when editing
  useEffect(() => {
    if (editingTabId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingTabId]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenuTab(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDoubleClick = (tab: DashboardTab) => {
    setEditingTabId(tab.id);
    setEditingName(tab.name);
  };

  const handleRenameSubmit = () => {
    if (editingTabId && editingName.trim()) {
      onRenameTab(editingTabId, editingName.trim());
    }
    setEditingTabId(null);
    setEditingName('');
  };

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenuTab(tabId);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    setDraggedTab(tabId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetTabId: string) => {
    e.preventDefault();
    if (!draggedTab || draggedTab === targetTabId) return;

    const draggedIndex = tabs.findIndex(t => t.id === draggedTab);
    const targetIndex = tabs.findIndex(t => t.id === targetTabId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newTabs = [...tabs];
    const [removed] = newTabs.splice(draggedIndex, 1);
    newTabs.splice(targetIndex, 0, removed);
    onReorderTabs(newTabs);
  };

  const handleDragEnd = () => {
    setDraggedTab(null);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {/* Tabs */}
        {tabs.map((tab) => (
          <div
            key={tab.id}
            draggable
            onDragStart={(e) => handleDragStart(e, tab.id)}
            onDragOver={(e) => handleDragOver(e, tab.id)}
            onDragEnd={handleDragEnd}
            onDoubleClick={() => handleDoubleClick(tab)}
            onContextMenu={(e) => handleContextMenu(e, tab.id)}
            onClick={() => !editingTabId && onTabChange(tab.id)}
            className={`
              group relative flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer
              transition-all duration-200 min-w-[100px] max-w-[180px]
              ${activeTabId === tab.id
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-600 hover:bg-white/50 hover:text-gray-800'
              }
              ${draggedTab === tab.id ? 'opacity-50' : ''}
            `}
          >
            {/* Drag Handle (visible on hover) */}
            <GripVertical className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing" />

            {/* Tab Name */}
            {editingTabId === tab.id ? (
              <input
                ref={editInputRef}
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit();
                  if (e.key === 'Escape') {
                    setEditingTabId(null);
                    setEditingName('');
                  }
                }}
                className="flex-1 bg-transparent border-none outline-none text-sm font-medium min-w-0"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="flex-1 text-sm font-medium truncate">
                {tab.name}
              </span>
            )}

            {/* Close button (visible on hover, not for last tab) */}
            {tabs.length > 1 && activeTabId === tab.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTab(tab.id);
                }}
                className="p-0.5 rounded hover:bg-gray-200 transition-colors"
              >
                <X className="w-3 h-3 text-gray-500" />
              </button>
            )}
          </div>
        ))}

        {/* Add Tab Button */}
        <button
          onClick={onAddTab}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-white/50 hover:text-gray-700 transition-all"
          title="Add new tab"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Templates Button */}
        <button
          onClick={onOpenTemplates}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-500 hover:bg-white/50 hover:text-gray-700 transition-all text-sm"
          title="Browse templates"
        >
          <LayoutTemplate className="w-4 h-4" />
          <span className="hidden sm:inline">Templates</span>
        </button>
      </div>

      {/* Context Menu */}
      {contextMenuTab && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white rounded-xl shadow-xl border border-gray-200 py-2 min-w-[160px] z-50"
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
        >
          <button
            onClick={() => {
              const tab = tabs.find(t => t.id === contextMenuTab);
              if (tab) {
                setEditingTabId(tab.id);
                setEditingName(tab.name);
              }
              setContextMenuTab(null);
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Rename
          </button>
          <button
            onClick={() => {
              onDuplicateTab(contextMenuTab);
              setContextMenuTab(null);
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Copy className="w-4 h-4" />
            Duplicate
          </button>
          {tabs.length > 1 && (
            <>
              <div className="my-1 border-t border-gray-100" />
              <button
                onClick={() => {
                  onDeleteTab(contextMenuTab);
                  setContextMenuTab(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
