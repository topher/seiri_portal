export interface Suite {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  workspaceId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  slug: string;
  startDate?: string;
  endDate?: string;
  
  // Virtual fields for UI
  initiativeCount?: number;
  taskCount?: number;
  completionRate?: number;
}

export interface CreateSuiteRequest {
  name: string;
  description?: string;
  image?: File;
  slug: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateSuiteRequest {
  name?: string;
  description?: string;
  image?: File | string;
  slug?: string;
  startDate?: string;
  endDate?: string;
}