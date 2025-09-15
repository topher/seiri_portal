"use client";

import React from 'react';
import { useAuth } from '@clerk/nextjs';
import { useWorkspaceId } from '@/features/workspaces/hooks/use-workspace-id';
import { RentalWorkflow } from '@/components/rental-workflow/RentalWorkflow';
import { Card, CardContent } from '@/components/ui/card';

export default function RentalWorkflowPage() {
  const { userId } = useAuth();
  const workspaceId = useWorkspaceId();

  if (!userId || !workspaceId) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Please select a workspace and ensure you're signed in to access the rental workflow.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Rental Workflow</h1>
      </div>
      
      <RentalWorkflow 
        workspaceId={workspaceId}
        currentUserId={userId}
        initialStep="request"
      />
    </div>
  );
}