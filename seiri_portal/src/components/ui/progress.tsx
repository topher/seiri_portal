"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps {
  value?: number
  className?: string
  max?: number
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    return (
      <div
        ref={ref}
        className={cn(
          "relative h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800",
          className
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemax={max}
        aria-valuemin={0}
        {...props}
      >
        <div
          className="h-full bg-blue-600 transition-all duration-200 ease-in-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    )
  }
)
Progress.displayName = "Progress"

export { Progress }