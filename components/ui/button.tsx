/* eslint-disable tailwindcss/classnames-order */
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  " inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border-input bg-background hover:bg-accent hover:text-accent-foreground border",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          " hover:text-pixelspace-gray-3 border-1 hover:border-pixelspace-gray-40",
        link: "text-primary underline-offset-4 hover:underline",

        savePrompt:
          " bg-pixelspace-gray-3 text-sm font-normal rounded-sm leading-[17.50px] border text-pixelspace-gray-90 border-pixelspace-gray-3 hover:bg-pixelspace-gray-20",
        cancelPrompt:
          "bg-pixelspace-gray-90 border rounded-sm border-pixelspace-gray-20 text-pixelspace-gray-3 text-sm font-normal leading-[17.50px]  hover:bg-pixelspace-gray-80",

        pixelspace: "hover:bg-pixelspace-gray-70 hover:text-pixelspace-gray-40"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "size-10",
        prompt: "h-11 px-4 py-[10px]"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
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
