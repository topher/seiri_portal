import { Loader } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetInitiatives } from "@/features/initiatives/api/use-get-initiatives";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { CreateTaskForm } from "./create-task-form";

interface CreateTaskFormWrapperProps {
  onCancel: () => void;
};

export const CreateTaskFormWrapper = ({
  onCancel
}: CreateTaskFormWrapperProps) => {
  const workspaceId = useWorkspaceId();

  const { data: initiatives, isLoading: isLoadingInitiatives } = useGetInitiatives({ workspaceId });
  const { data: members, isLoading: isLoadingMembers } = useGetMembers({ workspaceId });

  const initiativeOptions = initiatives?.documents.map((initiative) => ({
    id: initiative.$id,
    name: initiative.name,
  }));

  const memberOptions = members?.documents.map((member: any) => ({
    id: member.$id,
    name: member.name,
  }));

  const isLoading = isLoadingInitiatives || isLoadingMembers;

  if (isLoading) {
    return (
      <Card className="w-full h-[714px] border-none shadow-none">
        <CardContent className="flex items-center justify-center h-full">
          <Loader className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <CreateTaskForm
      onCancel={onCancel}
      initiativeOptions={initiativeOptions ?? []}
      memberOptions={memberOptions ?? []}
    />
  );
};
