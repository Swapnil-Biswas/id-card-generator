import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-12 w-full rounded-2xl border border-[#175B3B] bg-[#062C1B]/90 px-4 text-sm text-[#F4F1EA] outline-none transition-all placeholder:text-[#8EB89B]/60 focus:border-[#F4C93B] focus:ring-4 focus:ring-[#F4C93B]/15 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation font-medium",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
