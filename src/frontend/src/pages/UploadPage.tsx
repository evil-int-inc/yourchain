import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Loader } from "@/components/ui/Loader";
import {
  UploadForm,
  type UploadFormValues,
} from "@/components/upload/UploadForm";
import { UploadProgress } from "@/components/upload/UploadProgress";
import { useAuth } from "@/hooks/useAuth";
import { useVideoUpload } from "@/hooks/useVideoUpload";
import type { Video } from "@/types";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, LogIn, Upload } from "lucide-react";
import { useState } from "react";

type Phase = "idle" | "uploading" | "success" | "error";

export function UploadPage() {
  const { isAuthenticated, isInitializing, login } = useAuth();
  const { upload, cancel, progress, isUploading, error } = useVideoUpload();
  const [phase, setPhase] = useState<Phase>("idle");
  const [uploadedVideo, setUploadedVideo] = useState<Video | null>(null);
  const [pendingInput, setPendingInput] = useState<UploadFormValues | null>(
    null,
  );

  const handleSubmit = async (values: UploadFormValues) => {
    setPendingInput(values);
    setPhase("uploading");
    try {
      const video = await upload(values);
      setUploadedVideo(video);
      setPhase("success");
    } catch {
      setPhase("error");
    }
  };

  const handleRetry = () => {
    if (pendingInput) void handleSubmit(pendingInput);
  };

  const handleReset = () => {
    setPhase("idle");
    setUploadedVideo(null);
    setPendingInput(null);
  };

  if (isInitializing) {
    return (
      <div className="flex justify-center p-16">
        <Loader label="Checking your session…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-2xl p-4 sm:p-6">
        <EmptyState
          icon={<LogIn className="size-7" aria-hidden="true" />}
          title="Sign in to upload"
          description="You need an Internet Identity to publish videos to YourChain. Sign in to start sharing with your subscribers."
          action={
            <Button
              data-ocid="sign_in_button"
              onClick={() => void login()}
              loading={false}
            >
              Sign in with Internet Identity
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Upload a video
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Publish to everyone, or keep a video private to your account.
        </p>
      </header>

      {phase === "success" && uploadedVideo ? (
        <div
          data-ocid="success_state"
          className="flex flex-col items-center gap-4 rounded-box border border-success/30 bg-card px-6 py-12 text-center"
        >
          <div className="flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="size-8" aria-hidden="true" />
          </div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            {uploadedVideo.isPrivate
              ? "Your private video is ready"
              : "Your video is live"}
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            “{uploadedVideo.title}” has been published
            {uploadedVideo.isPrivate
              ? " privately and is visible only to you."
              : " to your channel."}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/watch/$videoId"
              params={{ videoId: uploadedVideo.id.toString() }}
              data-ocid="watch_video_link"
              className="btn btn-primary"
            >
              Watch video
            </Link>
            <Button
              variant="outline"
              data-ocid="upload_another_button"
              onClick={handleReset}
            >
              Upload another
            </Button>
          </div>
        </div>
      ) : phase === "error" ? (
        <ErrorState
          title="Upload failed"
          message={
            error?.message ??
            "Something went wrong while uploading your video. Please try again."
          }
          action={
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              <Button
                data-ocid="retry_button"
                onClick={handleRetry}
                disabled={!pendingInput}
              >
                Try again
              </Button>
              <Button
                variant="outline"
                data-ocid="edit_details_button"
                onClick={handleReset}
              >
                Edit details
              </Button>
            </div>
          }
        />
      ) : phase === "uploading" ? (
        <UploadProgress
          progress={progress}
          fileSize={pendingInput?.file.size ?? 0}
          onCancel={cancel}
        />
      ) : (
        <UploadForm onSubmit={handleSubmit} disabled={isUploading} />
      )}
    </div>
  );
}
