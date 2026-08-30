import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export type BadgeVariant =
  | "default"
  | "primary"
  | "outline"
  | "muted"
  | "success"
  | "warning"
  | "danger"
  | "live";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "badge-neutral",
  primary: "badge-primary",
  outline: "badge-outline",
  muted: "badge-ghost",
  success: "badge-success",
  warning: "badge-warning",
  danger: "badge-error",
  live: "badge-error",
};

export function Badge({
  className,
  variant = "default",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      data-ocid="badge"
      className={cn("badge font-medium", variantClasses[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
}
