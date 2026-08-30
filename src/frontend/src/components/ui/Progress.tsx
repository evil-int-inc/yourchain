import { cn } from "@/lib/utils";

export interface ProgressProps {
  /** Progress value between 0 and 100. */
  value: number;
  /** Optional label shown above the bar (e.g. "Uploading 45%"). */
  label?: string;
  className?: string;
}

export function Progress({ value, label, className }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("w-full", className)}>
      {label ? (
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-mono text-foreground">
            {Math.round(clamped)}%
          </span>
        </div>
      ) : null}
      <div
        data-ocid="progress"
        role="progressbar"
        tabIndex={0}
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
