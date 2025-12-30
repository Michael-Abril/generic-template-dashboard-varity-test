'use client';

/**
 * Dashboard Quick Actions Bar
 *
 * Static action buttons for common dashboard tasks.
 * Based on frontend-ui-requirements-dec-30-2025.md
 *
 * Created: December 30, 2025
 */

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  FileText,
  Calendar,
  Plus,
  MessageSquare,
  FileSearch,
  CheckSquare,
} from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  href?: string;
  onClick?: () => void;
  color: string;
  description: string;
}

interface DashboardQuickActionsProps {
  walletAddress?: string;
  className?: string;
}

export function DashboardQuickActions({ walletAddress, className = '' }: DashboardQuickActionsProps) {
  const router = useRouter();

  const handleAskAI = () => {
    router.push('/ai-assistant');
  };

  const handleCreateTask = () => {
    router.push('/dashboard/tasks');
  };

  const quickActions: QuickAction[] = [
    {
      id: 'compose-email',
      label: 'Compose Email',
      icon: Mail,
      href: '/dashboard/tools/google',
      color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200',
      description: 'Send a new email via Gmail',
    },
    {
      id: 'create-invoice',
      label: 'Create Invoice',
      icon: FileText,
      href: '/dashboard/tools/quickbooks',
      color: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200',
      description: 'Create a new QuickBooks invoice',
    },
    {
      id: 'schedule-event',
      label: 'Schedule Event',
      icon: Calendar,
      href: '/dashboard/tools/google',
      color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200',
      description: 'Add a calendar event',
    },
    {
      id: 'ask-ai',
      label: 'Ask AI',
      icon: MessageSquare,
      onClick: handleAskAI,
      color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200',
      description: 'Get insights from your AI assistant',
    },
    {
      id: 'add-task',
      label: 'Add Task',
      icon: CheckSquare,
      onClick: handleCreateTask,
      color: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200',
      description: 'Create a new task',
    },
    {
      id: 'analyze-data',
      label: 'Analyze Data',
      icon: FileSearch,
      href: '/analytics',
      color: 'bg-pink-50 text-pink-700 hover:bg-pink-100 border-pink-200',
      description: 'View business analytics',
    },
  ];

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Plus className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-700">Quick Actions</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {quickActions.map((action) => {
          const Icon = action.icon;

          if (action.href) {
            return (
              <Link
                key={action.id}
                href={action.href}
                className={`
                  inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                  border transition-all duration-200
                  hover:shadow-sm hover:scale-[1.02]
                  ${action.color}
                `}
                title={action.description}
              >
                <Icon className="w-4 h-4" />
                <span>{action.label}</span>
              </Link>
            );
          }

          return (
            <button
              key={action.id}
              onClick={action.onClick}
              className={`
                inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                border transition-all duration-200
                hover:shadow-sm hover:scale-[1.02]
                ${action.color}
              `}
              title={action.description}
            >
              <Icon className="w-4 h-4" />
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default DashboardQuickActions;
