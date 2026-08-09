import { useState } from "react";
import { AlertTriangle, ImageOff } from "lucide-react";

type Props = {
  mediaType: string;
  mediaUrl: string | null;
  previewUrl: string | null;
  title: string | null;
  status: string;
};

/** Inline preview for a saved download — image, GIF, or video with controls. */
export function MediaPreview({ mediaType, mediaUrl, previewUrl, title, status }: Props) {
  const [failed, setFailed] = useState(false);
  const src = mediaUrl ?? previewUrl;

  if (status !== "success" || !src) {
    return (
      <Fallback
        icon={<ImageOff className="h-6 w-6" />}
        label={
          status === "error"
            ? "Preview unavailable — the download failed."
            : "Preview appears once the download finishes."
        }
      />
    );
  }

  if (failed) {
    return (
      <Fallback
        icon={<AlertTriangle className="h-6 w-6" />}
        label="Pinterest wouldn't serve this media. Open the original link instead."
      />
    );
  }

  if (mediaType === "video") {
    return (
      <video
        src={src}
        poster={previewUrl ?? undefined}
        controls
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
        className="w-full rounded-2xl bg-black shadow-elegant"
      >
        Your browser can't play this video.
      </video>
    );
  }

  return (
    <img
      src={src}
      alt={title ?? "Downloaded Pinterest media"}
      loading="lazy"
      onError={() => setFailed(true)}
      className="w-full rounded-2xl object-cover shadow-elegant"
    />
  );
}

function Fallback({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="aspect-square w-full rounded-2xl border border-dashed border-border bg-muted/30 grid place-items-center p-6 text-center">
      <div className="space-y-2 text-muted-foreground">
        <div className="grid place-items-center">{icon}</div>
        <p className="text-xs">{label}</p>
      </div>
    </div>
  );
}
