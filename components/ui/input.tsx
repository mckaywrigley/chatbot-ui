import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          " bg-pixelspace-gray-70 placeholder:text-pixelspace-gray-20  border-pixelspace-gray-50  text-pixelspace-gray-20 focus:border-pixelspace-gray-40  flex h-[42px] w-full  rounded-md border px-3 py-2 text-sm file:bg-transparent file:text-sm file:font-medium  disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
