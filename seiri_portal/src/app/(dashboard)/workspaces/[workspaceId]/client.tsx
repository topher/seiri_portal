"use client";

import React from "react";
import Link from "next/link";
// @ts-ignore - date-fns v4 compatibility
import { formatDistanceToNow } from "date-fns";
import { CalendarIcon, PlusIcon, SettingsIcon, PowerIcon } from "lucide-react";

import { Task } from "@/features/tasks/types";
import { Member } from "@/features/members/types";
import { Suite } from "@/features/suites/types";
import { Initiative } from "@/features/initiatives/types";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetSuites } from "@/features/suites/api/use-get-suites";
import { useGetInitiatives } from "@/features/initiatives/api/use-get-initiatives";
import { SuiteAvatar } from "@/features/suites/components/suite-avatar";
import { InitiativeAvatar } from "@/features/initiatives/components/initiative-avatar";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useCreateTaskModal } from "@/features/tasks/hooks/use-create-task-modal";
import { useCreateSuiteModal } from "@/features/suites/hooks/use-create-suite-modal";
import { useCreateInitiativeModal } from "@/features/initiatives/hooks/use-create-initiative-modal";
import { useGetWorkspaceAnalytics } from "@/features/workspaces/api/use-get-workspace-analytics";

import { Button } from "@/components/ui/button";
import { PageError } from "@/components/page-error";
import { Analytics } from "@/components/analytics";
import { PageLoader } from "@/components/page-loader";
import { Card, CardContent } from "@/components/ui/card";
import { DottedSeparator } from "@/components/dotted-separator";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { WorkspaceAiActionButton } from "@/components/ui/AiActionButton";
import { AiSuggestionsContainer } from "@/components/ui/AiSuggestion";
import { AiIndicator } from "@/components/ui/AiIndicator";
import { useWorkspaceAiActions, useQuickSuggestions } from "@/hooks/use-ai-actions";

