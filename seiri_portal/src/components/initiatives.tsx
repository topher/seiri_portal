"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RiAddCircleFill } from "react-icons/ri";

import { cn } from "@/lib/utils";

import { useGetInitiatives } from "@/features/initiatives/api/use-get-initiatives";
import { InitiativeAvatar } from "@/features/initiatives/components/initiative-avatar";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useCreateInitiativeModal } from "@/features/initiatives/hooks/use-create-initiative-modal";

export const Initiatives = () => {
  const pathname = usePathname();
  const { open } = useCreateInitiativeModal();
  const workspaceId = useWorkspaceId();
  
  // For now, get all initiatives for the workspace
  // TODO: Filter by selected suite when suite selection is implemented
  const { data } = useGetInitiatives({
    workspaceId, // Temporary - should be suiteId
  });

  // Handle empty or undefined data during transition
  const initiatives = data?.documents || [];

  return (
    <div className="flex flex-col gap-y-1">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold tracking-wide text-seiri-gray-900/60 uppercase">
          INITIATIVES
        </h3>
        <RiAddCircleFill 
          onClick={open} 
          className="size-5 text-seiri-gray-900/60 cursor-pointer hover:text-teal-600 transition-all duration-200 transform hover:scale-105" 
        />
      </div>
      {initiatives.filter(initiative => initiative?.$id).map((initiative) => {
        const href = `/workspaces/${workspaceId}/initiatives/${initiative.$id}`;
        const isActive = pathname === href;

        return (
          <Link href={href} key={initiative.$id}>
            <div
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 ease-in-out",
                "hover:bg-teal-50 hover:text-teal-700",
                isActive 
                  ? "bg-teal-100 text-teal-800 border border-teal-200" 
                  : "text-seiri-gray-900/70"
              )}
            >
              <InitiativeAvatar name={initiative.name} />
              <span className="text-sm truncate">{initiative.name}</span>
            </div>
          </Link>
        )
      })}
    </div>
  );
};