"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetWorkspaces } from "@/features/workspaces/api/use-get-workspaces";

export const WorkspacesPageClient = () => {
  const router = useRouter();
  const { data: workspaces, isLoading } = useGetWorkspaces();

  if (isLoading) {
    return (
      <div className="max-w-screen-2xl mx-auto p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!workspaces || workspaces.total === 0) {
    return (
      <div className="max-w-screen-2xl mx-auto p-4">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No workspaces yet</h2>
            <p className="text-gray-600 mb-6">Get started by creating your first workspace</p>
            <Button asChild variant="create">
              <Link href="/workspaces/create">
                <Plus className="w-4 h-4 mr-2" />
                Create Workspace
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Workspaces</h1>
          <Button asChild variant="create">
            <Link href="/workspaces/create">
              <Plus className="w-4 h-4 mr-2" />
              New Workspace
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.documents.map((workspace) => (
            <Link key={workspace.$id} href={`/workspaces/${workspace.$id}`}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{workspace.name}</CardTitle>
                  {workspace.description && (
                    <CardDescription>{workspace.description}</CardDescription>
                  )}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};