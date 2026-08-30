import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export type LoaderSize = "sm" | "md" | "lg";

export interface LoaderProps {
  size?: LoaderSize;
  label?: string;
  className?: string;
}

const sizeClasses: Record<LoaderSize, string> = {
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
};

export function Loader({ size = "md", label, className }: LoaderProps) {
  return (
    <output
      data-ocid="loading_state"
      aria-live="polite"
      className={cn("flex items-center gap-2 text-muted-foreground", className)}
    >
      <Loader2
        className={cn("animate-spin text-primary", sizeClasses[size])}
        aria-hidden="true"
      />
      {label ? <span className="text-sm">{label}</span> : null}
      <span className="sr-only">Loading</span>
    </output>
  );
}
