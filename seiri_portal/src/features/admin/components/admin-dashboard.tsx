"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Bot, ExternalLink, RefreshCw } from "lucide-react";
import Link from "next/link";

export function AdminDashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
      {/* Recent Activity */}
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Latest agent mesh operations and events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Activity items */}
            <div className="flex items-start space-x-4">
              <div className="bg-green-100 p-2 rounded-full">
                <Bot className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">Task Agent deployed successfully</p>
                <p className="text-xs text-muted-foreground">2 minutes ago</p>
              </div>
              <Badge variant="outline" className="text-green-600 border-green-200">
                Success
              </Badge>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-blue-100 p-2 rounded-full">
                <RefreshCw className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">Vector index rebuilt</p>
                <p className="text-xs text-muted-foreground">15 minutes ago</p>
              </div>
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                Completed
              </Badge>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-orange-100 p-2 rounded-full">
                <Bot className="h-4 w-4 text-orange-600" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">Workspace Agent experiencing high latency</p>
                <p className="text-xs text-muted-foreground">1 hour ago</p>
              </div>
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                Warning
              </Badge>
            </div>
          </div>

          <div className="mt-6">
            <Button variant="outline" asChild>
              <Link href="/admin/monitoring/logs">
                View All Logs
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common administrative tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" asChild>
            <Link href="/admin/agents/create">
              <Bot className="mr-2 h-4 w-4" />
              Deploy New Agent
            </Link>
          </Button>
          
          <Button variant="outline" className="w-full" asChild>
            <Link href="/admin/services/designer">
              <RefreshCw className="mr-2 h-4 w-4" />
              Create Service Workflow
            </Link>
          </Button>
          
          <Button variant="outline" className="w-full" asChild>
            <Link href="/admin/vector-db/search">
              <Activity className="mr-2 h-4 w-4" />
              Search Vector Database
            </Link>
          </Button>
          
          <Button variant="outline" className="w-full" asChild>
            <Link href="/admin/knowledge-graph">
              <ExternalLink className="mr-2 h-4 w-4" />
              Explore Knowledge Graph
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Service Health */}
      <Card className="col-span-7">
        <CardHeader>
          <CardTitle>Service Health Status</CardTitle>
          <CardDescription>
            Real-time status of agent mesh components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">GraphQL Gateway</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Neo4j Database</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Vector Database</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-sm">Redis Cache</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Agent Core</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}