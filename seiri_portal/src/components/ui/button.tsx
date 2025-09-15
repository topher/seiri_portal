import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:bg-neutral-100 disabled:from-neutral-100 disabled:to-neutral-100 disabled:text-neutral-500 border border-neutral-200 shadow-sm",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-b from-seiri-primary-600 to-seiri-primary-900 text-white hover:from-seiri-primary-900 hover:to-seiri-primary-900 border-transparent",
        destructive:
          "bg-gradient-to-b from-amber-600 to-amber-700 text-white hover:from-amber-700 hover:to-amber-700 border-transparent",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-white text-black hover:bg-neutral-100 hover:text-black border-neutral-300",
        ghost: "border-transparent shadow-none hover:bg-accent hover:text-accent-foreground",
        muted: "bg-neutral-200 text-neutral-700 hover:bg-neutral-300 hover:text-neutral-900 border-neutral-300",
        teritary: "bg-teal-100 text-teal-700 border-transparent hover:bg-teal-200 hover:text-teal-900 shadow-none",
        create: "bg-white text-black border border-neutral-300 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3",
        xs: "h-7 rounded-md px-2 text-xs",
        lg: "h-12 rounded-md px-8",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
