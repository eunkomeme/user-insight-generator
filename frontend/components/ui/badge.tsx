import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", {
  variants: {
    variant: {
      default: "border-stone-200 bg-stone-100 text-stone-700",
      blue: "border-sky-200 bg-sky-50 text-sky-800",
      green: "border-[#cdd6bf] bg-[#eef1e6] text-[#59664d]",
      amber: "border-[#ead3a5] bg-[#fbf1d7] text-[#8a6127]",
      muted: "border-stone-200 bg-[#f5f0e8] text-stone-500"
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
