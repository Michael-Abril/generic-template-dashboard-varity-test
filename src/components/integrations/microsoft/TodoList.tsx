'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle,
  Circle,
  Plus,
  X,
  Calendar,
  Star,
  Trash2,
  List,
  Search,
  Filter,
  MoreVertical,
  Edit3
} from 'lucide-react';

interface TodoTask {
  id: string;
  title: string;
  dueDate?: string;
  isCompleted: boolean;
  importance: 'low' | 'normal' | 'high';
  notes?: string;
  listId: string;
}

interface TodoListType {
  id: string;
  name: string;
  taskCount: number;
}

interface TodoListProps {
  walletAddress: string;
}

export default function TodoList({ walletAddress }: TodoListProps) {
  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [lists, setLists] = useState<TodoListType[]>([
    { id: '1', name: 'My Tasks', taskCount: 0 },
    { id: '2', name: 'Work', taskCount: 0 },
    { id: '3', name: 'Personal', taskCount: 0 }
  ]);
  const [selectedList, setSelectedList] = useState('1');
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompleted, setFilterCompleted] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [walletAddress]);

  const fetchTasks = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/microsoft365/tasks?wallet_address=${walletAddress}`
      );
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
        setLists(data.lists || lists);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/microsoft365/tasks`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet_address: walletAddress,
            title: newTaskTitle,
            list_id: selectedList,
            due_date: newTaskDueDate || undefined,
            importance: 'normal'
          })
        }
      );

      if (response.ok) {
        setNewTaskTitle('');
        setNewTaskDueDate('');
        setShowNewTaskForm(false);
        fetchTasks();
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail || 'Failed to create task'}`);
      }
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Network error. Please try again.');
    }
  };

  const handleToggleComplete = async (taskId: string, isCompleted: boolean, listId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/microsoft365/tasks/${taskId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet_address: walletAddress,
            list_id: listId,
            is_completed: !isCompleted
          })
        }
      );
      if (response.ok) {
        fetchTasks();
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail || 'Failed to update task'}`);
      }
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Network error. Please try again.');
    }
  };

  const handleDeleteTask = async (taskId: string, listId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/integrations/microsoft365/tasks/${taskId}?wallet_address=${walletAddress}&list_id=${listId}`,
        {
          method: 'DELETE'
        }
      );
      if (response.ok) {
        fetchTasks();
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail || 'Failed to delete task'}`);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Network error. Please try again.');
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (task.listId !== selectedList) return false;
    if (filterCompleted && task.isCompleted) return false;
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const incompleteTasks = filteredTasks.filter((t) => !t.isCompleted);
  const completedTasks = filteredTasks.filter((t) => t.isCompleted);

  return (
    <div className="flex h-full gap-4">
      {/* Lists Sidebar */}
      <div className="w-64 flex-shrink-0 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">My Lists</h3>
        <div className="space-y-1">
          {lists.map((list) => (
            <button
              key={list.id}
              onClick={() => setSelectedList(list.id)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                selectedList === list.id
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <List className="h-4 w-4" />
                <span>{list.name}</span>
              </div>
              <span className="text-xs text-gray-400">{list.taskCount}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 rounded-lg border border-gray-200 bg-white shadow-sm">
        {/* Header */}
        <div className="border-b border-gray-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {lists.find((l) => l.id === selectedList)?.name || 'Tasks'}
            </h2>
            <button
              onClick={() => setShowNewTaskForm(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Task
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={filterCompleted}
                onChange={(e) => setFilterCompleted(e.target.checked)}
                className="rounded border-gray-300"
              />
              Hide completed
            </label>
          </div>
        </div>

        {/* Tasks List */}
        <div className="divide-y divide-gray-100">
          {/* Incomplete Tasks */}
          {incompleteTasks.length > 0 && (
            <div className="p-4">
              <div className="space-y-2">
                {incompleteTasks.map((task) => (
                  <div
                    key={task.id}
                    className="group flex items-start gap-3 rounded-lg border border-gray-200 p-3 transition-all hover:shadow-sm"
                  >
                    <button
                      onClick={() => handleToggleComplete(task.id, task.isCompleted, task.listId)}
                      className="mt-0.5 flex-shrink-0"
                    >
                      <Circle className="h-5 w-5 text-gray-400 transition-colors hover:text-blue-600" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{task.title}</p>
                      {task.dueDate && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      )}
                      {task.notes && (
                        <p className="mt-1 text-sm text-gray-600">{task.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button className="rounded p-1 hover:bg-gray-100">
                        <Star className="h-4 w-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id, task.listId)}
                        className="rounded p-1 hover:bg-gray-100"
                      >
                        <Trash2 className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="p-4">
              <h3 className="mb-3 text-sm font-medium text-gray-500">
                Completed ({completedTasks.length})
              </h3>
              <div className="space-y-2">
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="group flex items-start gap-3 rounded-lg border border-gray-200 p-3 opacity-60 transition-all hover:opacity-100"
                  >
                    <button
                      onClick={() => handleToggleComplete(task.id, task.isCompleted, task.listId)}
                      className="mt-0.5 flex-shrink-0"
                    >
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-600 line-through">{task.title}</p>
                      {task.dueDate && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                          <Calendar className="h-3 w-3" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteTask(task.id, task.listId)}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredTasks.length === 0 && (
            <div className="p-12 text-center">
              <CheckCircle className="mx-auto h-16 w-16 text-gray-300" />
              <p className="mt-4 text-gray-500">No tasks yet</p>
              <button
                onClick={() => setShowNewTaskForm(true)}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                Add your first task
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Task Modal */}
      {showNewTaskForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">New Task</h3>
              <button
                onClick={() => setShowNewTaskForm(false)}
                className="rounded-lg p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="What do you need to do?"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Due Date
                </label>
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={handleCreateTask}
                disabled={!newTaskTitle.trim()}
                className="flex-1 rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Add Task
              </button>
              <button
                onClick={() => setShowNewTaskForm(false)}
                className="flex-1 rounded-lg border border-gray-300 py-2 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