export const WorkspaceIdClient = () => {
  const workspaceId = useWorkspaceId();

  const { data: analytics, isLoading: isLoadingAnalytics } = useGetWorkspaceAnalytics({ workspaceId });
  const { data: tasks, isLoading: isLoadingTasks } = useGetTasks({ workspaceId });
  const { data: suites, isLoading: isLoadingSuites, error: suitesError } = useGetSuites({ workspaceId });
  const { data: initiatives, isLoading: isLoadingInitiatives } = useGetInitiatives({ workspaceId });
  const { data: members, isLoading: isLoadingMembers } = useGetMembers({ workspaceId });

  // AI Actions and suggestions
  const { executeAction, isLoading: isAiLoading, getLoadingActionId, suggestions, dismissSuggestion, acceptSuggestion } = useWorkspaceAiActions(workspaceId);
  const { quickSuggestions, generateQuickSuggestions } = useQuickSuggestions('workspace', { 
    taskCount: tasks?.total || 0,
    hasRecentInsights: false // This would come from your data
  });

  const isLoading =
    isLoadingAnalytics ||
    isLoadingTasks ||
    isLoadingSuites ||
    isLoadingInitiatives ||
    isLoadingMembers;

  // Generate quick suggestions when data loads
  React.useEffect(() => {
    if (analytics && tasks) {
      generateQuickSuggestions({
        taskCount: tasks.total,
        hasRecentInsights: false // Update based on your analytics data
      });
    }
  }, [analytics, tasks, generateQuickSuggestions]);

  if (isLoading) {
    return <PageLoader />
  }

  if (!analytics || !tasks || !members) {
    return <PageError message="Failed to load workspace data" />
  }

  // Fallback to empty array for suites and initiatives if there's an error (during transition)
  const suitesData = suites || { documents: [], total: 0 };
  const initiativesData = initiatives || { documents: [], total: 0 };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Enhanced Analytics with AI Actions */}
      <div className="relative">
        <Analytics data={analytics} />
        {/* AI Action Button overlay */}
        <div className="absolute top-4 right-4">
          <WorkspaceAiActionButton
            onActionClick={executeAction}
            loading={isAiLoading}
            loadingActionId={getLoadingActionId}
            size="sm"
            variant="ghost"
            triggerLabel="AI Insights"
            showBadge
          />
        </div>
      </div>

      {/* AI Suggestions */}
      {(suggestions.length > 0 || quickSuggestions.length > 0) && (
        <div className="space-y-3">
          {quickSuggestions.length > 0 && (
            <AiSuggestionsContainer
              suggestions={quickSuggestions}
              onDismiss={dismissSuggestion}
              onAccept={acceptSuggestion}
              title="Quick Insights"
              compact
              maxVisible={2}
            />
          )}
          {suggestions.length > 0 && (
            <AiSuggestionsContainer
              suggestions={suggestions}
              onDismiss={dismissSuggestion}
              onAccept={acceptSuggestion}
              title="Workspace Recommendations"
              maxVisible={3}
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <TaskList data={tasks.documents} total={tasks.total} />
        <SuiteList data={suitesData.documents} total={suitesData.total} />
        <InitiativeList data={initiativesData.documents} total={initiativesData.total} />
        <MembersList data={members.documents} total={members.total} />
      </div>
    </div>
  );
};

interface TaskListProps {
  data: Task[];
  total: number;
};

export const TaskList = ({ data, total }: TaskListProps) => {
  const workspaceId = useWorkspaceId();
  const { open: createTask } = useCreateTaskModal();

  return (
    <div className="flex flex-col gap-y-4 col-span-1">
      <div className="bg-muted rounded-lg p-4">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold">
            Tasks ({total})
          </p>
          <Button variant="create" size="icon" onClick={createTask} className="group">
            <PlusIcon className="size-4 text-neutral-600 group-hover:text-blue-700" />
          </Button>
        </div>
        <DottedSeparator className="my-4" />
        <ul className="flex flex-col gap-y-4">
          {data.filter(task => task.id).map((task) => (
            <li key={task.id}>
              <Link href={`/workspaces/${workspaceId}/tasks/${task.id}`}>
                <Card className="shadow-none rounded-lg hover:opacity-75 transition">
                  <CardContent className="p-4">
                    <p className="text-lg font-medium truncate">{task.name}</p>
                    <div className="flex items-center gap-x-2">
                      <p>{task.initiative?.name || "No Initiative"}</p>
                      <div className="size-1 rounded-full bg-neutral-300" />
                      <div className="text-sm text-muted-foreground flex items-center">
                        <CalendarIcon className="size-3 mr-1" />
                        <span className="truncate">
                          {task.dueDate ? formatDistanceToNow(new Date(task.dueDate)) : "No due date"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
          <li className="text-sm text-muted-foreground text-center hidden first-of-type:block">
            No tasks found
          </li>
        </ul>
        <Button variant="muted" className="mt-4 w-full" asChild>
          <Link href={`/workspaces/${workspaceId}/tasks`}>
            Show All
          </Link>
        </Button>
      </div>
    </div>
  );
};


interface SuiteListProps {
  data: Suite[];
  total: number;
};

export const SuiteList = ({ data, total }: SuiteListProps) => {
  const workspaceId = useWorkspaceId();
  const { open: createSuite } = useCreateSuiteModal();

  return (
    <div className="flex flex-col gap-y-4 col-span-1">
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold">
            Suites ({total})
          </p>
          <Button 
            variant="secondary" 
            size="icon" 
            onClick={createSuite}
            title="Activate Suite"
          >
            <PowerIcon className="size-4 text-seiri-turquoise-600" />
          </Button>
        </div>
        <DottedSeparator className="my-4" />
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.filter(suite => (suite as any).$id).map((suite) => (
            <li key={(suite as any).$id}>
              <Link href={`/workspaces/${workspaceId}/suites/${(suite as any).$id}`}>
                <Card className="shadow-none rounded-lg hover:opacity-75 transition">
                  <CardContent className="p-4 flex items-center gap-x-2.5">
                    <SuiteAvatar
                      className="size-12"
                      fallbackClassName="text-lg"
                      name={suite.name}
                      image={suite.imageUrl}
                    />
                    <div className="flex flex-col">
                      <p className="text-lg font-medium truncate">
                        {suite.name}
                      </p>
                      {suite.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {suite.description}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
          <li className="text-sm text-muted-foreground text-center hidden first-of-type:block">
            No suites found
          </li>
        </ul>
      </div>
    </div>
  );
};

interface InitiativeListProps {
  data: Initiative[];
  total: number;
};

export const InitiativeList = ({ data, total }: InitiativeListProps) => {
  const workspaceId = useWorkspaceId();
  const { open: createInitiative } = useCreateInitiativeModal();

  return (
    <div className="flex flex-col gap-y-4 col-span-1">
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold">
            Initiatives ({total})
          </p>
          <Button variant="create" size="icon" onClick={createInitiative} className="group">
            <PlusIcon className="size-4 text-neutral-600 group-hover:text-blue-700" />
          </Button>
        </div>
        <DottedSeparator className="my-4" />
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.filter(initiative => (initiative as any)?.$id).map((initiative) => (
            <li key={(initiative as any).$id}>
              <Link href={`/workspaces/${workspaceId}/initiatives/${(initiative as any).$id}`}>
                <Card className="shadow-none rounded-lg hover:opacity-75 transition">
                  <CardContent className="p-4 flex items-center gap-x-2.5">
                    <InitiativeAvatar
                      className="size-12"
                      fallbackClassName="text-lg"
                      name={initiative.name}
                    />
                    <div className="flex flex-col">
                      <p className="text-lg font-medium truncate">
                        {initiative.name}
                      </p>
                      {initiative.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {initiative.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-1 rounded ${
                          initiative.moscow === 'MUST' ? 'bg-red-100 text-red-800' :
                          initiative.moscow === 'SHOULD' ? 'bg-orange-100 text-orange-800' :
                          initiative.moscow === 'COULD' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {initiative.moscow}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
          <li className="text-sm text-muted-foreground text-center hidden first-of-type:block">
            No initiatives found
          </li>
        </ul>
      </div>
    </div>
  );
};

interface MembersListProps {
  data: Member[];
  total: number;
};

export const MembersList = ({ data, total }: MembersListProps) => {
  const workspaceId = useWorkspaceId();

  return (
    <div className="flex flex-col gap-y-4 col-span-1">
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold">
            Members ({total})
          </p>
          <Button asChild variant="secondary" size="icon">
            <Link href={`/workspaces/${workspaceId}/members`}>
              <SettingsIcon className="size-4 text-neutral-400" />
            </Link>
          </Button>
        </div>
        <DottedSeparator className="my-4" />
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.filter(member => (member as any).$id).map((member) => (
            <li key={(member as any).$id}>
              <Card className="shadow-none rounded-lg overflow-hidden">
                <CardContent className="p-3 flex flex-col items-center gap-x-2">
                  <MemberAvatar
                    className="size-12"
                    name={(member as any).name}
                  />
                  <div className="flex flex-col items-center overflow-hidden">
                    <p className="text-lg font-medium line-clamp-1">
                      {(member as any).name}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {(member as any).email}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
          <li className="text-sm text-muted-foreground text-center hidden first-of-type:block">
            No members found
          </li>
        </ul>
      </div>
    </div>
  );
};
