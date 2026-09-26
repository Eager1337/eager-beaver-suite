import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type SocialVariant = { label: string; url: string; kind: "video" | "audio" | "image" };
export type SocialResult =
  | {
      ok: true;
      platform: "youtube" | "tiktok" | "instagram" | "web";
      title: string;
      author: string | null;
      cover: string | null;
      embedUrl: string | null;
      variants: SocialVariant[];
      note?: string;
    }
  | { ok: false; error: string };

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export function detectPlatform(u: string): "youtube" | "tiktok" | "instagram" | "web" {
  if (/youtu\.?be/i.test(u)) return "youtube";
  if (/tiktok\.com/i.test(u)) return "tiktok";
  if (/instagram\.com/i.test(u)) return "instagram";
  return "web";
}

function ytId(u: string) {
  return u.match(/(?:youtu\.be\/|v=|shorts\/|embed\/|live\/)([\w-]{11})/)?.[1] ?? null;
}

async function viaTikwm(url: string): Promise<SocialResult> {
  const r = await fetch(`https://www.tikwm.com/api/?hd=1&url=${encodeURIComponent(url)}`, {
    headers: { "User-Agent": UA },
  });
  const j = (await r.json().catch(() => null)) as
    | { code: number; msg: string; data?: { title: string; cover: string; hdplay?: string; play?: string; wmplay?: string; music?: string; author?: { nickname?: string }; id: string } }
    | null;
  if (!j || j.code !== 0 || !j.data) return { ok: false, error: "Couldn't read that TikTok. Is it public?" };
  const d = j.data;
  const variants: SocialVariant[] = [];
  if (d.hdplay) variants.push({ label: "MP4 · HD (no watermark)", url: d.hdplay, kind: "video" });
  if (d.play) variants.push({ label: "MP4 · Standard (no watermark)", url: d.play, kind: "video" });
  if (d.wmplay) variants.push({ label: "MP4 · With watermark", url: d.wmplay, kind: "video" });
  if (d.music) variants.push({ label: "MP3 · Sound only", url: d.music, kind: "audio" });
  if (d.cover) variants.push({ label: "JPG · Cover", url: d.cover, kind: "image" });
  return {
    ok: true,
    platform: "tiktok",
    title: d.title || "TikTok video",
    author: d.author?.nickname ?? null,
    cover: d.cover ?? null,
    embedUrl: `https://www.tiktok.com/embed/v2/${d.id}`,
    variants,
  };
}

/** Optional paid all-in-one service (YouTube 4K, Instagram, etc.) — used when RAPIDAPI_KEY is set. */
async function viaRapid(url: string, key: string): Promise<SocialVariant[] | null> {
  try {
    const r = await fetch("https://social-download-all-in-one.p.rapidapi.com/v1/social/autolink", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-rapidapi-key": key,
        "x-rapidapi-host": "social-download-all-in-one.p.rapidapi.com",
      },
      body: JSON.stringify({ url }),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { medias?: { url: string; quality?: string; type?: string; extension?: string }[] };
    const out = (j.medias ?? []).map((m) => ({
      label: `${(m.extension ?? m.type ?? "file").toUpperCase()} · ${m.quality ?? "Original"}`,
      url: m.url,
      kind: (m.type === "audio" ? "audio" : m.type === "image" ? "image" : "video") as SocialVariant["kind"],
    }));
    const rank = (l: string) => Number(l.match(/(\d{3,4})p/)?.[1] ?? 0);
    return out.sort((a, b) => rank(b.label) - rank(a.label));
  } catch {
    return null;
  }
}

