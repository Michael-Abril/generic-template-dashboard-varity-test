'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { usePrivy } from '@privy-io/react-auth';
import { useWalletSync } from '@/hooks/useWalletSync';
import {
  Plus,
  Check,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Pencil,
  Trash2,
  X,
  Filter,
} from 'lucide-react';
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
} from '@/services/planningService';
import {
  Task,
  TaskPriority,
  TaskCategory,
  TaskCreate,
  TaskUpdate,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  getRelativeDueDate,
  isTaskOverdue,
  isTaskDueToday,
} from '@/types/planning';
import { logger } from '@/lib/logger';

type FilterType = 'all' | 'today' | 'upcoming' | 'completed' | 'overdue';

export default function TasksPage() {
  const { authenticated } = usePrivy();
  const { address: walletAddress } = useWalletSync();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Quick add state
  const [quickAddValue, setQuickAddValue] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Add Task Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTask, setNewTask] = useState<Partial<TaskCreate>>({
    title: '',
    description: '',
    priority: 'medium',
    category: 'operations',
    due_date: '',
  });

  // Edit/Delete state
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    if (!walletAddress) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await getTasks(walletAddress);
      setTasks(response.tasks);
    } catch (err) {
      logger.error('Error fetching tasks:', err);
      setError('Unable to load tasks. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (authenticated && walletAddress) {
      fetchTasks();
    }
  }, [authenticated, walletAddress, fetchTasks]);

  // Quick add handler
  const handleQuickAdd = async () => {
    if (!quickAddValue.trim() || !walletAddress) return;

    setIsCreating(true);
    try {
      const newTaskData = await createTask({
        wallet_address: walletAddress,
        title: quickAddValue.trim(),
        priority: 'medium',
        category: 'operations',
      });
      setTasks((prev) => [newTaskData, ...prev]);
      setQuickAddValue('');
    } catch (err) {
      logger.error('Error creating task:', err);
    } finally {
      setIsCreating(false);
    }
  };

  // Full add dialog handler
  const handleAddTask = async () => {
    if (!newTask.title?.trim() || !walletAddress) return;

    setIsCreating(true);
    try {
      const taskData: TaskCreate = {
        wallet_address: walletAddress,
        title: newTask.title.trim(),
        description: newTask.description?.trim(),
        priority: newTask.priority || 'medium',
        category: newTask.category || 'operations',
        due_date: newTask.due_date || undefined,
      };

      const createdTask = await createTask(taskData);
      setTasks((prev) => [createdTask, ...prev]);
      setShowAddDialog(false);
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        category: 'operations',
        due_date: '',
      });
    } catch (err) {
      logger.error('Error creating task:', err);
    } finally {
      setIsCreating(false);
    }
  };

  // Complete handler
  const handleComplete = async (taskId: number) => {
    if (!walletAddress) return;

    setCompletingTaskId(taskId);
    try {
      const updatedTask = await completeTask(taskId, walletAddress);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
    } catch (err) {
      logger.error('Error completing task:', err);
    } finally {
      setCompletingTaskId(null);
    }
  };

  // Edit title handler
  const handleStartEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditValue(task.title);
  };

  const handleSaveEdit = async (taskId: number) => {
    if (!walletAddress || !editValue.trim()) return;

    try {
      const updatedTask = await updateTask(taskId, walletAddress, {
        title: editValue.trim(),
      });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
      setEditingTaskId(null);
    } catch (err) {
      logger.error('Error updating task:', err);
    }
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditValue('');
  };

  // Delete handler
  const handleDelete = async (taskId: number) => {
    if (!walletAddress) return;

    setDeletingTaskId(taskId);
    try {
      await deleteTask(taskId, walletAddress);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      logger.error('Error deleting task:', err);
    } finally {
      setDeletingTaskId(null);
    }
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    switch (activeFilter) {
      case 'today':
        return tasks.filter((t) => !t.is_completed && isTaskDueToday(t));
      case 'upcoming':
        return tasks.filter(
          (t) => !t.is_completed && !isTaskDueToday(t) && !isTaskOverdue(t)
        );
      case 'completed':
        return tasks.filter((t) => t.is_completed);
      case 'overdue':
        return tasks.filter((t) => !t.is_completed && isTaskOverdue(t));
      case 'all':
      default:
        return tasks.filter((t) => !t.is_completed);
    }
  }, [tasks, activeFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = tasks.filter((t) => !t.is_completed).length;
    const completed = tasks.filter((t) => t.is_completed).length;
    const overdue = tasks.filter((t) => !t.is_completed && isTaskOverdue(t)).length;
    const today = tasks.filter((t) => !t.is_completed && isTaskDueToday(t)).length;

    return { total, completed, overdue, today };
  }, [tasks]);

  // Helper functions
  const getPriorityDot = (priority: TaskPriority) => {
    const config = TASK_PRIORITIES[priority];
    return <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />;
  };

  const getCategoryBadge = (category: TaskCategory) => {
    const config = TASK_CATEGORIES[category];
    return (
      <span
        className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.textColor}`}
      >
        {config.label}
      </span>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6 animate-pulse" />
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-5 h-5 rounded-full bg-gray-200" />
                  <div className="flex-1 h-4 bg-gray-200 rounded" />
                  <div className="w-12 h-4 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Unable to load tasks
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchTasks}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
            <p className="text-sm text-gray-600 mt-1">
              {stats.total} active task{stats.total !== 1 ? 's' : ''}
              {stats.overdue > 0 && (
                <span className="text-red-600 font-medium ml-2">
                  {stats.overdue} overdue
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => setShowAddDialog(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { key: 'all' as FilterType, label: 'All', count: stats.total },
            { key: 'today' as FilterType, label: 'Today', count: stats.today },
            {
              key: 'upcoming' as FilterType,
              label: 'Upcoming',
              count: stats.total - stats.today - stats.overdue,
            },
            {
              key: 'completed' as FilterType,
              label: 'Completed',
              count: stats.completed,
            },
            { key: 'overdue' as FilterType, label: 'Overdue', count: stats.overdue },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                activeFilter === filter.key
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter.label}
              <span className="ml-1.5 text-xs opacity-75">({filter.count})</span>
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          {/* Quick Add */}
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={quickAddValue}
                onChange={(e) => setQuickAddValue(e.target.value)}
                placeholder="What needs to be done?"
                className="flex-1 px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleQuickAdd();
                }}
              />
              <button
                onClick={handleQuickAdd}
                disabled={!quickAddValue.trim() || isCreating}
                className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
              </button>
            </div>
          </div>

          {/* Task List */}
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center">
              {activeFilter === 'completed' ? (
                <>
                  <CheckCircle2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-900">No completed tasks yet</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Completed tasks will appear here
                  </p>
                </>
              ) : activeFilter === 'today' ? (
                <>
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-900">Nothing due today</p>
                  <p className="text-xs text-gray-500 mt-1">You're all caught up for today</p>
                </>
              ) : activeFilter === 'overdue' ? (
                <>
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-900">No overdue tasks</p>
                  <p className="text-xs text-gray-500 mt-1">Great job staying on track!</p>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-900">All caught up!</p>
                  <p className="text-xs text-gray-500 mt-1">
                    No pending tasks right now. Add one above to get started.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTasks.map((task) => {
                const isCompleting = completingTaskId === task.id;
                const isDeleting = deletingTaskId === task.id;
                const isEditing = editingTaskId === task.id;
                const isOverdue = isTaskOverdue(task);
                const isDueToday = isTaskDueToday(task);

                return (
                  <div
                    key={task.id}
                    className={`group flex items-center gap-3 p-3 -mx-3 rounded-lg hover:bg-gray-50 transition-all ${
                      isCompleting || isDeleting ? 'opacity-50' : ''
                    } ${task.is_completed ? 'opacity-60' : ''}`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => handleComplete(task.id)}
                      disabled={isCompleting || task.is_completed}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 ${
                        task.is_completed
                          ? 'border-green-500 bg-green-500'
                          : isOverdue
                          ? 'border-red-300 hover:border-red-500 hover:bg-red-50'
                          : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                      }`}
                    >
                      {task.is_completed || isCompleting ? (
                        <Check className="w-3 h-3 text-white" />
                      ) : (
                        <Check className="w-3 h-3 text-transparent group-hover:text-gray-400" />
                      )}
                    </button>

                    {/* Task Content */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(task.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                          <button
                            onClick={() => handleSaveEdit(task.id)}
                            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-2 py-1 text-gray-600 text-xs hover:text-gray-800"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm text-gray-900 truncate ${
                                task.is_completed ? 'line-through' : ''
                              }`}
                            >
                              {task.title}
                            </span>
                            {getPriorityDot(task.priority)}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {getCategoryBadge(task.category)}
                            {task.due_date && (
                              <span
                                className={`flex items-center gap-1 text-xs ${
                                  isOverdue
                                    ? 'text-red-600 font-medium'
                                    : isDueToday
                                    ? 'text-blue-600'
                                    : 'text-gray-500'
                                }`}
                              >
                                <Calendar className="w-3 h-3" />
                                {getRelativeDueDate(task.due_date)}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Actions (on hover) */}
                    {!isEditing && !task.is_completed && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleStartEdit(task)}
                          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit task"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(task.id)}
                          disabled={isDeleting}
                          className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete task"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Task Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add Task</h2>
              <button
                onClick={() => setShowAddDialog(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  value={newTask.title || ''}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="What needs to be done?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newTask.description || ''}
                  onChange={(e) =>
                    setNewTask({ ...newTask, description: e.target.value })
                  }
                  placeholder="Add more details..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={newTask.priority || 'medium'}
                  onChange={(e) =>
                    setNewTask({ ...newTask, priority: e.target.value as TaskPriority })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="high">Urgent</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={newTask.category || 'operations'}
                  onChange={(e) =>
                    setNewTask({ ...newTask, category: e.target.value as TaskCategory })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="sales">Sales</option>
                  <option value="finance">Finance</option>
                  <option value="operations">Operations</option>
                  <option value="marketing">Marketing</option>
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date (optional)
                </label>
                <input
                  type="date"
                  value={newTask.due_date || ''}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
            </div>

            {/* Dialog Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTask}
                disabled={!newTask.title?.trim() || isCreating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  'Add Task'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
