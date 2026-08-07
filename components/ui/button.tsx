import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4C93B] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] touch-manipulation",
  {
    variants: {
      variant: {
        default:
          "bg-[#F4C93B] text-[#062C1B] font-mono font-bold uppercase tracking-wider hover:bg-[#FFDC65] shadow-lg glow-gold",
        outline:
          "border border-[#F4C93B]/30 bg-[#093823]/80 text-[#F4F1EA] hover:border-[#F4C93B]/60 hover:bg-[#0F4D31]",
        ghost:
          "text-[#8EB89B] hover:bg-[#0F4D31] hover:text-[#F4F1EA]",
        pink:
          "bg-[#D94F8C] text-white font-mono font-bold uppercase tracking-wider hover:bg-[#FF3893] shadow-lg glow-pink",
      },
      size: {
        default: "h-12 px-5 min-h-[48px]",
        sm: "h-10 px-3.5 text-xs min-h-[40px]",
        lg: "h-14 px-7 text-base min-h-[56px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = "Button";
