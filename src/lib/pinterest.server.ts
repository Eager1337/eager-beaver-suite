// Server-only Pinterest resolver.
// Resolves a public Pinterest URL (pin, video pin, GIF, pin.it short link)
// into concrete media metadata by reading the page's embedded data.
//
// This is intentionally provider-shaped: swap `resolvePinterestMedia` for a
// paid API client later without touching any caller.

export type MediaVariant = {
  id: string;
  label: string;
  mediaType: "image" | "video" | "gif";
  url: string;
  width: number | null;
  height: number | null;
};

export type ResolvedMedia = {
  title: string | null;
  authorName: string | null;
  mediaType: "image" | "video" | "gif";
  mediaUrl: string;
  previewUrl: string | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  fileSize: number | null;
  variants: MediaVariant[];
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function decode(value: string): string {
  return value
    .replace(/\\u002F/gi, "/")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function meta(html: string, key: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decode(m[1]);
  }
  return null;
}

function firstMatch(html: string, re: RegExp): string | null {
  const m = html.match(re);
  return m?.[1] ? decode(m[1]) : null;
}

const VIDEO_KEYS = ["V_EXP7", "V_EXP6", "V_EXP5", "V_EXP4", "V_EXP3", "V_720P"] as const;

function videoRendition(html: string, key: string): string | null {
  return firstMatch(
    html,
    new RegExp(`"${key}"\\s*:\\s*\\{[^{}]*?"url"\\s*:\\s*"([^"]+)"`, "i"),
  );
}

function pickQualityUrl(html: string, quality: string): string | null {
  const order =
    quality === "720p"
      ? ["V_720P", "V_EXP7", "V_EXP6"]
      : ["V_EXP7", "V_720P", "V_EXP6"];
  for (const key of order) {
    const url = videoRendition(html, key);
    if (url) return url;
  }
  return firstMatch(html, /"url"\s*:\s*"(https:\\?\/\\?\/[^"]+\.mp4[^"]*)"/i);
}

function resizeImage(url: string, size: string): string {
  return url.replace(/\/(originals|\d+x\d*)\//, `/${size}/`);
}

function upgradeImageQuality(url: string, quality: string): string {
  // Pinterest image CDN paths encode size as /236x/, /564x/, /originals/.
  if (quality === "original") return resizeImage(url, "originals");
  if (quality === "1080p") return resizeImage(url, "1200x");
  return resizeImage(url, "736x");
}

function imageVariants(
  ogImage: string,
  isGif: boolean,
  width: number | null,
  height: number | null,
): MediaVariant[] {
  const type: MediaVariant["mediaType"] = isGif ? "gif" : "image";
  const sizes: Array<[string, string]> = [
    ["originals", "Original quality"],
    ["1200x", "Large · 1200px wide"],
    ["736x", "Medium · 736px wide"],
    ["564x", "Small · 564px wide"],
  ];
  const seen = new Set<string>();
  const out: MediaVariant[] = [];
  for (const [size, label] of sizes) {
    const url = resizeImage(ogImage, size);
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({
      id: size,
      label: `${type.toUpperCase()} · ${label}`,
      mediaType: type,
      url,
      width: size === "originals" ? width : Number(size.replace(/x.*/, "")) || null,
      height: size === "originals" ? height : null,
    });
  }
  return out;
}

async function headSize(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, { method: "HEAD", headers: { "User-Agent": UA } });
    const len = res.headers.get("content-length");
    return len ? Number(len) : null;
  } catch {
    return null;
  }
}

export function isPinterestUrl(value: string): boolean {
  return /^https?:\/\/([a-z0-9-]+\.)*(pinterest\.[a-z.]+|pin\.it)\//i.test(value.trim());
}

export async function resolvePinterestMedia(
  rawUrl: string,
  quality: string,
): Promise<ResolvedMedia> {
  if (!isPinterestUrl(rawUrl)) {
    throw new Error("That doesn't look like a public Pinterest link.");
  }

  let res: Response;
  try {
    res = await fetch(rawUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
  } catch {
    throw new Error("Couldn't reach Pinterest. Check the link and try again.");
  }

  if (res.status === 404) throw new Error("That pin no longer exists on Pinterest.");
  if (res.status === 403 || res.status === 429) {
    throw new Error("Pinterest is rate-limiting requests right now. Try again in a minute.");
  }
  if (!res.ok) throw new Error(`Pinterest returned an unexpected response (${res.status}).`);

  const html = await res.text();

  const title =
    meta(html, "og:title") ??
    firstMatch(html, /<title[^>]*>([^<]{2,160})<\/title>/i) ??
    null;
  const authorName = firstMatch(html, /"full_name"\s*:\s*"([^"]{1,80})"/) ?? null;

  const videoUrl = meta(html, "og:video") ?? meta(html, "og:video:url") ?? pickQualityUrl(html, quality);
  const ogImage = meta(html, "og:image");

  const width = Number(meta(html, "og:image:width") ?? "") || null;
  const height = Number(meta(html, "og:image:height") ?? "") || null;
  const duration = Number(firstMatch(html, /"duration"\s*:\s*(\d+)/) ?? "") || null;
  const cleanTitle = title?.replace(/\s*\|\s*Pinterest\s*$/i, "").trim() || null;

  if (videoUrl) {
    const seen = new Set<string>();
    const variants: MediaVariant[] = [];
    for (const key of VIDEO_KEYS) {
      const url = videoRendition(html, key);
      if (!url || seen.has(url) || !/\.mp4/i.test(url)) continue;
      seen.add(url);
      variants.push({
        id: key,
        label: `MP4 · ${key === "V_720P" ? "720p" : "Best available"}`,
        mediaType: "video",
        url,
        width: null,
        height: null,
      });
    }
    if (!seen.has(videoUrl)) {
      variants.unshift({
        id: "default",
        label: "MP4 · Original",
        mediaType: "video",
        url: videoUrl,
        width: null,
        height: null,
      });
    }
    if (ogImage) {
      variants.push({
        id: "poster",
        label: "JPG · Cover image",
        mediaType: "image",
        url: resizeImage(ogImage, "originals"),
        width,
        height,
      });
    }

    return {
      title: cleanTitle,
      authorName,
      mediaType: "video",
      mediaUrl: videoUrl,
      previewUrl: ogImage,
      width,
      height,
      durationSeconds: duration ? duration / 1000 : null,
      fileSize: await headSize(videoUrl),
      variants,
    };
  }

  if (!ogImage) {
    throw new Error(
      "No downloadable media found — the pin may be private, age-restricted, or a board link.",
    );
  }

  const mediaUrl = upgradeImageQuality(ogImage, quality);
  const isGif = /\.gif(\?|$)/i.test(mediaUrl) || /"is_gif"\s*:\s*true/i.test(html);

  return {
    title: cleanTitle,
    authorName,
    mediaType: isGif ? "gif" : "image",
    mediaUrl,
    previewUrl: ogImage,
    width,
    height,
    durationSeconds: null,
    fileSize: (await headSize(mediaUrl)) ?? (await headSize(ogImage)),
    variants: imageVariants(ogImage, isGif, width, height),
  };
}
