import { createFileRoute } from "@tanstack/react-router";

const ALLOWED = /(^|\.)(pinimg\.com|pinterest\.com|pinterest\.[a-z.]+)$/i;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** Streams Pinterest media back through our origin so the browser saves it as a file. */
export const Route = createFileRoute("/api/public/media")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const params = new URL(request.url).searchParams;
        const target = params.get("url");
        const filename = (params.get("filename") ?? "eagerbeaver-download").replace(
          /[^\w.-]+/g,
          "-",
        );

        if (!target) return new Response("Missing url", { status: 400 });

        let parsed: URL;
        try {
          parsed = new URL(target);
        } catch {
          return new Response("Invalid url", { status: 400 });
        }
        if (parsed.protocol !== "https:" || !ALLOWED.test(parsed.hostname)) {
          return new Response("Host not allowed", { status: 403 });
        }

        const upstream = await fetch(parsed.toString(), {
          headers: { "User-Agent": UA, Referer: "https://www.pinterest.com/" },
        });
        if (!upstream.ok || !upstream.body) {
          return new Response("Upstream fetch failed", { status: 502 });
        }

        const type = upstream.headers.get("content-type") ?? "application/octet-stream";
        const ext =
          parsed.pathname.match(/\.(jpe?g|png|gif|webp|mp4|m4v)$/i)?.[1]?.toLowerCase() ??
          (type.includes("video") ? "mp4" : "jpg");

        const headers = new Headers({
          "content-type": type,
          "content-disposition": `attachment; filename="${filename}.${ext}"`,
          "cache-control": "public, max-age=3600",
        });
        const len = upstream.headers.get("content-length");
        if (len) headers.set("content-length", len);

        return new Response(upstream.body, { status: 200, headers });
      },
    },
  },
});
