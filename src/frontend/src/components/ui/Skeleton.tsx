import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Renders a circular skeleton (e.g. for avatars). */
  circle?: boolean;
}

export function Skeleton({
  className,
  circle = false,
  ...props
}: SkeletonProps) {
  return (
    <div
      data-ocid="skeleton"
      aria-hidden="true"
      className={cn(
        "animate-shimmer rounded-md bg-muted",
        "bg-[linear-gradient(110deg,oklch(var(--muted))_8%,oklch(var(--card))_18%,oklch(var(--muted))_33%)]",
        "bg-[length:200%_100%]",
        circle && "rounded-full",
        className,
      )}
      {...props}
    />
  );
}
