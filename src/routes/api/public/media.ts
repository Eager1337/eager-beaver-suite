import { createFileRoute } from "@tanstack/react-router";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function blockedHost(h: string) {
  return (
    h === "localhost" ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(h) ||
    h.includes(":")
  );
}

function refererFor(h: string) {
  if (/pinimg|pinterest/i.test(h)) return "https://www.pinterest.com/";
  if (/tiktok|tikwm/i.test(h)) return "https://www.tiktok.com/";
  if (/cdninstagram|fbcdn/i.test(h)) return "https://www.instagram.com/";
  return undefined;
}

/** Streams media from any public https URL back through our origin so the browser saves it as a file. */
export const Route = createFileRoute("/api/public/media")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const params = new URL(request.url).searchParams;
        const target = params.get("url");
        const inline = params.get("inline") === "1";
        const filename = (params.get("filename") ?? "eagerbeaver-download").replace(/[^\w.-]+/g, "-").slice(0, 80);

        if (!target) return new Response("Missing url", { status: 400 });
        let parsed: URL;
        try {
          parsed = new URL(target);
        } catch {
          return new Response("Invalid url", { status: 400 });
        }
        if (parsed.protocol !== "https:" || blockedHost(parsed.hostname)) {
          return new Response("Host not allowed", { status: 403 });
        }

        const headers: Record<string, string> = { "User-Agent": UA };
        const ref = refererFor(parsed.hostname);
        if (ref) headers.Referer = ref;
        const range = request.headers.get("range");
        if (range) headers.Range = range;

        const upstream = await fetch(parsed.toString(), { headers });
        if (!upstream.ok || !upstream.body) return new Response("Upstream fetch failed", { status: 502 });

        const type = upstream.headers.get("content-type") ?? "application/octet-stream";
        const ext =
          parsed.pathname.match(/\.(jpe?g|png|gif|webp|mp4|m4v|webm|mov|mp3|m4a)$/i)?.[1]?.toLowerCase() ??
          (type.includes("video") ? "mp4" : type.includes("audio") ? "mp3" : "jpg");

        const out = new Headers({
          "content-type": type,
          "content-disposition": `${inline ? "inline" : "attachment"}; filename="${filename}.${ext}"`,
          "cache-control": "public, max-age=3600",
          "accept-ranges": "bytes",
        });
        for (const h of ["content-length", "content-range"]) {
          const v = upstream.headers.get(h);
          if (v) out.set(h, v);
        }
        return new Response(upstream.body, { status: upstream.status, headers: out });
      },
    },
  },
});
