/**
 * Planning API Service
 * Handles all API calls for Tasks and Company Roadmap
 *
 * Supports:
 * - Task CRUD with priorities and categories
 * - Milestone CRUD with progress tracking
 * - All data feeds into RAG for AI context
 */

import { logger } from '@/lib/logger';
import {
  Task,
  TaskCreate,
  TaskUpdate,
  TaskListResponse,
  Milestone,
  MilestoneCreate,
  MilestoneUpdate,
  RoadmapResponse,
} from '@/types/planning';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// =============================================================================
// TASK API FUNCTIONS
// =============================================================================

/**
 * Fetch all tasks for a user
 */
export async function getTasks(
  walletAddress: string,
  options?: {
    priority?: string;
    category?: string;
    completed?: boolean;
    due_today?: boolean;
    overdue?: boolean;
  }
): Promise<TaskListResponse> {
  try {
    const params = new URLSearchParams();
    params.append('wallet_address', walletAddress);

    if (options?.priority) params.append('priority', options.priority);
    if (options?.category) params.append('category', options.category);
    if (options?.completed !== undefined) params.append('completed', String(options.completed));
    if (options?.due_today) params.append('due_today', 'true');
    if (options?.overdue) params.append('overdue', 'true');

    const response = await fetch(`${API_BASE_URL}/api/v1/planning/tasks?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error('Error fetching tasks:', error);
    throw error;
  }
}

/**
 * Create a new task
 */
export async function createTask(task: TaskCreate): Promise<Task> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/planning/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.task;
  } catch (error) {
    logger.error('Error creating task:', error);
    throw error;
  }
}

/**
 * Update a task
 */
export async function updateTask(
  taskId: number,
  walletAddress: string,
  updates: TaskUpdate
): Promise<Task> {
  try {
    const params = new URLSearchParams();
    params.append('wallet_address', walletAddress);

    const response = await fetch(`${API_BASE_URL}/api/v1/planning/tasks/${taskId}?${params.toString()}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.task;
  } catch (error) {
    logger.error('Error updating task:', error);
    throw error;
  }
}

/**
 * Delete response type with RAG cleanup status
 */
interface DeleteResponse {
  success: boolean;
  message: string;
  rag_deleted: boolean;
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: number, walletAddress: string): Promise<DeleteResponse> {
  try {
    const params = new URLSearchParams();
    params.append('wallet_address', walletAddress);

    const response = await fetch(`${API_BASE_URL}/api/v1/planning/tasks/${taskId}?${params.toString()}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error('Error deleting task:', error);
    throw error;
  }
}

/**
 * Mark a task as complete (with animation trigger)
 */
export async function completeTask(taskId: number, walletAddress: string): Promise<Task> {
  try {
    const params = new URLSearchParams();
    params.append('wallet_address', walletAddress);

    const response = await fetch(`${API_BASE_URL}/api/v1/planning/tasks/${taskId}/complete?${params.toString()}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.task;
  } catch (error) {
    logger.error('Error completing task:', error);
    throw error;
  }
}

// =============================================================================
// ROADMAP/MILESTONE API FUNCTIONS
// =============================================================================

/**
 * Fetch roadmap with milestones for a user
 */
export async function getRoadmap(
  walletAddress: string,
  options?: {
    timeframe_type?: string;
    status?: string;
    goal_type?: string;
  }
): Promise<RoadmapResponse> {
  try {
    const params = new URLSearchParams();
    params.append('wallet_address', walletAddress);

    if (options?.timeframe_type) params.append('timeframe_type', options.timeframe_type);
    if (options?.status) params.append('status', options.status);
    if (options?.goal_type) params.append('goal_type', options.goal_type);

    const response = await fetch(`${API_BASE_URL}/api/v1/planning/roadmap?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error('Error fetching roadmap:', error);
    throw error;
  }
}

/**
 * Create a new milestone
 */
export async function createMilestone(milestone: MilestoneCreate): Promise<Milestone> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/planning/roadmap/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(milestone),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.milestone;
  } catch (error) {
    logger.error('Error creating milestone:', error);
    throw error;
  }
}

/**
 * Update a milestone
 */
export async function updateMilestone(
  milestoneId: number,
  walletAddress: string,
  updates: MilestoneUpdate
): Promise<Milestone> {
  try {
    const params = new URLSearchParams();
    params.append('wallet_address', walletAddress);

    const response = await fetch(`${API_BASE_URL}/api/v1/planning/roadmap/milestones/${milestoneId}?${params.toString()}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.milestone;
  } catch (error) {
    logger.error('Error updating milestone:', error);
    throw error;
  }
}

/**
 * Delete a milestone
 */
export async function deleteMilestone(milestoneId: number, walletAddress: string): Promise<DeleteResponse> {
  try {
    const params = new URLSearchParams();
    params.append('wallet_address', walletAddress);

    const response = await fetch(`${API_BASE_URL}/api/v1/planning/roadmap/milestones/${milestoneId}?${params.toString()}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error('Error deleting milestone:', error);
    throw error;
  }
}

/**
 * Update milestone progress
 */
export async function updateMilestoneProgress(
  milestoneId: number,
  walletAddress: string,
  progressPercent: number
): Promise<Milestone> {
  try {
    const params = new URLSearchParams();
    params.append('wallet_address', walletAddress);

    const response = await fetch(`${API_BASE_URL}/api/v1/planning/roadmap/milestones/${milestoneId}/progress?${params.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress_percent: progressPercent }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.milestone;
  } catch (error) {
    logger.error('Error updating milestone progress:', error);
    throw error;
  }
}

// =============================================================================
// EXPORTED SERVICE OBJECT
// =============================================================================

export default {
  // Tasks
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  // Roadmap/Milestones
  getRoadmap,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  updateMilestoneProgress,
};
