'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Check,
  ArrowRight,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { getTasks, createTask, completeTask, updateTask, deleteTask } from '@/services/planningService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

  // Task detail dialog state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    category: 'operations' as TaskCategory,
    due_date: ''
  });

  // View All modal state
  const [showViewAllModal, setShowViewAllModal] = useState(false);

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

  const handleOpenTaskDialog = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTask(task);
    setEditForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      category: task.category,
      due_date: task.due_date || ''
    });
    setEditMode(false);
    setShowTaskDialog(true);
  };

  const handleUpdateTask = async () => {
    if (!selectedTask) return;

    setIsUpdating(true);
    try {
      const updatedTask = await updateTask(selectedTask.id, walletAddress, editForm);
      setTasks((prev) =>
        prev.map((t) => (t.id === selectedTask.id ? updatedTask : t))
      );
      setSelectedTask(updatedTask);
      setEditMode(false);
    } catch (err) {
      logger.error('Error updating task:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;

    if (!confirm('Are you sure you want to remove this task?')) return;

    setIsDeleting(true);
    try {
      await deleteTask(selectedTask.id, walletAddress);
      setTasks((prev) => prev.filter((t) => t.id !== selectedTask.id));
      setStats((prev) => ({ ...prev, total: prev.total - 1 }));
      setShowTaskDialog(false);
      setSelectedTask(null);
    } catch (err) {
      logger.error('Error deleting task:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCompleteFromDialog = async () => {
    if (!selectedTask) return;

    await handleComplete(selectedTask.id);
    setShowTaskDialog(false);
    setSelectedTask(null);
  };

  // Filter tasks for display
  const uncompletedTasks = tasks.filter((t) => !t.is_completed);
  const completedTasks = tasks.filter((t) => t.is_completed);
  const todayTasks = uncompletedTasks.filter(isTaskDueToday);
  const upcomingTasks = uncompletedTasks.filter((t) => !isTaskDueToday(t) && !isTaskOverdue(t));
  const overdueTasks = uncompletedTasks.filter(isTaskOverdue);

  // Combine for display (max 4 items total: 3 uncompleted + 1 completed)
  const displayUncompletedTasks = [...overdueTasks, ...todayTasks, ...upcomingTasks].slice(0, 3);
  const displayCompletedTasks = completedTasks.slice(0, 1);
  const displayTasks = [...displayUncompletedTasks, ...displayCompletedTasks];

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

  const getDueDateText = (dueDate: string | null | undefined) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if today
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    // Check if tomorrow
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    // Check if this week
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    if (date <= nextWeek) {
      return 'This week';
    }
    // Otherwise return relative date
    return getRelativeDueDate(dueDate);
  };

  const getPriorityLabel = (priority: TaskPriority) => {
    return TASK_PRIORITIES[priority].label.toUpperCase();
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
      <div className="mb-4">
        <h3 id="tasks-widget-title" className="font-semibold text-gray-900">My Tasks</h3>
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
            className="flex-1 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        <>
          <div className="space-y-2" role="list" aria-label="Task list">
            {displayTasks.map((task) => {
              const isCompleting = completingTaskId === task.id;
              const dueDateText = getDueDateText(task.due_date);
              const priorityLabel = getPriorityLabel(task.priority);

              return (
                <div
                  key={task.id}
                  role="listitem"
                  className={`group flex items-center gap-2 py-1 ${
                    isCompleting ? 'opacity-50 scale-95' : ''
                  } ${task.is_completed ? 'opacity-60' : ''}`}
                >
                  {/* Checkbox - Square brackets visual style */}
                  <button
                    onClick={() => task.is_completed ? null : handleComplete(task.id)}
                    disabled={isCompleting || task.is_completed}
                    role="checkbox"
                    aria-checked={task.is_completed}
                    aria-label={`Mark "${task.title}" as complete`}
                    className="flex-shrink-0 w-4 h-4 border-2 border-gray-400 rounded flex items-center justify-center transition-all hover:border-blue-500"
                  >
                    {task.is_completed && (
                      <Check className="w-3 h-3 text-gray-600" aria-hidden="true" />
                    )}
                  </button>

                  {/* Task Content - Single line format */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer text-sm text-gray-900"
                    onClick={(e) => handleOpenTaskDialog(task, e)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenTaskDialog(task, e as any);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`View details for task: ${task.title}`}
                  >
                    <span className={task.is_completed ? 'line-through' : ''}>
                      {task.title}
                    </span>
                    {dueDateText && (
                      <span className="ml-2 text-gray-500">
                        {dueDateText}
                      </span>
                    )}
                    {task.priority === 'high' && !task.is_completed && (
                      <span className="ml-2 text-xs font-semibold text-red-600">
                        {priorityLabel}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* View All Link */}
          <div className="mt-3 text-right">
            <button
              onClick={() => setShowViewAllModal(true)}
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              View All
            </button>
          </div>
        </>
      )}

      {/* Task Detail Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-gray-900">Task Details</DialogTitle>
              <button
                onClick={() => setShowTaskDialog(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-4">
              {/* Edit Mode */}
              {editMode ? (
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label htmlFor="edit-title" className="block text-sm font-medium text-gray-900 mb-1">
                      Title
                    </label>
                    <input
                      id="edit-title"
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label htmlFor="edit-description" className="block text-sm font-medium text-gray-900 mb-1">
                      Description
                    </label>
                    <textarea
                      id="edit-description"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>

                  {/* Priority and Category */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="edit-priority" className="block text-sm font-medium text-gray-900 mb-1">
                        Priority
                      </label>
                      <select
                        id="edit-priority"
                        value={editForm.priority}
                        onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as TaskPriority })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">Urgent</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="edit-category" className="block text-sm font-medium text-gray-900 mb-1">
                        Category
                      </label>
                      <select
                        id="edit-category"
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value as TaskCategory })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        <option value="sales">Sales</option>
                        <option value="marketing">Marketing</option>
                        <option value="operations">Operations</option>
                        <option value="finance">Finance</option>
                      </select>
                    </div>
                  </div>

                  {/* Due Date */}
                  <div>
                    <label htmlFor="edit-due-date" className="block text-sm font-medium text-gray-900 mb-1">
                      Due Date
                    </label>
                    <input
                      id="edit-due-date"
                      type="date"
                      value={editForm.due_date}
                      onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>

                  {/* Edit Mode Actions */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={handleUpdateTask}
                      disabled={isUpdating || !editForm.title.trim()}
                      className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                      aria-label="Save changes"
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                    <button
                      onClick={() => setEditMode(false)}
                      disabled={isUpdating}
                      className="px-4 py-2.5 border border-gray-300 text-gray-900 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{selectedTask.title}</h3>
                  </div>

                  {/* Priority and Category Badges */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">Priority:</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedTask.priority === 'high' ? 'bg-red-100 text-red-700' :
                        selectedTask.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {TASK_PRIORITIES[selectedTask.priority].label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">Category:</span>
                      {getCategoryBadge(selectedTask.category)}
                    </div>
                  </div>

                  {/* Due Date */}
                  {selectedTask.due_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-900">
                        Due: {getRelativeDueDate(selectedTask.due_date)}
                      </span>
                      {isTaskOverdue(selectedTask) && (
                        <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          Overdue
                        </span>
                      )}
                    </div>
                  )}

                  {/* Description */}
                  {selectedTask.description && (
                    <div className="pt-3 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedTask.description}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={handleCompleteFromDialog}
                      className="flex-1 px-4 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                      aria-label="Mark task as done"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Mark as Done
                    </button>
                    <button
                      onClick={() => setEditMode(true)}
                      className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      aria-label="Edit task"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={handleDeleteTask}
                      disabled={isDeleting}
                      className="px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                      aria-label="Remove task"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View All Tasks Modal */}
      <Dialog open={showViewAllModal} onOpenChange={setShowViewAllModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-gray-900">All Tasks</DialogTitle>
              <button
                onClick={() => setShowViewAllModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </DialogHeader>

          {/* Quick Add in Modal */}
          <div className="px-1 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Add a new task..."
                className="flex-1 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleQuickAdd();
                }}
              />
              <button
                onClick={handleQuickAdd}
                disabled={!newTaskTitle.trim() || isCreating}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add
              </button>
            </div>
          </div>

          {/* Scrollable Task List */}
          <div className="flex-1 overflow-y-auto py-4">
            {tasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">No tasks yet</p>
                <p className="text-sm text-gray-400 mt-1">Add your first task above</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Overdue Tasks */}
                {overdueTasks.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-red-600 uppercase tracking-wide mb-2 px-2">
                      Overdue ({overdueTasks.length})
                    </p>
                    {overdueTasks.map((task) => (
                      <TaskRowItem
                        key={task.id}
                        task={task}
                        isCompleting={completingTaskId === task.id}
                        onComplete={handleComplete}
                        onOpenDetails={(e) => {
                          setShowViewAllModal(false);
                          handleOpenTaskDialog(task, e);
                        }}
                        getPriorityDot={getPriorityDot}
                        getCategoryBadge={getCategoryBadge}
                      />
                    ))}
                  </div>
                )}

                {/* Today's Tasks */}
                {todayTasks.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-2 px-2">
                      Today ({todayTasks.length})
                    </p>
                    {todayTasks.map((task) => (
                      <TaskRowItem
                        key={task.id}
                        task={task}
                        isCompleting={completingTaskId === task.id}
                        onComplete={handleComplete}
                        onOpenDetails={(e) => {
                          setShowViewAllModal(false);
                          handleOpenTaskDialog(task, e);
                        }}
                        getPriorityDot={getPriorityDot}
                        getCategoryBadge={getCategoryBadge}
                      />
                    ))}
                  </div>
                )}

                {/* Upcoming Tasks */}
                {upcomingTasks.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-2">
                      Upcoming ({upcomingTasks.length})
                    </p>
                    {upcomingTasks.map((task) => (
                      <TaskRowItem
                        key={task.id}
                        task={task}
                        isCompleting={completingTaskId === task.id}
                        onComplete={handleComplete}
                        onOpenDetails={(e) => {
                          setShowViewAllModal(false);
                          handleOpenTaskDialog(task, e);
                        }}
                        getPriorityDot={getPriorityDot}
                        getCategoryBadge={getCategoryBadge}
                      />
                    ))}
                  </div>
                )}

                {/* Completed Tasks */}
                {tasks.filter(t => t.is_completed).length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-2 px-2">
                      Completed ({tasks.filter(t => t.is_completed).length})
                    </p>
                    {tasks.filter(t => t.is_completed).slice(0, 5).map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 p-2 mx-2 rounded-lg bg-gray-50 opacity-60"
                      >
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-gray-500 line-through truncate">{task.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Stats */}
          <div className="border-t border-gray-200 pt-3 mt-2">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>{stats.completed} of {stats.total} completed</span>
              <div className="flex items-center gap-4">
                {stats.overdue > 0 && (
                  <span className="text-red-600">{stats.overdue} overdue</span>
                )}
                {stats.today > 0 && (
                  <span className="text-blue-600">{stats.today} due today</span>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper component for task rows in the View All modal
function TaskRowItem({
  task,
  isCompleting,
  onComplete,
  onOpenDetails,
  getPriorityDot,
  getCategoryBadge,
}: {
  task: Task;
  isCompleting: boolean;
  onComplete: (id: number) => void;
  onOpenDetails: (e: React.MouseEvent) => void;
  getPriorityDot: (priority: TaskPriority) => React.ReactNode;
  getCategoryBadge: (category: TaskCategory) => React.ReactNode;
}) {
  const isOverdue = isTaskOverdue(task);
  const isDueToday = isTaskDueToday(task);

  return (
    <div
      className={`group flex items-center gap-3 p-2 mx-2 rounded-lg hover:bg-gray-50 transition-all ${
        isCompleting ? 'opacity-50 scale-95' : ''
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onComplete(task.id)}
        disabled={isCompleting}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 flex-shrink-0 ${
          isOverdue
            ? 'border-red-300 hover:border-red-500 hover:bg-red-50'
            : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
        }`}
      >
        {isCompleting ? (
          <Check className="w-3 h-3 text-green-500" />
        ) : (
          <Check className="w-3 h-3 text-transparent group-hover:text-gray-400" />
        )}
      </button>

      {/* Task Content - Clickable */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={onOpenDetails}
        role="button"
        tabIndex={0}
      >
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
}
