import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SummaryCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: {
    value: number;
    type: "increase" | "decrease";
  };
  variant?: "default" | "active";
}

export const SummaryCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  variant = "default" 
}: SummaryCardProps) => {
  const isActive = value > 0;
  const showDangerBadge = trend && trend.value > 0 && title.toLowerCase().includes("overdue");

  return (
    <div className={cn(
      "relative p-6 rounded-lg border transition-all duration-200 hover:shadow-md",
      isActive 
        ? "bg-seiri-primary-50 border-seiri-primary-200" 
        : "bg-white border-gray-200"
    )}>
      {/* Icon */}
      <div className={cn(
        "w-12 h-12 rounded-lg flex items-center justify-center mb-4",
        isActive 
          ? "bg-seiri-primary-600 text-white" 
          : "bg-seiri-gray-100 text-seiri-gray-900/60"
      )}>
        <Icon className="h-6 w-6" />
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-seiri-gray-900/60 mb-1">
        {title}
      </h3>

      {/* Value */}
      <div className="flex items-end justify-between">
        <span className={cn(
          "text-3xl font-bold",
          isActive ? "text-seiri-primary-600" : "text-seiri-gray-900/40"
        )}>
          {value}
        </span>

        {/* Trend Badge */}
        {trend && (
          <div className={cn(
            "px-2 py-1 rounded-full text-xs font-medium",
            showDangerBadge
              ? "bg-red-100 text-red-600"
              : trend.type === "increase"
              ? "bg-green-100 text-green-600"
              : "bg-gray-100 text-gray-600"
          )}>
            {trend.type === "increase" ? "+" : "-"}{Math.abs(trend.value)}
          </div>
        )}
      </div>
    </div>
  );
};