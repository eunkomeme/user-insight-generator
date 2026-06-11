import * as React from "react";

import { cn } from "../../lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-[#e6dfd8] bg-[#faf9f5] px-3 text-sm text-[#252523] shadow-sm outline-none transition placeholder:text-[#8e8b82] focus:border-[#cc785c] focus:ring-4 focus:ring-[#e6dfd8]",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";
