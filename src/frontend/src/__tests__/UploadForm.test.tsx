import { UploadForm } from "@/components/upload/UploadForm";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

function makeVideoFile(size = 100, type = "video/mp4"): File {
  return new File([new Uint8Array(size)], "clip.mp4", { type });
}

describe("UploadForm", () => {
  it("requires a title and a video before submitting", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<UploadForm onSubmit={onSubmit} />);

    await user.click(screen.getByText("Upload video"));

    expect(screen.getByText("Title is required.")).toBeInTheDocument();
    expect(screen.getByText("Choose a video to upload.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects an unsupported video format", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<UploadForm onSubmit={onSubmit} />);

    // fireEvent.change bypasses the input's `accept` filter, so an
    // unsupported type reaches the validation logic.
    const videoInput = screen.getByTestId("video_input");
    fireEvent.change(videoInput, {
      target: { files: [makeVideoFile(100, "text/plain")] },
    });

    await user.type(screen.getByTestId("title_input"), "My clip");
    await user.click(screen.getByText("Upload video"));

    expect(
      screen.getByText("Unsupported video format. Use MP4, WebM, or MOV."),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the selected file, title, and description", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<UploadForm onSubmit={onSubmit} />);

    const videoInput = screen.getByTestId("video_input");
    await user.upload(videoInput, makeVideoFile());

    await user.type(screen.getByTestId("title_input"), "My clip");
    await user.type(
      screen.getByTestId("description_textarea"),
      "A description",
    );

    await user.click(screen.getByText("Upload video"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const values = onSubmit.mock.calls[0][0];
    expect(values.title).toBe("My clip");
    expect(values.description).toBe("A description");
    expect(values.file.name).toBe("clip.mp4");
  });
});
