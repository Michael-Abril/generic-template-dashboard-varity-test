'use client';

/**
 * StarterPrompts - ChatGPT/Claude-style Empty State Prompts
 *
 * Shows 6 business-focused starter prompts when the conversation is empty.
 * Designed to be visually appealing with emoji icons and hover effects.
 *
 * Created: December 30, 2025
 */

import React from 'react';
import {
  TrendingUp,
  FileWarning,
  Mail,
  Calendar,
  CheckSquare,
  BarChart3,
  ArrowRight
} from 'lucide-react';

interface StarterPrompt {
  id: string;
  text: string;
  emoji: string;
  icon: React.ElementType;
  category: 'finance' | 'email' | 'calendar' | 'tasks' | 'analytics';
  colorClass: string;
}

const STARTER_PROMPTS: StarterPrompt[] = [
  {
    id: 'cash-flow',
    text: "What's my cash flow this month?",
    emoji: '💰',
    icon: TrendingUp,
    category: 'finance',
    colorClass: 'from-green-500 to-emerald-600'
  },
  {
    id: 'overdue-invoices',
    text: 'Show my overdue invoices',
    emoji: '📄',
    icon: FileWarning,
    category: 'finance',
    colorClass: 'from-amber-500 to-orange-600'
  },
  {
    id: 'email-summary',
    text: "Summarize today's emails",
    emoji: '📧',
    icon: Mail,
    category: 'email',
    colorClass: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'calendar-today',
    text: "What's on my calendar today?",
    emoji: '📅',
    icon: Calendar,
    category: 'calendar',
    colorClass: 'from-purple-500 to-violet-600'
  },
  {
    id: 'tasks-due',
    text: 'What tasks are due today?',
    emoji: '✅',
    icon: CheckSquare,
    category: 'tasks',
    colorClass: 'from-cyan-500 to-teal-600'
  },
  {
    id: 'revenue-trend',
    text: 'How is my revenue trending?',
    emoji: '📈',
    icon: BarChart3,
    category: 'analytics',
    colorClass: 'from-pink-500 to-rose-600'
  }
];

interface StarterPromptsProps {
  /** Handler when a prompt is clicked */
  onPromptClick: (prompt: string) => void;
  /** Optional: Filter prompts by category */
  categories?: Array<'finance' | 'email' | 'calendar' | 'tasks' | 'analytics'>;
  /** Optional: Maximum number of prompts to show */
  maxPrompts?: number;
  /** Optional: Custom className */
  className?: string;
  /** Optional: Show compact version */
  compact?: boolean;
}

export function StarterPrompts({
  onPromptClick,
  categories,
  maxPrompts = 6,
  className = '',
  compact = false
}: StarterPromptsProps) {
  // Filter prompts by category if specified
  const filteredPrompts = categories
    ? STARTER_PROMPTS.filter(p => categories.includes(p.category))
    : STARTER_PROMPTS;

  const displayPrompts = filteredPrompts.slice(0, maxPrompts);

  if (compact) {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {displayPrompts.map((prompt) => (
          <button
            key={prompt.id}
            onClick={() => onPromptClick(prompt.text)}
            className="group flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all text-left"
          >
            <span className="text-base">{prompt.emoji}</span>
            <span className="text-sm text-gray-700 group-hover:text-gray-900">{prompt.text}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {displayPrompts.map((prompt) => {
          const Icon = prompt.icon;
          return (
            <button
              key={prompt.id}
              onClick={() => onPromptClick(prompt.text)}
              className="group relative flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-md transition-all text-left overflow-hidden"
            >
              {/* Gradient background on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${prompt.colorClass} opacity-0 group-hover:opacity-5 transition-opacity`} />

              {/* Icon with gradient background */}
              <div className={`relative flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${prompt.colorClass} flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow`}>
                <Icon className="w-5 h-5 text-white" />
              </div>

              {/* Text content */}
              <div className="relative flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{prompt.emoji}</span>
                  <span className="text-sm font-medium text-gray-900 group-hover:text-gray-900">
                    {prompt.text}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-400 group-hover:text-gray-600 transition-colors">
                  <span>Click to ask</span>
                  <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Minimal starter prompt badges for inline display
 */
export function StarterPromptBadges({
  onPromptClick,
  maxPrompts = 4,
  className = ''
}: {
  onPromptClick: (prompt: string) => void;
  maxPrompts?: number;
  className?: string;
}) {
  const displayPrompts = STARTER_PROMPTS.slice(0, maxPrompts);

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {displayPrompts.map((prompt) => (
        <button
          key={prompt.id}
          onClick={() => onPromptClick(prompt.text)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-full hover:bg-gray-100 hover:text-gray-900 hover:border-gray-300 transition-all"
        >
          <span>{prompt.emoji}</span>
          <span className="truncate max-w-[120px]">{prompt.text}</span>
        </button>
      ))}
    </div>
  );
}

export default StarterPrompts;
