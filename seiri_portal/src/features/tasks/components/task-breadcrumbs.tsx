"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRightIcon, TrashIcon } from "lucide-react";

import { Initiative } from "@/features/initiatives/types";
import { InitiativeAvatar } from "@/features/initiatives/components/initiative-avatar";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/hooks/use-confirm";

import { Task } from "../types";
import { useDeleteTask } from "../api/use-delete-task";

interface TaskBreadcrumbsProps {
  initiative: Initiative;
  task: Task;
};

export const TaskBreadcrumbs = ({
  initiative,
  task
}: TaskBreadcrumbsProps) => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();

  const { mutate, isPending } = useDeleteTask();
  const [ConfirmDialog, confirm] = useConfirm(
    "Delete task",
    "This action cannot be undone.",
    "destructive"
  );

  const handleDeleteTask = async () => {
    const ok = await confirm();
    if (!ok) return;

    mutate({ param: { taskId: task.id } }, {
      onSuccess: () => {
        router.push(`/workspaces/${workspaceId}/tasks`);
      },
    });
  };

  return (
    <div className="flex items-center gap-x-2">
      <ConfirmDialog />
      <InitiativeAvatar
        name={initiative.name}
        className="size-6 lg:size-8"
      />
      <Link href={`/workspaces/${workspaceId}/initiatives/${initiative.$id}`}>
        <p className="text-sm lg:text-lg font-semibold text-muted-foreground hover:opacity-75 transition">
          {initiative.name}
        </p>
      </Link>
      <ChevronRightIcon className="size-4 lg:size-5 text-muted-foreground" />
      <p className="text-sm lg:text-lg font-semibold">
        {task.name}
      </p>
      <Button
        onClick={handleDeleteTask}
        disabled={isPending}
        className="ml-auto"
        variant="destructive"
        size="sm"
      >
        <TrashIcon className="size-4 lg:mr-2" />
        <span className="hidden lg:block">Delete Task</span>
      </Button>
    </div>
  )
}