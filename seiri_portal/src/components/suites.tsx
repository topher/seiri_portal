"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RiAddCircleFill } from "react-icons/ri";
import { 
  Settings, 
  Package, 
  Code, 
  Megaphone, 
  TrendingUp, 
  BarChart3,
  Folder
} from "lucide-react";

import { cn } from "@/lib/utils";

import { useGetSuites } from "@/features/suites/api/use-get-suites";
import { SuiteAvatar } from "@/features/suites/components/suite-avatar";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useCreateSuiteModal } from "@/features/suites/hooks/use-create-suite-modal";

const getSuiteIcon = (suiteName: string) => {
  const name = suiteName.toLowerCase();
  switch (name) {
    case 'ops':
      return Settings;
    case 'product':
      return Package;
    case 'coding':
      return Code;
    case 'marketing':
      return Megaphone;
    case 'sales':
      return TrendingUp;
    case 'strategy':
      return BarChart3;
    default:
      return Folder;
  }
};

export const Suites = () => {
  const pathname = usePathname();
  const { open } = useCreateSuiteModal();
  const workspaceId = useWorkspaceId();
  const { data } = useGetSuites({
    workspaceId,
  });

  // Handle empty or undefined data during transition
  const suites = data?.documents || [];

  return (
    <div className="flex flex-col gap-y-1">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold tracking-wide text-seiri-gray-900/60 uppercase">
          SUITES
        </h3>
        <RiAddCircleFill 
          onClick={open} 
          className="size-5 text-gray-500 cursor-pointer hover:text-teal-600 transition-all duration-200 transform hover:scale-105" 
        />
      </div>
      {suites.filter(suite => suite?.$id).map((suite) => {
        const href = `/workspaces/${workspaceId}/suites/${suite.$id}`;
        const isActive = pathname === href;
        const IconComponent = getSuiteIcon(suite.name);

        return (
          <Link href={href} key={suite.$id}>
            <div
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 ease-in-out",
                "hover:bg-teal-50 hover:text-teal-700",
                isActive 
                  ? "bg-teal-100 text-teal-800 border border-teal-200" 
                  : "text-gray-700"
              )}
            >
              {suite.imageUrl ? (
                <SuiteAvatar image={suite.imageUrl} name={suite.name} />
              ) : (
                <div className={cn(
                  "flex items-center justify-center size-5 rounded-md",
                  isActive 
                    ? "text-teal-600" 
                    : "text-gray-500"
                )}>
                  <IconComponent className="size-4" />
                </div>
              )}
              <span className="text-sm truncate">{suite.name}</span>
            </div>
          </Link>
        )
      })}
    </div>
  );
};