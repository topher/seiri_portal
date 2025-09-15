import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandCardProps {
  className?: string;
  collapsed?: boolean;
}

export const BrandCard = ({ className, collapsed = false }: BrandCardProps) => {
  return (
    <div className={cn(
      "flex items-center gap-3 p-4 transition-all duration-200",
      collapsed ? "h-10 w-10 justify-center" : "h-16 w-full",
      className
    )}>
      <Link href="/" className="flex items-center gap-3 group">
        {/* Logo Image */}
        <div className={cn(
          "flex items-center justify-center transition-all duration-200 rounded-full",
          collapsed ? "h-8 w-8" : "h-10 w-10"
        )}>
          <Image 
            src="/logo.png" 
            alt="seiri studio" 
            width={collapsed ? 32 : 40}
            height={collapsed ? 32 : 40}
            className={cn(
              "object-contain rounded-md",
              collapsed ? "h-8 w-8" : "h-10 w-10"
            )}
          />
        </div>
        
        {/* Brand Name */}
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-lg font-bold text-seiri-gray-900 group-hover:text-seiri-primary-600 transition-colors">
              Seiri Studio
            </span>
            <span className="text-xs text-seiri-gray-900/60 font-medium tracking-wide">
              AI DEVELOPMENT PLATFORM
            </span>
          </div>
        )}
      </Link>
    </div>
  );
};