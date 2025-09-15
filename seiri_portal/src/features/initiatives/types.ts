import { TaskStatus } from '@/core/tasks/task.model';

export enum Moscow {
  MUST = "MUST",
  SHOULD = "SHOULD", 
  COULD = "COULD",
  WONT = "WONT"
}

export interface Initiative {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  suiteId: string;
  name: string;
  description?: string;
  moscow: Moscow;
  status: TaskStatus;
  assigneeId?: string;
  startDate?: string;
  endDate?: string;
  
  // Virtual fields for UI
  taskCount?: number;
  completedTaskCount?: number;
  progress?: number;
  assignee?: {
    $id: string;
    name: string;
    email: string;
  };
}

export interface CreateInitiativeRequest {
  name: string;
  description?: string;
  moscow: Moscow;
  assigneeId?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateInitiativeRequest {
  name?: string;
  description?: string;
  moscow?: Moscow;
  status?: TaskStatus;
  assigneeId?: string;
  startDate?: string;
  endDate?: string;
}

// Re-export TaskStatus from tasks module
export { TaskStatus } from "@/features/tasks/types";