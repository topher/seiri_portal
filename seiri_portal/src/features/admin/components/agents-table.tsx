"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Bot, Activity, AlertCircle } from "lucide-react";
import { agentMeshClient } from "../api/agent-mesh-client";
import type { Agent } from "../api/agent-mesh-sdk";

export function AgentsTable() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setIsLoading(true);
        const response = await agentMeshClient.getAgents();
        setAgents((response as any).agents);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch agents:", err);
        setError("Failed to load agents");
        // Fallback to mock data for development
        setAgents([
          {
            id: "agent-1",
            name: "Workspace Orchestrator",
            type: "orchestrator",
            status: "active",
            capabilities: ["coordinate_suites", "manage_initiatives"],
            performance: {
              tasksCompleted: 156,
              averageResponseTime: 0.8,
              successRate: 0.95
            },
            createdAt: "2024-01-15T10:00:00Z",
            updatedAt: "2024-01-15T10:00:00Z"
          },
          {
            id: "agent-2", 
            name: "Task Agent",
            type: "executor",
            status: "active",
            capabilities: ["execute_tasks", "break_down_requirements"],
            performance: {
              tasksCompleted: 89,
              averageResponseTime: 1.2,
              successRate: 0.92
            },
            createdAt: "2024-01-15T10:00:00Z",
            updatedAt: "2024-01-15T10:00:00Z"
          },
          {
            id: "agent-3",
            name: "Code Review Agent", 
            type: "analyzer",
            status: "inactive",
            capabilities: ["code_analysis", "quality_review"],
            performance: {
              tasksCompleted: 23,
              averageResponseTime: 2.1,
              successRate: 0.89
            },
            createdAt: "2024-01-15T10:00:00Z",
            updatedAt: "2024-01-15T10:00:00Z"
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgents();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600 border-green-200";
      case "inactive":
        return "text-gray-600 border-gray-200";
      case "error":
        return "text-red-600 border-red-200";
      default:
        return "text-gray-600 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Activity className="h-3 w-3" />;
      case "inactive":
        return <Bot className="h-3 w-3" />;
      case "error":
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Bot className="h-3 w-3" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="ml-auto">
                  <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Agent</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Performance</TableHead>
          <TableHead>Capabilities</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {agents.map((agent) => (
          <TableRow key={agent.id}>
            <TableCell>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Bot className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium">{agent.name}</div>
                  <div className="text-sm text-muted-foreground">{agent.id}</div>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{agent.type}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className={getStatusColor(agent.status)}>
                {getStatusIcon(agent.status)}
                <span className="ml-1 capitalize">{agent.status}</span>
              </Badge>
            </TableCell>
            <TableCell>
              <div className="text-sm">
                <div>{agent.performance.tasksCompleted} tasks</div>
                <div className="text-muted-foreground">
                  {agent.performance.averageResponseTime}s avg, {(agent.performance.successRate * 100).toFixed(0)}% success
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {agent.capabilities.slice(0, 2).map((capability) => (
                  <Badge key={capability} variant="secondary" className="text-xs">
                    {capability.replace(/_/g, " ")}
                  </Badge>
                ))}
                {agent.capabilities.length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{agent.capabilities.length - 2} more
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>View Details</DropdownMenuItem>
                  <DropdownMenuItem>Edit Configuration</DropdownMenuItem>
                  <DropdownMenuItem>View Logs</DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">
                    Stop Agent
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}