async function scrapeWeb(url: string): Promise<SocialResult> {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "*/*" }, redirect: "follow" });
  if (!r.ok) return { ok: false, error: "That page couldn't be opened." };
  const type = r.headers.get("content-type") ?? "";
  if (type.startsWith("video/") || type.startsWith("audio/")) {
    return {
      ok: true, platform: "web", title: decodeURIComponent(new URL(url).pathname.split("/").pop() || "Video"),
      author: new URL(url).hostname, cover: null, embedUrl: null,
      variants: [{ label: "Original file", url, kind: type.startsWith("audio/") ? "audio" : "video" }],
    };
  }
  const html = (await r.text()).slice(0, 2_000_000);
  const meta = (p: string) =>
    html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]+content=["']([^"']+)`, "i"))?.[1] ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${p}["']`, "i"))?.[1];
  const found = new Set<string>();
  for (const k of ["og:video:secure_url", "og:video:url", "og:video", "twitter:player:stream"]) {
    const v = meta(k);
    if (v && /^https:/.test(v)) found.add(v.replace(/&amp;/g, "&"));
  }
  for (const m of html.matchAll(/https:\\?\/\\?\/[^"'\s<>]+?\.(?:mp4|webm|mov)(?:\?[^"'\s<>]*)?/gi)) {
    found.add(m[0].replace(/\\\//g, "/").replace(/&amp;/g, "&"));
    if (found.size > 8) break;
  }
  if (!found.size) return { ok: false, error: "No downloadable video found on that page." };
  const base = new URL(url);
  return {
    ok: true,
    platform: "web",
    title: meta("og:title") ?? html.match(/<title>([^<]+)/i)?.[1]?.trim() ?? base.hostname,
    author: meta("og:site_name") ?? base.hostname,
    cover: meta("og:image") ?? null,
    embedUrl: null,
    variants: [...found].map((u, i) => ({ label: `Video ${i + 1} · ${u.match(/\.(mp4|webm|mov)/i)?.[1]?.toUpperCase() ?? "MP4"}`, url: u, kind: "video" as const })),
  };
}

export async function resolveAnyVideo(url: string): Promise<SocialResult> {
  const platform = detectPlatform(url);
  const key = process.env["RAPIDAPI_KEY"];
  if (platform === "tiktok") return viaTikwm(url);

  if (platform === "youtube") {
    const id = ytId(url);
    if (!id) return { ok: false, error: "That doesn't look like a YouTube video link." };
    const o = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`);
    if (!o.ok) return { ok: false, error: "That video is private or doesn't exist." };
    const j = (await o.json()) as { title: string; author_name: string };
    const cover = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
    const paid = key ? await viaRapid(url, key) : null;
    return {
      ok: true, platform, title: j.title, author: j.author_name, cover,
      embedUrl: `https://www.youtube.com/embed/${id}`,
      variants: [...(paid ?? []), { label: "JPG · HD cover", url: cover, kind: "image" }],
      note: paid?.length ? undefined : "Full YouTube video files (up to 2160p) turn on once the download service key is added.",
    };
  }

  if (platform === "instagram") {
    const code = url.match(/instagram\.com\/(?:p|reel|reels|tv)\/([\w-]+)/)?.[1];
    const paid = key ? await viaRapid(url, key) : null;
    if (paid?.length || code) {
      return {
        ok: true, platform, title: "Instagram post", author: null, cover: null,
        embedUrl: code ? `https://www.instagram.com/p/${code}/embed` : null,
        variants: paid ?? [],
        note: paid?.length ? undefined : "Instagram video files turn on once the download service key is added.",
      };
    }
    return { ok: false, error: "Paste an Instagram post or reel link." };
  }

  const scraped = await scrapeWeb(url).catch(() => ({ ok: false, error: "That page couldn't be opened." }) as SocialResult);
  if (!scraped.ok && key) {
    const paid = await viaRapid(url, key);
    if (paid?.length) return { ok: true, platform: "web", title: new URL(url).hostname, author: null, cover: null, embedUrl: null, variants: paid };
  }
  return scraped;
}

export const resolveSocial = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ url: z.string().url().max(1000) }).parse(i))
  .handler(async ({ data }): Promise<SocialResult> => {
    try {
      return await resolveAnyVideo(data.url);
    } catch {
      return { ok: false, error: "Something went wrong reading that link. Try again." };
    }
  });
