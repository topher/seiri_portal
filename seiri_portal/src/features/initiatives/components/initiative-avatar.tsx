import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface InitiativeAvatarProps {
  name: string;
  className?: string;
  fallbackClassName?: string;
}

export const InitiativeAvatar = ({
  name,
  className,
  fallbackClassName,
}: InitiativeAvatarProps) => {
  return (
    <Avatar className={cn("size-5 rounded-md", className)}>
      <AvatarFallback
        className={cn(
          "text-white bg-gradient-to-br from-seiri-accent-500 to-seiri-primary-600 font-semibold text-xs rounded-md border border-seiri-accent-200",
          fallbackClassName,
        )}
      >
        {name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
};