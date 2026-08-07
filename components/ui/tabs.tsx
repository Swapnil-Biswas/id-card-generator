import { cn } from "@/lib/utils";

export function TabButton({ active, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "flex-1 rounded-xl px-4 py-3 text-xs font-mono uppercase tracking-wider font-bold transition-all duration-200 min-h-[44px] touch-manipulation",
        active
          ? "bg-[#F4C93B] text-[#062C1B] shadow-md glow-gold"
          : "text-[#8EB89B] hover:text-[#F4F1EA] hover:bg-[#0F4D31]/50"
      )}
      {...props}
    >
      {children}
    </button>
  );
}
