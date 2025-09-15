"use client";

import { PencilIcon } from "lucide-react";

import { MemberAvatar } from "@/features/members/components/member-avatar";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { snakeCaseToTitleCase } from "@/lib/utils";
import { DottedSeparator } from "@/components/dotted-separator";
import { TaskAiActionButton } from "@/components/ui/AiActionButton";
import { AiSuggestionsContainer } from "@/components/ui/AiSuggestion";
import { AiGeneratedIndicator } from "@/components/ui/AiIndicator";
import { useTaskAiActions } from "@/hooks/use-ai-actions";

import { TaskDate } from "./task-date";
import { OverviewProperty } from "./overview-property";

import { Task } from "../types";
import { useEditTaskModal } from "../hooks/use-edit-task-modal";

interface TaskOverviewProps {
  task: Task;
};

export const TaskOverview = ({
  task
}: TaskOverviewProps) => {
  const { open } = useEditTaskModal();
  const { executeAction, isLoading, getLoadingActionId, suggestions, dismissSuggestion, acceptSuggestion } = useTaskAiActions(task.id);

  return (
    <div className="flex flex-col gap-y-4 col-span-1">
      <div className="bg-muted rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold">Overview</p>
            {/* Show indicator if task has AI-generated content */}
            {task.description && task.description.includes('[AI Generated]') && (
              <AiGeneratedIndicator 
                variant="subtle" 
                size="sm" 
                agentName="Task Agent"
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <TaskAiActionButton
              onActionClick={executeAction}
              loading={isLoading}
              loadingActionId={getLoadingActionId}
              size="sm"
              variant="ghost"
              triggerLabel="AI Assist"
            />
            <Button onClick={() => open(task.id)} size="sm" variant="secondary">
              <PencilIcon className="size-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>
        <DottedSeparator className="my-4" />
        
        {/* AI Suggestions */}
        {suggestions.length > 0 && (
          <>
            <AiSuggestionsContainer
              suggestions={suggestions}
              onDismiss={dismissSuggestion}
              onAccept={acceptSuggestion}
              title="AI Suggestions"
              compact
              maxVisible={3}
            />
            <DottedSeparator className="my-4" />
          </>
        )}

        <div className="flex flex-col gap-y-4">
          <OverviewProperty label="Assignee">
            <MemberAvatar
              name={task.assignee?.name || 'Unassigned'}
              className="size-6"
            />
            <p className="text-sm font-medium">{task.assignee?.name || 'Unassigned'}</p>
          </OverviewProperty>
          <OverviewProperty label="Due Date">
            <TaskDate value={task.dueDate || ''} className="text-sm font-medium" />
          </OverviewProperty>
          <OverviewProperty label="Status">
            <Badge variant={task.status}>
              {snakeCaseToTitleCase(task.status)}
            </Badge>
          </OverviewProperty>
        </div>
      </div>
    </div>
  );
};
