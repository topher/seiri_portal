"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Bot, 
  Settings, 
  Activity, 
  Database, 
  Network, 
  FileText,
  BarChart3,
  Search,
  Workflow,
  Shield,
  GitBranch
} from "lucide-react";

const navigation = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: BarChart3,
    description: "Overview and system metrics"
  },
  {
    name: "Agent Management",
    href: "/admin/agents",
    icon: Bot,
    description: "Manage and monitor agents",
    children: [
      { name: "All Agents", href: "/admin/agents" },
      { name: "Create Agent", href: "/admin/agents/create" },
      { name: "Agent Templates", href: "/admin/agents/templates" },
    ]
  },
  {
    name: "Service Orchestration",
    href: "/admin/services",
    icon: Workflow,
    description: "Manage workflows and services",
    children: [
      { name: "All Services", href: "/admin/services" },
      { name: "Service Designer", href: "/admin/services/designer" },
      { name: "Execution History", href: "/admin/services/executions" },
    ]
  },
  {
    name: "Knowledge Graph",
    href: "/admin/knowledge-graph",
    icon: Network,
    description: "Ontologies and graph data",
    children: [
      { name: "Graph Explorer", href: "/admin/knowledge-graph" },
      { name: "Ontologies", href: "/admin/knowledge-graph/ontologies" },
      { name: "Query Builder", href: "/admin/knowledge-graph/query" },
    ]
  },
  {
    name: "Vector Database",
    href: "/admin/vector-db",
    icon: Search,
    description: "Semantic search and embeddings",
    children: [
      { name: "Search Interface", href: "/admin/vector-db" },
      { name: "Index Management", href: "/admin/vector-db/indexes" },
      { name: "Embeddings", href: "/admin/vector-db/embeddings" },
    ]
  },
  {
    name: "System Monitoring",
    href: "/admin/monitoring",
    icon: Activity,
    description: "Performance and health metrics",
    children: [
      { name: "System Health", href: "/admin/monitoring" },
      { name: "Performance", href: "/admin/monitoring/performance" },
      { name: "Logs", href: "/admin/monitoring/logs" },
    ]
  },
  {
    name: "Database Admin",
    href: "/admin/database",
    icon: Database,
    description: "Neo4j administration"
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: Settings,
    description: "System configuration"
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-full flex-col bg-neutral-100 dark:bg-neutral-900">
      {/* Header */}
      <div className="flex h-14 items-center border-b px-4">
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6 text-blue-600" />
          <span className="font-semibold text-lg">Agent Mesh Admin</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (pathname?.startsWith(item.href + "/") ?? false);
          
          return (
            <div key={item.name}>
              <Link
                href={item.href}
                className={cn(
                  "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                    isActive
                      ? "text-blue-500 dark:text-blue-300"
                      : "text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300"
                  )}
                />
                {item.name}
              </Link>
              
              {/* Sub-navigation */}
              {item.children && isActive && (
                <div className="ml-8 mt-1 space-y-1">
                  {item.children.map((subItem) => (
                    <Link
                      key={subItem.name}
                      href={subItem.href}
                      className={cn(
                        "group flex items-center px-2 py-1 text-xs font-medium rounded-md transition-colors",
                        pathname === subItem.href
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-800 dark:text-blue-200"
                          : "text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                      )}
                    >
                      <GitBranch className="mr-2 h-3 w-3" />
                      {subItem.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <div>Agent Mesh v1.0.0</div>
          <div>Service: Online</div>
        </div>
      </div>
    </div>
  );
}