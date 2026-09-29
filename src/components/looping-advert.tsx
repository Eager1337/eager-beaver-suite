import { useEffect, useRef } from "react";

type LoopingAdvertProps = { src: string; poster: string; title: string };

export function LoopingAdvert({ src, poster, title }: LoopingAdvertProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const resume = () => {
      if (document.visibilityState !== "visible") return;
      video.muted = true;
      if (video.paused && !video.error) void video.play().catch(() => {});
    };
    resume();
    video.addEventListener("canplay", resume);
    video.addEventListener("pause", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      video.removeEventListener("canplay", resume);
      video.removeEventListener("pause", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [src]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-label={title}
      className="w-full object-cover"
    />
  );
}