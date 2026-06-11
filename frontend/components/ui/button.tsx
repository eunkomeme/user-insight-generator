import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cc785c]/40 disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        default: "bg-[#141413] text-[#faf9f5] shadow-sm hover:bg-[#252320]",
        secondary: "border border-[#e6dfd8] bg-[#faf9f5] text-[#252523] shadow-sm hover:bg-[#f5f0e8]",
        subtle: "bg-[#eee3d3] text-[#5d5144] hover:bg-[#e6d7c5]",
        ghost: "text-[#6c6a64] hover:bg-[#efe9de] hover:text-[#141413]",
        success: "bg-[#647258] text-white shadow-sm hover:bg-[#536049]",
        danger: "bg-[#efe9de] text-[#7b4b3d] hover:bg-[#e6dfd8]"
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
        lg: "h-11 px-5",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  )
);
Button.displayName = "Button";
