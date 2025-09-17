import { v4 as uuidv4 } from 'uuid';

// Node types
export interface User {
  id: string;
  clerkId: string;
  email: string;
  name: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workspace {
  id: string;
  name: string;
  imageUrl?: string;
  inviteCode: string;
  userId: string; // owner
  createdAt: Date;
  updatedAt: Date;
}



export interface Suite {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  slug: string;
  workspaceId: string;
  isActive: boolean; // Whether the suite is activated
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Initiative {
  id: string;
  name: string;
  description?: string;
  moscow: Moscow;
  status: TaskStatus;
  assigneeId?: string;
  suiteId: string;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  name: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  initiativeId?: string;
  position: number;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AcceptanceCriterion {
  id: string;
  text: string;
  completed: boolean;
  order: number;
  taskId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Resource {
  id: string;
  name: string;
  url: string;
  type: ResourceType;
  workspaceId?: string;
  suiteId?: string;
  initiativeId?: string;
  taskId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Member {
  id: string;
  role: MemberRole;
  userId: string;
  workspaceId: string;
  createdAt: Date;
}

// Enums
export enum TaskStatus {
  BACKLOG = "BACKLOG",
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  IN_REVIEW = "IN_REVIEW",
  DONE = "DONE"
}

export enum TaskPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT"
}

export enum MemberRole {
  ADMIN = "ADMIN",
  MEMBER = "MEMBER"
}

export enum Moscow {
  MUST = "MUST",
  SHOULD = "SHOULD",
  COULD = "COULD", 
  WONT = "WONT"
}

export enum ResourceType {
  LINK = "LINK",
  FILE = "FILE",
  IMAGE = "IMAGE", 
  VIDEO = "VIDEO",
  DOCUMENT = "DOCUMENT"
}

// Utility functions for ID generation
export const generateId = () => uuidv4();

// Predefined suite types that are created for every workspace
export const PREDEFINED_SUITES = [
  {
    name: "Ops",
    slug: "ops",
    description: "Operations and infrastructure management"
  },
  {
    name: "Product",
    slug: "product", 
    description: "Product development and management"
  },
  {
    name: "Coding",
    slug: "coding",
    description: "Software development and engineering"
  },
  {
    name: "Marketing",
    slug: "marketing",
    description: "Marketing campaigns and brand management"
  },
  {
    name: "Sales",
    slug: "sales",
    description: "Sales processes and customer acquisition"
  },
  {
    name: "Strategy",
    slug: "strategy",
    description: "Strategic planning and business development"
  }
];

// Neo4j schema initialization queries
export const SCHEMA_QUERIES = {
  // Create constraints (ensures uniqueness)
  constraints: [
    "CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE",
    "CREATE CONSTRAINT user_clerk_id IF NOT EXISTS FOR (u:User) REQUIRE u.clerkId IS UNIQUE",
    "CREATE CONSTRAINT workspace_id IF NOT EXISTS FOR (w:Workspace) REQUIRE w.id IS UNIQUE",
    "CREATE CONSTRAINT suite_id IF NOT EXISTS FOR (s:Suite) REQUIRE s.id IS UNIQUE",
    "CREATE CONSTRAINT initiative_id IF NOT EXISTS FOR (i:Initiative) REQUIRE i.id IS UNIQUE",
    "CREATE CONSTRAINT task_id IF NOT EXISTS FOR (t:Task) REQUIRE t.id IS UNIQUE",
    "CREATE CONSTRAINT criterion_id IF NOT EXISTS FOR (c:AcceptanceCriterion) REQUIRE c.id IS UNIQUE",
    "CREATE CONSTRAINT resource_id IF NOT EXISTS FOR (r:Resource) REQUIRE r.id IS UNIQUE",
    "CREATE CONSTRAINT member_id IF NOT EXISTS FOR (m:Member) REQUIRE m.id IS UNIQUE"
  ],

  // Create indexes for performance
  indexes: [
    "CREATE INDEX user_email IF NOT EXISTS FOR (u:User) ON (u.email)",
    "CREATE INDEX user_clerk_id_idx IF NOT EXISTS FOR (u:User) ON (u.clerkId)",
    "CREATE INDEX workspace_invite_code IF NOT EXISTS FOR (w:Workspace) ON (w.inviteCode)",
    "CREATE INDEX workspace_created_at IF NOT EXISTS FOR (w:Workspace) ON (w.createdAt)",
    "CREATE INDEX suite_slug IF NOT EXISTS FOR (s:Suite) ON (s.slug)",
    "CREATE INDEX suite_active IF NOT EXISTS FOR (s:Suite) ON (s.isActive)",
    "CREATE INDEX suite_workspace_id IF NOT EXISTS FOR (s:Suite) ON (s.workspaceId)",
    "CREATE INDEX task_status IF NOT EXISTS FOR (t:Task) ON (t.status)",
    "CREATE INDEX task_priority IF NOT EXISTS FOR (t:Task) ON (t.priority)",
    "CREATE INDEX task_position IF NOT EXISTS FOR (t:Task) ON (t.position)",
    "CREATE INDEX task_initiative_id IF NOT EXISTS FOR (t:Task) ON (t.initiativeId)",
    "CREATE INDEX initiative_moscow IF NOT EXISTS FOR (i:Initiative) ON (i.moscow)",
    "CREATE INDEX initiative_suite_id IF NOT EXISTS FOR (i:Initiative) ON (i.suiteId)",
    "CREATE INDEX initiative_status IF NOT EXISTS FOR (i:Initiative) ON (i.status)",
    "CREATE INDEX criterion_completed IF NOT EXISTS FOR (c:AcceptanceCriterion) ON (c.completed)",
    "CREATE INDEX criterion_task_id IF NOT EXISTS FOR (c:AcceptanceCriterion) ON (c.taskId)",
    "CREATE INDEX criterion_order IF NOT EXISTS FOR (c:AcceptanceCriterion) ON (c.order)"
  ]
};

// Graph model relationships:
// (User)-[:OWNS]->(Workspace)
// (User)-[:MEMBER_OF {role, createdAt}]->(Workspace)
// (Workspace)-[:CONTAINS]->(Suite)
// (Suite)-[:HAS]->(Initiative)
// (Initiative)-[:HAS]->(Task)
// (Task)-[:HAS]->(AcceptanceCriterion)
// (User)-[:ASSIGNED_TO]->(Task)
// (User)-[:ASSIGNED_TO]->(Initiative)
// (Task)-[:DEPENDS_ON]->(Task)
// (Task)-[:SUBTASK_OF]->(Task)
// (Resource)-[:ATTACHED_TO]->(Workspace|Suite|Initiative|Task)