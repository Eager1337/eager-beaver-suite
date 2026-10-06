import { createFileRoute } from "@tanstack/react-router";

// Streams a finished AI ad video (job ids are long and unguessable; gateway links expire ~48h).
export const Route = createFileRoute("/api/public/ad-video")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get("id") ?? "";
        if (!/^[\w-]{8,120}$/.test(id)) return new Response("Bad id", { status: 400 });
        const res = await fetch(`https://ai.gateway.lovable.dev/v1/videos/${encodeURIComponent(id)}/content`, {
          headers: { Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}` },
        });
        if (!res.ok || !res.body) return new Response("Video not available", { status: 404 });
        const dl = url.searchParams.get("download") === "1";
        return new Response(res.body, {
          headers: {
            "content-type": "video/mp4",
            "cache-control": "private, max-age=3600",
            ...(dl ? { "content-disposition": 'attachment; filename="eagerbeaver-ad.mp4"' } : {}),
          },
        });
      },
    },
  },
});
