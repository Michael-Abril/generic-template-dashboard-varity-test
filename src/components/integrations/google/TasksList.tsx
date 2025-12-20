'use client';

import { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  Circle,
  Plus,
  List,
  Calendar,
  ChevronDown,
  ChevronRight,
  Star,
  Trash2,
  Edit3,
  MoreVertical,
  Clock,
  X,
  ListPlus
} from 'lucide-react';

interface TasksListProps {
  walletAddress: string;
  data: any;
}

interface Task {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  status: 'needsAction' | 'completed';
  position: string;
  parent?: string;
  children?: Task[];
}

interface TaskList {
  id: string;
  title: string;
  taskCount: number;
}

export function TasksList({ walletAddress, data }: TasksListProps) {
  const [taskLists, setTaskLists] = useState<TaskList[]>([
    { id: 'default', title: 'My Tasks', taskCount: 0 }
  ]);
  const [selectedListId, setSelectedListId] = useState('default');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showCompleted, setShowCompleted] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load tasks from data prop (if available)
  useEffect(() => {
    if (data?.tasks) {
      const parsedTasks = data.tasks.map((task: any) => ({
        id: task.id || `task-${Math.random().toString(36).substr(2, 9)}`,
        title: task.title || 'Untitled Task',
        notes: task.notes || '',
        due: task.due || null,
        status: task.status || 'needsAction',
        position: task.position || '0',
        parent: task.parent || null
      }));
      setTasks(parsedTasks);
    }
    if (data?.taskLists) {
      setTaskLists(data.taskLists);
    }
  }, [data]);

  const activeTasks = tasks.filter(t => t.status === 'needsAction');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      status: 'needsAction',
      position: String(tasks.length)
    };

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/google/tasks`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet_address: walletAddress,
            list_id: selectedListId,
            title: newTaskTitle.trim()
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        newTask.id = data.id || newTask.id;
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    }

    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
    inputRef.current?.focus();
  };

  const handleToggleComplete = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'needsAction' : 'completed';

    // Optimistic update
    setTasks(tasks.map(t =>
      t.id === task.id ? { ...t, status: newStatus } : t
    ));

    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/google/tasks/${task.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet_address: walletAddress,
            status: newStatus
          })
        }
      );
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
    setSelectedTask(null);

    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/google/tasks/${taskId}?wallet_address=${walletAddress}`,
        { method: 'DELETE' }
      );
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    setTasks(tasks.map(t =>
      t.id === taskId ? { ...t, ...updates } : t
    ));

    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/google/tasks/${taskId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet_address: walletAddress,
            ...updates
          })
        }
      );
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;

    const newList: TaskList = {
      id: `list-${Date.now()}`,
      title: newListName.trim(),
      taskCount: 0
    };

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/google/tasklists`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet_address: walletAddress,
            title: newListName.trim()
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        newList.id = data.id || newList.id;
      }
    } catch (error) {
      console.error('Failed to create task list:', error);
    }

    setTaskLists([...taskLists, newList]);
    setShowNewListModal(false);
    setNewListName('');
    setSelectedListId(newList.id);
  };

  const formatDueDate = (due?: string) => {
    if (!due) return null;
    const date = new Date(due);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return { text: 'Today', color: 'text-blue-600' };
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return { text: 'Tomorrow', color: 'text-purple-600' };
    } else if (date < today) {
      return { text: date.toLocaleDateString(), color: 'text-red-600' };
    }
    return { text: date.toLocaleDateString(), color: 'text-gray-500' };
  };

  const renderTask = (task: Task, isSubtask = false) => {
    const isEditing = editingTaskId === task.id;
    const dueInfo = formatDueDate(task.due);

    return (
      <div
        key={task.id}
        className={`group flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${
          isSubtask ? 'ml-8' : ''
        }`}
        onClick={() => setSelectedTask(task)}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleComplete(task);
          }}
          className="mt-0.5 flex-shrink-0"
        >
          {task.status === 'completed' ? (
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
          ) : (
            <Circle className="h-5 w-5 text-gray-400 hover:text-blue-600" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onBlur={() => {
                if (editingTitle.trim()) {
                  handleUpdateTask(task.id, { title: editingTitle.trim() });
                }
                setEditingTaskId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (editingTitle.trim()) {
                    handleUpdateTask(task.id, { title: editingTitle.trim() });
                  }
                  setEditingTaskId(null);
                } else if (e.key === 'Escape') {
                  setEditingTaskId(null);
                }
              }}
              className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
              autoFocus
            />
          ) : (
            <>
              <p className={`text-gray-900 ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                {task.title}
              </p>
              {dueInfo && (
                <div className={`flex items-center gap-1 text-sm ${dueInfo.color}`}>
                  <Calendar className="h-3 w-3" />
                  {dueInfo.text}
                </div>
              )}
            </>
          )}
        </div>

        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingTaskId(task.id);
              setEditingTitle(task.title);
            }}
            className="p-1 hover:bg-gray-200 rounded"
            title="Edit"
          >
            <Edit3 className="h-4 w-4 text-gray-500" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteTask(task.id);
            }}
            className="p-1 hover:bg-gray-200 rounded"
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border flex h-[calc(100vh-200px)]">
      {/* Sidebar */}
      <div className="w-64 border-r bg-gray-50 p-4 flex flex-col">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Task Lists</h2>

        <div className="space-y-1 flex-1">
          {taskLists.map((list) => (
            <button
              key={list.id}
              onClick={() => setSelectedListId(list.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                selectedListId === list.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <List className="h-4 w-4" />
              <span className="font-medium flex-1 text-left">{list.title}</span>
              <span className="text-sm opacity-70">
                {list.id === selectedListId ? activeTasks.length : list.taskCount}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowNewListModal(true)}
          className="flex items-center gap-2 px-3 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors mt-4"
        >
          <ListPlus className="h-4 w-4" />
          <span className="font-medium">Create new list</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {taskLists.find(l => l.id === selectedListId)?.title || 'My Tasks'}
          </h1>
        </div>

        {/* Quick Add */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <Plus className="h-5 w-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddTask();
                }
              }}
              placeholder="Add a task"
              className="flex-1 text-gray-900 placeholder:text-gray-400 outline-none text-lg"
            />
            {newTaskTitle && (
              <button
                onClick={handleAddTask}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Add
              </button>
            )}
          </div>
        </div>

        {/* Tasks List */}
        <div className="flex-1 overflow-auto px-4 py-4">
          {/* Active Tasks */}
          <div className="space-y-1">
            {activeTasks.map(task => renderTask(task))}
          </div>

          {activeTasks.length === 0 && completedTasks.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No tasks yet</h3>
              <p className="text-gray-500">Add a task above to get started</p>
            </div>
          )}

          {/* Completed Section */}
          {completedTasks.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
              >
                {showCompleted ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span className="font-medium">Completed ({completedTasks.length})</span>
              </button>
              {showCompleted && (
                <div className="space-y-1 opacity-60">
                  {completedTasks.map(task => renderTask(task))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Task Detail Panel */}
      {selectedTask && (
        <div className="w-80 border-l bg-gray-50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Task Details</h3>
            <button
              onClick={() => setSelectedTask(null)}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Title</label>
              <input
                type="text"
                value={selectedTask.title}
                onChange={(e) => {
                  const newTitle = e.target.value;
                  setSelectedTask({ ...selectedTask, title: newTitle });
                  handleUpdateTask(selectedTask.id, { title: newTitle });
                }}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Notes</label>
              <textarea
                value={selectedTask.notes || ''}
                onChange={(e) => {
                  const newNotes = e.target.value;
                  setSelectedTask({ ...selectedTask, notes: newNotes });
                  handleUpdateTask(selectedTask.id, { notes: newNotes });
                }}
                placeholder="Add notes..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Due Date</label>
              <input
                type="date"
                value={selectedTask.due || ''}
                onChange={(e) => {
                  const newDue = e.target.value;
                  setSelectedTask({ ...selectedTask, due: newDue });
                  handleUpdateTask(selectedTask.id, { due: newDue });
                }}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <button
              onClick={() => handleDeleteTask(selectedTask.id)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete Task
            </button>
          </div>
        </div>
      )}

      {/* New List Modal */}
      {showNewListModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create new list</h2>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="List name"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newListName.trim()) {
                  handleCreateList();
                }
              }}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowNewListModal(false);
                  setNewListName('');
                }}
                className="px-4 py-2.5 border-2 border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateList}
                disabled={!newListName.trim()}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
