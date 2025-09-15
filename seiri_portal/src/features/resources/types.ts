export interface Resource {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  name: string;
  url: string;
  type: ResourceType;
  // Can be attached to any level
  workspaceId?: string;
  suiteId?: string;
  initiativeId?: string;
  taskId?: string;
}

export enum ResourceType {
  LINK = "LINK",
  FILE = "FILE", 
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  DOCUMENT = "DOCUMENT"
}

export interface CreateResourceRequest {
  name: string;
  url: string;
  type: ResourceType;
  workspaceId?: string;
  suiteId?: string;
  initiativeId?: string;
  taskId?: string;
}

export interface UpdateResourceRequest {
  name?: string;
  url?: string;
  type?: ResourceType;
}