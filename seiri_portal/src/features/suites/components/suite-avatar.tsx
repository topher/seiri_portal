import Image from "next/image";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface SuiteAvatarProps {
  image?: string;
  name: string;
  className?: string;
  fallbackClassName?: string;
}

export const SuiteAvatar = ({
  image,
  name,
  className,
  fallbackClassName,
}: SuiteAvatarProps) => {
  if (image) {
    return (
      <div className={cn("size-5 relative rounded-md overflow-hidden", className)}>
        <Image src={image} alt={name} fill className="object-cover" />
      </div>
    );
  }

  return (
    <Avatar className={cn("size-5 rounded-md", className)}>
      <AvatarFallback
        className={cn(
          "text-white bg-gradient-to-br from-seiri-primary-500 to-seiri-accent-500 font-semibold text-xs rounded-md border border-seiri-primary-200",
          fallbackClassName,
        )}
      >
        {name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
};