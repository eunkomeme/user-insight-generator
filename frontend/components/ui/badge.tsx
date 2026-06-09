import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", {
  variants: {
    variant: {
      default: "bg-slate-100 text-slate-700",
      blue: "bg-blue-50 text-blue-700",
      green: "bg-emerald-50 text-emerald-700",
      amber: "bg-amber-50 text-amber-700",
      muted: "bg-slate-50 text-slate-500"
    }
  },
  defaultVariants: {
    variant: "default"
  }
});

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
