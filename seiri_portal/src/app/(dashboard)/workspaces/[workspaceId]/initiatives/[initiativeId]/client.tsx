"use client";

import Link from "next/link";
import { PencilIcon } from "lucide-react";

import { useInitiativeId } from "@/features/initiatives/hooks/use-initiative-id";
import { useGetInitiative } from "@/features/initiatives/api/use-get-initiative";
import { InitiativeAvatar } from "@/features/initiatives/components/initiative-avatar";
import { TaskViewSwitcher } from "@/features/tasks/components/task-view-switcher";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";

import { Button } from "@/components/ui/button";
import { Analytics } from "@/components/analytics";
import { PageError } from "@/components/page-error";
import { PageLoader } from "@/components/page-loader";
import { InitiativeAiActionButton } from "@/components/ui/AiActionButton";
import { AiSuggestionsContainer } from "@/components/ui/AiSuggestion";
import { AiIndicator } from "@/components/ui/AiIndicator";
import { useInitiativeAiActions } from "@/hooks/use-ai-actions";

export const InitiativeIdClient = () => {
  const initiativeId = useInitiativeId();
  const workspaceId = useWorkspaceId();
  const { data: initiative, isLoading: isLoadingInitiative } = useGetInitiative({ initiativeId });
  const { executeAction, isLoading, getLoadingActionId, suggestions, dismissSuggestion, acceptSuggestion } = useInitiativeAiActions(initiativeId);
  // TODO: Add initiative analytics API
  // const { data: analytics, isLoading: isLoadingAnalytics } = useGetInitiativeAnalytics({ initiativeId });

  const isLoadingData = isLoadingInitiative;

  if (isLoadingData) {
    return <PageLoader />
  }

  if (!initiative) {
    return <PageError message="Initiative not found" />
  }

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-x-2">
          <InitiativeAvatar
            name={initiative.name}
            className="size-8"
          />
          <p className="text-lg font-semibold">{initiative.name}</p>
          <span className={`text-xs px-2 py-1 rounded-full ${
            initiative.moscow === 'MUST' ? 'bg-red-100 text-red-800' :
            initiative.moscow === 'SHOULD' ? 'bg-orange-100 text-orange-800' :
            initiative.moscow === 'COULD' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {initiative.moscow}
          </span>
          {/* AI indicator if initiative has AI-generated content */}
          {initiative.description && initiative.description.includes('[AI Generated]') && (
            <AiIndicator 
              type="generated" 
              variant="subtle" 
              size="sm" 
              agentName="Initiative Agent"
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <InitiativeAiActionButton
            onActionClick={executeAction}
            loading={isLoading}
            loadingActionId={getLoadingActionId}
            size="sm"
            variant="ghost"
            triggerLabel="AI Planning"
          />
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/workspaces/${workspaceId}/initiatives/${initiative.$id}/settings`}>
              <PencilIcon className="size-4 mr-2" />
              Edit Initiative
            </Link>
          </Button>
        </div>
      </div>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <AiSuggestionsContainer
          suggestions={suggestions}
          onDismiss={dismissSuggestion}
          onAccept={acceptSuggestion}
          title="Initiative Planning Suggestions"
          maxVisible={3}
        />
      )}

      {/* TODO: Add initiative analytics when available */}
      {/* {analytics ? (
        <Analytics data={analytics} />
      ) : null} */}
      <TaskViewSwitcher hideInitiativeFilter />
    </div>
  )
};

