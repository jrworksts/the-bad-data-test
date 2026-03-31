import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-12 w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-base text-paper placeholder:text-cloud/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow md:text-sm",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
