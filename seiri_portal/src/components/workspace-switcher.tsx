"use client";

import { useRouter } from "next/navigation";
import { RiAddCircleFill } from "react-icons/ri";

import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useGetWorkspaces } from "@/features/workspaces/api/use-get-workspaces";
import { WorkspaceAvatar } from "@/features/workspaces/components/workspace-avatar";
import { useCreateWorkspaceModal } from "@/features/workspaces/hooks/use-create-workspace-modal";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const WorkspaceSwitcher = () => {
  const workspaceId = useWorkspaceId();
  const router = useRouter();
  const { data: workspaces, isLoading } = useGetWorkspaces();
  const { open } = useCreateWorkspaceModal();

  const onSelect = (id: string) => {
    router.push(`/workspaces/${id}`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-y-2">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-semibold tracking-wide text-seiri-gray-900/60 uppercase">
            WORKSPACES
          </h3>
          <RiAddCircleFill 
            onClick={open} 
            className="size-5 text-seiri-gray-900/60 cursor-pointer hover:text-seiri-turquoise-600 transition-all duration-200 transform hover:scale-105" 
          />
        </div>
        <div className="w-full bg-seiri-gray-50 border-seiri-gray-100 font-medium p-2 rounded-md animate-pulse">
          <div className="h-6 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-2">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-semibold tracking-wide text-seiri-gray-900/60 uppercase">
          WORKSPACES
        </h3>
        <RiAddCircleFill 
          onClick={open} 
          className="size-5 text-seiri-gray-900/60 cursor-pointer hover:text-seiri-turquoise-600 transition-all duration-200 transform hover:scale-105" 
        />
      </div>
      <Select onValueChange={onSelect} value={workspaceId || ""}>
        <SelectTrigger className="w-full bg-seiri-gray-50 border-seiri-gray-100 font-medium p-2 hover:bg-seiri-gray-100 transition-colors">
          <SelectValue placeholder="No workspace selected" />
        </SelectTrigger>
        <SelectContent>
          {workspaces?.documents?.map((workspace) => (
            <SelectItem key={workspace.$id} value={workspace.$id}>
              <div className="flex justify-start items-center gap-3 font-medium">
                <WorkspaceAvatar name={workspace.name} image={workspace.imageUrl} />
                <span className="truncate">{workspace.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
