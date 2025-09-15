"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetInitiatives } from "@/features/initiatives/api/use-get-initiatives";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useSuiteId } from "@/features/suites/hooks/use-suite-id";
import { useCreateInitiativeModal } from "@/features/initiatives/hooks/use-create-initiative-modal";

export const SuiteInitiativesClient = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const suiteId = useSuiteId();
  const { data: initiatives, isLoading } = useGetInitiatives({ workspaceId });
  const { open } = useCreateInitiativeModal();

  // Filter initiatives by suite
  const suiteInitiatives = initiatives?.documents?.filter(
    initiative => initiative.suiteId === suiteId
  ) || [];

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

  if (suiteInitiatives.length === 0) {
    return (
      <div className="max-w-screen-2xl mx-auto p-4">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No initiatives yet</h2>
            <p className="text-gray-600 mb-6">Get started by creating your first initiative for this suite</p>
            <Button onClick={open} variant="create" className="group">
              <Plus className="w-4 h-4 mr-2 text-neutral-600 group-hover:text-blue-700" />
              Create Initiative
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
          <h1 className="text-2xl font-bold text-gray-900">Suite Initiatives</h1>
          <Button onClick={open} variant="create" className="group">
            <Plus className="w-4 h-4 mr-2 text-neutral-600 group-hover:text-blue-700" />
            New Initiative
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suiteInitiatives.map((initiative) => (
            <Link key={initiative.$id} href={`/workspaces/${workspaceId}/initiatives/${initiative.$id}`}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{initiative.name}</CardTitle>
                  {initiative.description && (
                    <CardDescription>{initiative.description}</CardDescription>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      initiative.moscow === 'MUST' ? 'bg-red-100 text-red-800' :
                      initiative.moscow === 'SHOULD' ? 'bg-yellow-100 text-yellow-800' :
                      initiative.moscow === 'COULD' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {initiative.moscow}
                    </span>
                    <span>{initiative.status}</span>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};