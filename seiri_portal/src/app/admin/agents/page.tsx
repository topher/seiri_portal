import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { AgentsTable } from "@/features/admin/components/agents-table";

export default function AgentsPage() {
  return (
    <div className="flex flex-col space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Management</h1>
          <p className="text-muted-foreground">
            Monitor, configure, and deploy intelligent agents
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/agents/create">
            <Plus className="mr-2 h-4 w-4" />
            Deploy New Agent
          </Link>
        </Button>
      </div>

      {/* Agents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Agents</CardTitle>
          <CardDescription>
            All agents currently running in the mesh
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense 
            fallback={
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-4 w-[150px]" />
                    </div>
                    <div className="ml-auto">
                      <Skeleton className="h-8 w-[80px]" />
                    </div>
                  </div>
                ))}
              </div>
            }
          >
            <AgentsTable />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}