import { cn } from "@/lib/utils";

export function TabButton({ active, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return <button type="button" className={cn("flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition", active ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")} {...props}>{children}</button>;
}
