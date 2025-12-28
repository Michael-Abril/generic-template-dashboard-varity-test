'use client';

/**
 * Quick Actions - Smart Action Buttons
 *
 * Renders contextual action buttons based on detected content in AI responses.
 * Part of Terminal 4: AI Enhancement Team
 *
 * Created: December 28, 2025
 */

import React, { useMemo } from 'react';
import {
  Mail,
  Calendar,
  FileText,
  ExternalLink,
  Phone,
  CheckSquare,
  Copy,
  Check,
  Plus
} from 'lucide-react';
import { DetectedAction, ActionType, ActionData } from '@/types/ai';
import { detectActions, getUniqueActions, getPrimaryActions } from './ActionDetector';

interface QuickActionsProps {
  /** Text content to analyze for actions */
  content: string;
  /** Pre-detected actions (optional, will detect if not provided) */
  actions?: DetectedAction[];
  /** Handler for email action */
  onSendEmail?: (data: ActionData) => void;
  /** Handler for calendar event action */
  onCreateEvent?: (data: ActionData) => void;
  /** Handler for file action */
  onOpenFile?: (data: ActionData) => void;
  /** Handler for link action */
  onOpenLink?: (data: ActionData) => void;
  /** Handler for contact action */
  onAddContact?: (data: ActionData) => void;
  /** Handler for task action */
  onCreateTask?: (data: ActionData) => void;
  /** Maximum actions to display */
  maxActions?: number;
  /** Show as compact inline */
  compact?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Get icon for action type
 */
function getActionIcon(type: ActionType, className: string = 'h-4 w-4') {
  const icons: Record<ActionType, React.ReactNode> = {
    email: <Mail className={className} />,
    event: <Calendar className={className} />,
    file: <FileText className={className} />,
    link: <ExternalLink className={className} />,
    contact: <Phone className={className} />,
    task: <CheckSquare className={className} />
  };
  return icons[type];
}

/**
 * Get label for action type
 */
function getActionLabel(type: ActionType, data: ActionData): string {
  switch (type) {
    case 'email':
      return data.email ? `Email ${data.email.split('@')[0]}` : 'Send Email';
    case 'event':
      return data.title || 'Create Event';
    case 'file':
      return data.fileName ? `Open ${data.fileName}` : 'Open File';
    case 'link':
      return 'Open Link';
    case 'contact':
      return data.name || data.phone ? `Add ${data.name || data.phone}` : 'Add Contact';
    case 'task':
      return data.title || 'Create Task';
  }
}

/**
 * Get button color classes for action type
 */
function getActionColors(type: ActionType): string {
  const colors: Record<ActionType, string> = {
    email: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200',
    event: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200',
    file: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200',
    link: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200',
    contact: 'bg-pink-50 text-pink-700 hover:bg-pink-100 border-pink-200',
    task: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'
  };
  return colors[type];
}

/**
 * Single action button component
 */
function ActionButton({
  action,
  onClick,
  compact = false
}: {
  action: DetectedAction;
  onClick: () => void;
  compact?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);
  const colors = getActionColors(action.type);
  const label = getActionLabel(action.type, action.data);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = action.data.email || action.data.url || action.data.phone || action.text;
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`
          inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium
          border transition-colors
          ${colors}
        `}
        title={label}
      >
        {getActionIcon(action.type, 'h-3 w-3')}
        <span className="max-w-[100px] truncate">{label}</span>
      </button>
    );
  }

  return (
    <div className={`
      flex items-center justify-between p-2 rounded-lg border
      ${colors}
    `}>
      <button
        onClick={onClick}
        className="flex items-center gap-2 flex-1 min-w-0"
      >
        {getActionIcon(action.type)}
        <div className="text-left min-w-0">
          <p className="text-sm font-medium truncate">{label}</p>
          {action.text && (
            <p className="text-xs opacity-70 truncate">{action.text}</p>
          )}
        </div>
      </button>
      <button
        onClick={handleCopy}
        className="p-1.5 hover:bg-white/50 rounded transition-colors ml-2"
        title="Copy"
      >
        {copied ? (
          <Check className="h-4 w-4" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

export function QuickActions({
  content,
  actions: providedActions,
  onSendEmail,
  onCreateEvent,
  onOpenFile,
  onOpenLink,
  onAddContact,
  onCreateTask,
  maxActions = 4,
  compact = false,
  className = ''
}: QuickActionsProps) {
  // Detect actions from content if not provided
  const detectedActions = useMemo(() => {
    if (providedActions) return providedActions;
    const allActions = detectActions(content, 0.6);
    const unique = getUniqueActions(allActions);
    return getPrimaryActions(unique);
  }, [content, providedActions]);

  // Filter to actions we have handlers for
  const actionableItems = useMemo(() => {
    return detectedActions.filter(action => {
      switch (action.type) {
        case 'email': return !!onSendEmail;
        case 'event': return !!onCreateEvent;
        case 'file': return !!onOpenFile;
        case 'link': return !!onOpenLink;
        case 'contact': return !!onAddContact;
        case 'task': return !!onCreateTask;
        default: return false;
      }
    }).slice(0, maxActions);
  }, [detectedActions, onSendEmail, onCreateEvent, onOpenFile, onOpenLink, onAddContact, onCreateTask, maxActions]);

  // Get handler for action type
  const getHandler = (action: DetectedAction) => {
    switch (action.type) {
      case 'email': return () => onSendEmail?.(action.data);
      case 'event': return () => onCreateEvent?.(action.data);
      case 'file': return () => onOpenFile?.(action.data);
      case 'link': return () => onOpenLink?.(action.data);
      case 'contact': return () => onAddContact?.(action.data);
      case 'task': return () => onCreateTask?.(action.data);
      default: return () => {};
    }
  };

  if (actionableItems.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {actionableItems.map((action, index) => (
          <ActionButton
            key={`${action.type}-${index}`}
            action={action}
            onClick={getHandler(action)}
            compact
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
        <Plus className="h-3 w-3" />
        Quick Actions
      </div>
      <div className="grid gap-2">
        {actionableItems.map((action, index) => (
          <ActionButton
            key={`${action.type}-${index}`}
            action={action}
            onClick={getHandler(action)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Inline action badges for message footer
 */
export function ActionBadges({
  content,
  onActionClick,
  className = ''
}: {
  content: string;
  onActionClick?: (action: DetectedAction) => void;
  className?: string;
}) {
  const actions = useMemo(() => {
    const detected = detectActions(content, 0.7);
    return getPrimaryActions(getUniqueActions(detected)).slice(0, 3);
  }, [content]);

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {actions.map((action, index) => {
        const colors = getActionColors(action.type);
        return (
          <button
            key={`${action.type}-${index}`}
            onClick={() => onActionClick?.(action)}
            className={`
              inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs
              border transition-colors
              ${colors}
            `}
            title={getActionLabel(action.type, action.data)}
          >
            {getActionIcon(action.type, 'h-3 w-3')}
          </button>
        );
      })}
    </div>
  );
}

export default QuickActions;
