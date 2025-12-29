'use client';

import { CheckSquare, Clock, ArrowRight } from 'lucide-react';
import type { TasksData } from '@/types/google';

interface TasksListProps {
  walletAddress: string;
  data: TasksData | null;
}

export function TasksList({ walletAddress, data }: TasksListProps) {
  return (
    <div className="bg-white rounded-lg border flex flex-col h-[calc(100vh-200px)]">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          {/* Icon */}
          <div className="relative inline-block mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-green-50 to-green-100 rounded-full flex items-center justify-center">
              <CheckSquare className="h-12 w-12 text-green-500" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center border-4 border-white">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Google Tasks Coming Soon
          </h2>

          {/* Description */}
          <p className="text-gray-600 mb-6 leading-relaxed">
            We&apos;re working on bringing Google Tasks to Varity.
            Soon you&apos;ll be able to manage all your tasks and to-dos
            in one organized place.
          </p>

          {/* Features preview */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">What&apos;s coming:</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ArrowRight className="h-4 w-4 text-green-500" />
                <span>View and manage all your tasks</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ArrowRight className="h-4 w-4 text-green-500" />
                <span>Create task lists and organize items</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ArrowRight className="h-4 w-4 text-green-500" />
                <span>Set due dates and reminders</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ArrowRight className="h-4 w-4 text-green-500" />
                <span>Mark tasks as complete</span>
              </div>
            </div>
          </div>

          {/* Status badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-medium">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            In Development
          </div>
        </div>
      </div>
    </div>
  );
}
