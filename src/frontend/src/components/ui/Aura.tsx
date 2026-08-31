import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface AuraProps {
  readonly children: ReactNode;
  readonly gold?: boolean;
  readonly rainbow?: boolean;
  readonly disabled?: boolean;
}

export const Aura = ({
  children,
  gold = false,
  rainbow = false,
  disabled = false,
}: AuraProps) => {
  if (disabled) return children;

  return (
    <div className={cn("aura", gold && "aura-gold", rainbow && "aura-rainbow")}>
      {children}
    </div>
  );
};
