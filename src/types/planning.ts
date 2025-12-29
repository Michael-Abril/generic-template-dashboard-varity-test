/**
 * Planning Types - Tasks and Company Roadmap
 *
 * TypeScript interfaces for business planning features.
 * Matches backend models in backend/app/models/planning.py
 */

// =====================================================================
// TASK TYPES
// =====================================================================

export type TaskPriority = 'high' | 'medium' | 'low';

export type TaskCategory = 'sales' | 'finance' | 'operations' | 'marketing';

export interface Task {
  id: number;
  wallet_address: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  category: TaskCategory;
  is_completed: boolean;
  completed_at?: string;
  due_date?: string;
  created_at: string;
  updated_at?: string;
}

export interface TaskCreate {
  wallet_address: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  category?: TaskCategory;
  due_date?: string;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  category?: TaskCategory;
  due_date?: string;
  is_completed?: boolean;
}

export interface TaskListResponse {
  tasks: Task[];
  total_count: number;
  completed_count: number;
  overdue_count: number;
  today_count: number;
}

// =====================================================================
// MILESTONE/ROADMAP TYPES
// =====================================================================

export type MilestoneStatus = 'planned' | 'in_progress' | 'completed' | 'at_risk';

export type TimeframeType = 'quarterly' | 'monthly' | 'custom';

export type GoalType = 'growth' | 'revenue' | 'product' | 'operations';

export interface Milestone {
  id: number;
  wallet_address: string;
  title: string;
  description?: string;
  timeframe_type: TimeframeType;
  timeframe_value: string;
  target_date?: string;
  progress_percent: number;
  status: MilestoneStatus;
  goal_type: GoalType;
  color: string;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
}

export interface MilestoneCreate {
  wallet_address: string;
  title: string;
  description?: string;
  timeframe_type?: TimeframeType;
  timeframe_value: string;
  target_date?: string;
  goal_type?: GoalType;
  color?: string;
}

export interface MilestoneUpdate {
  title?: string;
  description?: string;
  timeframe_type?: TimeframeType;
  timeframe_value?: string;
  target_date?: string;
  progress_percent?: number;
  status?: MilestoneStatus;
  goal_type?: GoalType;
  color?: string;
}

export interface RoadmapResponse {
  milestones: Milestone[];
  current_timeframe: string;
  overall_progress: number;
  total_count: number;
  completed_count: number;
  in_progress_count: number;
  at_risk_count: number;
}

// =====================================================================
// UI HELPER TYPES
// =====================================================================

export interface TaskCategoryConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
}

export interface PriorityConfig {
  label: string;
  color: string;
  dotColor: string;
  bgColor: string;
  textColor: string;
}

export interface MilestoneStatusConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
}

export interface GoalTypeConfig {
  label: string;
  icon: string;
  color: string;
}

// =====================================================================
// CONFIGURATION OBJECTS
// =====================================================================

export const TASK_CATEGORIES: Record<TaskCategory, TaskCategoryConfig> = {
  sales: {
    label: 'Sales',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  finance: {
    label: 'Finance',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
  operations: {
    label: 'Operations',
    color: 'purple',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
  },
  marketing: {
    label: 'Marketing',
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
  },
};

export const TASK_PRIORITIES: Record<TaskPriority, PriorityConfig> = {
  high: {
    label: 'Urgent',
    color: 'red',
    dotColor: 'bg-red-500',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
  },
  medium: {
    label: 'Medium',
    color: 'amber',
    dotColor: 'bg-amber-500',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
  },
  low: {
    label: 'Low',
    color: 'gray',
    dotColor: 'bg-gray-400',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-600',
  },
};

export const MILESTONE_STATUSES: Record<MilestoneStatus, MilestoneStatusConfig> = {
  planned: {
    label: 'Not started',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
  },
  in_progress: {
    label: 'Working on it',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  completed: {
    label: 'Complete',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
  at_risk: {
    label: 'Needs attention',
    color: 'amber',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
  },
};

export const GOAL_TYPES: Record<GoalType, GoalTypeConfig> = {
  growth: {
    label: 'Growth',
    icon: 'TrendingUp',
    color: 'blue',
  },
  revenue: {
    label: 'Revenue',
    icon: 'DollarSign',
    color: 'green',
  },
  product: {
    label: 'Product',
    icon: 'Package',
    color: 'purple',
  },
  operations: {
    label: 'Operations',
    icon: 'Settings',
    color: 'orange',
  },
};

// =====================================================================
// UTILITY FUNCTIONS
// =====================================================================

/**
 * Get relative due date string for display
 */
export function getRelativeDueDate(dueDate?: string): string {
  if (!dueDate) return '';

  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `Past due by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
  } else if (diffDays === 0) {
    return 'Due today';
  } else if (diffDays === 1) {
    return 'Due tomorrow';
  } else if (diffDays <= 7) {
    return `Due in ${diffDays} days`;
  } else {
    return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

/**
 * Check if a task is overdue
 */
export function isTaskOverdue(task: Task): boolean {
  if (!task.due_date || task.is_completed) return false;

  const due = new Date(task.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  return due < today;
}

/**
 * Check if a task is due today
 */
export function isTaskDueToday(task: Task): boolean {
  if (!task.due_date || task.is_completed) return false;

  const due = new Date(task.due_date);
  const today = new Date();

  return (
    due.getFullYear() === today.getFullYear() &&
    due.getMonth() === today.getMonth() &&
    due.getDate() === today.getDate()
  );
}

/**
 * Get current quarter string (e.g., "Q1 2025")
 */
export function getCurrentQuarter(): string {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  return `Q${quarter} ${now.getFullYear()}`;
}

/**
 * Get current month string (e.g., "Jan 2025")
 */
export function getCurrentMonth(): string {
  const now = new Date();
  return now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
