import React from "react";
import { MoreHorizontal } from "lucide-react";

import { MemberAvatar } from "@/features/members/components/member-avatar";
import { InitiativeAvatar } from "@/features/initiatives/components/initiative-avatar";

import { DottedSeparator } from "@/components/dotted-separator";
import { TaskAiActionButton } from "@/components/ui/AiActionButton";
import { AiSuggestionsContainer } from "@/components/ui/AiSuggestion";
import { useTaskAiActions, useQuickSuggestions } from "@/hooks/use-ai-actions";

import { TaskDate } from "./task-date";
import { TaskActions } from "./task-actions";

import { Task } from "../types";

interface KanbanCardProps {
  task: Task;
};

export const KanbanCard = ({ task }: KanbanCardProps) => {
  const { executeAction, isLoading, getLoadingActionId, suggestions, dismissSuggestion, acceptSuggestion } = useTaskAiActions(task.id);
  const { quickSuggestions, generateQuickSuggestions } = useQuickSuggestions('task', task);

  // Generate quick suggestions on mount
  React.useEffect(() => {
    generateQuickSuggestions(task);
  }, [task, generateQuickSuggestions]);

  return (
    <div className="bg-white p-2.5 mb-1.5 rounded shadow-sm space-y-3 group hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-x-2">
        <p className="text-sm line-clamp-2">{task.name}</p>
        <div className="flex items-center gap-1">
          <TaskAiActionButton
            onActionClick={executeAction}
            loading={isLoading}
            loadingActionId={getLoadingActionId}
            size="sm"
            variant="ghost"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          />
          <TaskActions id={task.id} initiativeId={task.initiativeId}>
            <MoreHorizontal className="size-[18px] stroke-1 shrink-0 text-neutral-700 hover:opacity-75 transition" />
          </TaskActions>
        </div>
      </div>

      {/* Quick suggestions */}
      {quickSuggestions.length > 0 && (
        <AiSuggestionsContainer
          suggestions={quickSuggestions}
          onDismiss={dismissSuggestion}
          onAccept={acceptSuggestion}
          compact
          title=""
          maxVisible={1}
        />
      )}

      <DottedSeparator />
      <div className="flex items-center gap-x-1.5">
        <MemberAvatar
          name={task.assignee?.name || 'Unassigned'}
          fallbackClassName="text-[10px]"
        />
        <div className="size-1 rounded-full bg-neutral-300" />
        <TaskDate value={task.dueDate || ''} className="text-xs" />
      </div>
      <div className="flex items-center gap-x-1.5">
        <InitiativeAvatar
          name={task.initiative?.name || 'No Initiative'}
          fallbackClassName="text-[10px]"
        />
        <span className="text-xs font-medium">{task.initiative?.name || 'No Initiative'}</span>
      </div>

      {/* AI suggestions from actions */}
      {suggestions.length > 0 && (
        <AiSuggestionsContainer
          suggestions={suggestions}
          onDismiss={dismissSuggestion}
          onAccept={acceptSuggestion}
          compact
          title=""
          maxVisible={2}
        />
      )}
    </div>
  );
};
