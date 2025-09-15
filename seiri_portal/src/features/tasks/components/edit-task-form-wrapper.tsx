import { Loader } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetInitiatives } from "@/features/initiatives/api/use-get-initiatives";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";

import { EditTaskForm } from "./edit-task-form";

import { useGetTask } from "../api/use-get-task";

interface EditTaskFormWrapperProps {
  onCancel: () => void;
  id: string;
};

export const EditTaskFormWrapper = ({
  onCancel,
  id,
}: EditTaskFormWrapperProps) => {
  const workspaceId = useWorkspaceId();

  const { data: initialValues, isLoading: isLoadingTask } = useGetTask({
    taskId: id,
  });

  const { data: initiatives, isLoading: isLoadingInitiatives } = useGetInitiatives({ workspaceId });
  const { data: members, isLoading: isLoadingMembers } = useGetMembers({ workspaceId });

  const initiativeOptions = initiatives?.documents.map((initiative) => ({
    id: initiative.$id,
    name: initiative.name,
    imageUrl: initiative.imageUrl,
  }));

  const memberOptions = members?.documents.map((member: any) => ({
    id: member.$id,
    name: member.name,
  }));

  const isLoading = isLoadingInitiatives || isLoadingMembers || isLoadingTask

  if (isLoading) {
    return (
      <Card className="w-full h-[714px] border-none shadow-none">
        <CardContent className="flex items-center justify-center h-full">
          <Loader className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!initialValues) {
    return null;
  }

  return (
    <EditTaskForm
      onCancel={onCancel}
      initialValues={initialValues}
      initiativeOptions={initiativeOptions ?? []}
      memberOptions={memberOptions ?? []}
    />
  );
};
