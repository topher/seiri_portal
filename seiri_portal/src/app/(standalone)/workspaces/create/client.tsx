"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateWorkspaceForm } from "@/features/workspaces/components/create-workspace-form";
import { useGetWorkspaces } from "@/features/workspaces/api/use-get-workspaces";

export const CreateWorkspacePageClient = () => {
  const router = useRouter();
  const { data: workspaces, isLoading } = useGetWorkspaces();

  const hasExistingWorkspaces = workspaces && workspaces.documents && workspaces.documents.length > 0;

  if (isLoading) {
    return (
      <div className="w-full lg:max-w-xl">
        <Card>
          <CardHeader>
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-10 bg-gray-200 rounded animate-pulse" />
              <div className="h-10 bg-gray-200 rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full lg:max-w-xl space-y-6">
      {hasExistingWorkspaces && (
        <Card>
          <CardHeader>
            <CardTitle>Launch an existing workspace</CardTitle>
            <CardDescription>
              Select one of your existing workspaces to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {workspaces.documents.map((workspace) => (
                <Button 
                  key={workspace.$id} 
                  variant="outline" 
                  className="w-full justify-start text-left h-auto py-3"
                  onClick={() => router.push(`/workspaces/${workspace.$id}`)}
                >
                  <div>
                    <div className="font-medium">{workspace.name}</div>
                    {workspace.description && (
                      <div className="text-sm text-muted-foreground">{workspace.description}</div>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Create New Workspace</CardTitle>
          <CardDescription>
            {hasExistingWorkspaces 
              ? "Or create a new workspace for your team"
              : "Create your first workspace to get started"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateWorkspaceForm />
        </CardContent>
      </Card>
    </div>
  );
};