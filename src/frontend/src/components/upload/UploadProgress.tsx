import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { config } from "@/config";
import { formatBytes } from "@/utils/format";
import { Loader2 } from "lucide-react";

export interface UploadProgressProps {
  /** Upload progress percentage between 0 and 100. */
  progress: number;
  /** Total size of the file being uploaded, in bytes. */
  fileSize: number;
  /** Chunk size used by the upload orchestration, in bytes. */
  chunkSize?: number;
  /** Human-readable status label shown above the bar. */
  status?: string;
  /** Optional cancel handler shown as a secondary action. */
  onCancel?: () => void;
}

export function UploadProgress({
  progress,
  fileSize,
  chunkSize = config.uploadChunkSize,
  status = "Uploading",
  onCancel,
}: UploadProgressProps) {
  const uploadedBytes = Math.round((fileSize * progress) / 100);
  const totalChunks = Math.max(1, Math.ceil(fileSize / chunkSize));
  const currentChunk = Math.min(
    totalChunks,
    Math.max(1, Math.ceil(uploadedBytes / chunkSize)),
  );

  return (
    <div
      data-ocid="upload_progress"
      className="flex flex-col gap-4 rounded-box border border-border bg-card p-6"
    >
      <div className="flex items-center gap-3">
        <Loader2
          className="size-5 animate-spin text-primary"
          aria-hidden="true"
        />
        <h3 className="font-display text-base font-semibold text-foreground">
          {status}
        </h3>
      </div>

      <Progress value={progress} label="Uploading" />

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          <span className="font-mono text-foreground">
            {formatBytes(uploadedBytes)}
          </span>{" "}
          of {formatBytes(fileSize)}
        </span>
        <span className="text-muted-foreground">
          Chunk{" "}
          <span className="font-mono text-foreground">{currentChunk}</span> of{" "}
          {totalChunks}
        </span>
      </div>

      {onCancel ? (
        <div className="flex justify-end border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-ocid="cancel_upload_button"
            onClick={onCancel}
          >
            Cancel upload
          </Button>
        </div>
      ) : null}
    </div>
  );
}
