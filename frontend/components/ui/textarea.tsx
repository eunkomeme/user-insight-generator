import * as React from "react";

import { cn } from "../../lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "min-h-36 w-full resize-y rounded-lg border border-[#e6dfd8] bg-[#faf9f5] px-3 py-3 text-sm leading-6 text-[#252523] shadow-sm outline-none transition placeholder:text-[#8e8b82] focus:border-[#cc785c] focus:ring-4 focus:ring-[#e6dfd8]",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
