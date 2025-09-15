// Task types for Neo4j implementation

export enum TaskStatus {
  BACKLOG = "BACKLOG",
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  IN_REVIEW = "IN_REVIEW",
  DONE = "DONE"
};

export type Task = {
  id: string;
  name: string;
  status: TaskStatus;
  workspaceId: string;
  assigneeId?: string;
  initiativeId: string
  position: number;
  dueDate?: string;
  description?: string;
  
  // Virtual fields for UI
  assignee?: {
    $id: string;
    name: string;
    email: string;
  };
  initiative?: {
    $id: string;
    name: string;
  };
  acceptanceCriteria?: AcceptanceCriterion[];
};

export interface AcceptanceCriterion {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  taskId: string;
  text: string;
  completed: boolean;
  order: number;
}

export interface CreateTaskRequest {
  name: string;
  description?: string;
  assigneeId?: string;
  initiativeId: string;
  dueDate?: string;
  position?: number;
}

export interface UpdateTaskRequest {
  name?: string;
  description?: string;
  status?: TaskStatus;
  assigneeId?: string;
  initiativeId?: string;
  dueDate?: string;
  position?: number;
}

export interface CreateAcceptanceCriterionRequest {
  text: string;
  order?: number;
}

export interface UpdateAcceptanceCriterionRequest {
  text?: string;
  completed?: boolean;
  order?: number;
}
