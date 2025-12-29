'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  Check,
  ArrowRight,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
} from 'lucide-react';
import { getTasks, createTask, completeTask } from '@/services/planningService';
import {
  Task,
  TaskPriority,
  TaskCategory,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  getRelativeDueDate,
  isTaskOverdue,
  isTaskDueToday,
} from '@/types/planning';
import { logger } from '@/lib/logger';

interface TasksWidgetProps {
  walletAddress: string;
}

export function TasksWidget({ walletAddress }: TasksWidgetProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    overdue: 0,
    today: 0,
  });

  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getTasks(walletAddress);
      setTasks(response.tasks);
      setStats({
        total: response.total_count,
        completed: response.completed_count,
        overdue: response.overdue_count,
        today: response.today_count,
      });
    } catch (err) {
      logger.error('Error fetching tasks:', err);
      setError('Unable to load tasks');
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress) {
      fetchTasks();
    }
  }, [walletAddress, fetchTasks]);

  const handleQuickAdd = async () => {
    if (!newTaskTitle.trim()) return;

    setIsCreating(true);
    try {
      const newTask = await createTask({
        wallet_address: walletAddress,
        title: newTaskTitle.trim(),
        priority: 'medium',
        category: 'operations',
      });
      setTasks((prev) => [newTask, ...prev]);
      setStats((prev) => ({ ...prev, total: prev.total + 1 }));
      setNewTaskTitle('');
      setShowQuickAdd(false);
    } catch (err) {
      logger.error('Error creating task:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleComplete = async (taskId: number) => {
    setCompletingTaskId(taskId);
    try {
      const updatedTask = await completeTask(taskId, walletAddress);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? updatedTask : t))
      );
      setStats((prev) => ({ ...prev, completed: prev.completed + 1 }));
      // Remove from list after animation
      setTimeout(() => {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }, 500);
    } catch (err) {
      logger.error('Error completing task:', err);
    } finally {
      setCompletingTaskId(null);
    }
  };

  // Filter uncompleted tasks for display
  const uncompletedTasks = tasks.filter((t) => !t.is_completed);
  const todayTasks = uncompletedTasks.filter(isTaskDueToday);
  const upcomingTasks = uncompletedTasks.filter((t) => !isTaskDueToday(t) && !isTaskOverdue(t));
  const overdueTasks = uncompletedTasks.filter(isTaskOverdue);

  // Combine for display (max 5 items)
  const displayTasks = [...overdueTasks, ...todayTasks, ...upcomingTasks].slice(0, 5);

  const getPriorityDot = (priority: TaskPriority) => {
    const config = TASK_PRIORITIES[priority];
    return (
      <span
        className={`w-2 h-2 rounded-full ${config.dotColor}`}
        role="status"
        aria-label={`Priority: ${config.label}`}
      />
    );
  };

  const getCategoryBadge = (category: TaskCategory) => {
    const config = TASK_CATEGORIES[category];
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.textColor}`}>
        {config.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div
        className="bg-white border border-gray-200 rounded-xl p-5"
        aria-busy="true"
        aria-label="Loading tasks"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 bg-gray-200 rounded w-24 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-5 h-5 rounded-full bg-gray-200" />
              <div className="flex-1 h-4 bg-gray-200 rounded" />
              <div className="w-12 h-4 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="bg-white border border-gray-200 rounded-xl p-5"
        role="alert"
        aria-live="assertive"
      >
        <div className="text-center py-4">
          <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-gray-600">{error}</p>
          <button
            onClick={fetchTasks}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            aria-label="Retry loading tasks"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white border border-gray-200 rounded-xl p-5"
      role="region"
      aria-labelledby="tasks-widget-title"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 id="tasks-widget-title" className="font-semibold text-gray-900">My Tasks</h3>
          {stats.overdue > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              <AlertCircle className="w-3 h-3" />
              {stats.overdue} overdue
            </span>
          )}
        </div>
        <Link
          href="/dashboard/tasks"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          View all
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Quick Add */}
      {showQuickAdd ? (
        <div className="mb-4 flex items-center gap-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="What needs to be done?"
            aria-label="New task title"
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleQuickAdd();
              if (e.key === 'Escape') {
                setShowQuickAdd(false);
                setNewTaskTitle('');
              }
            }}
          />
          <button
            onClick={handleQuickAdd}
            disabled={!newTaskTitle.trim() || isCreating}
            className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
          </button>
          <button
            onClick={() => {
              setShowQuickAdd(false);
              setNewTaskTitle('');
            }}
            className="px-3 py-2 text-gray-600 text-sm hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowQuickAdd(true)}
          className="w-full mb-4 px-3 py-2 text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add a task...
        </button>
      )}

      {/* Task List */}
      {displayTasks.length === 0 ? (
        <div className="py-6 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-900">All caught up!</p>
          <p className="text-xs text-gray-500 mt-1">No pending tasks right now</p>
        </div>
      ) : (
        <div className="space-y-1" role="list" aria-label="Task list">
          {/* Today Section */}
          {todayTasks.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Today ({todayTasks.length})
              </p>
            </div>
          )}

          {displayTasks.map((task) => {
            const isCompleting = completingTaskId === task.id;
            const isOverdue = isTaskOverdue(task);
            const isDueToday = isTaskDueToday(task);

            return (
              <div
                key={task.id}
                role="listitem"
                className={`group flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-all ${
                  isCompleting ? 'opacity-50 scale-95' : ''
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => handleComplete(task.id)}
                  disabled={isCompleting}
                  role="checkbox"
                  aria-checked={task.is_completed}
                  aria-label={`Mark "${task.title}" as complete`}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 ${
                    isOverdue
                      ? 'border-red-300 hover:border-red-500 hover:bg-red-50'
                      : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                  }`}
                >
                  {isCompleting ? (
                    <Check className="w-3 h-3 text-green-500" aria-hidden="true" />
                  ) : (
                    <Check className="w-3 h-3 text-transparent group-hover:text-gray-400" aria-hidden="true" />
                  )}
                </button>

                {/* Task Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900 truncate">{task.title}</span>
                    {getPriorityDot(task.priority)}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {getCategoryBadge(task.category)}
                    {task.due_date && (
                      <span
                        className={`flex items-center gap-1 text-xs ${
                          isOverdue ? 'text-red-600 font-medium' : isDueToday ? 'text-blue-600' : 'text-gray-500'
                        }`}
                      >
                        <Calendar className="w-3 h-3" />
                        {getRelativeDueDate(task.due_date)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Show more link if there are more tasks */}
          {uncompletedTasks.length > 5 && (
            <Link
              href="/dashboard/tasks"
              className="block pt-2 text-center text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              +{uncompletedTasks.length - 5} more tasks
            </Link>
          )}
        </div>
      )}

      {/* Stats Footer */}
      {stats.total > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>{stats.completed} of {stats.total} complete</span>
          <div
            className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Task completion progress"
          >
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-300"
              style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
