import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type SocialResult =
  | { ok: true; platform: "youtube"; title: string; author: string; videoId: string; thumbs: { label: string; url: string }[] }
  | { ok: false; error: string };

function ytId(u: string) {
  const m = u.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/);
  return m?.[1] ?? null;
}

export const resolveSocial = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ url: z.string().url().max(500) }).parse(i))
  .handler(async ({ data }): Promise<SocialResult> => {
    if (/instagram\.com/i.test(data.url)) {
      return { ok: false, error: "Instagram downloads are coming soon — Instagram blocks direct saving without a partner service." };
    }
    const id = ytId(data.url);
    if (!id) return { ok: false, error: "Paste a YouTube or YouTube Shorts link." };
    const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`);
    if (!r.ok) return { ok: false, error: "That video is private or doesn't exist." };
    const j = (await r.json()) as { title: string; author_name: string };
    return {
      ok: true,
      platform: "youtube",
      title: j.title,
      author: j.author_name,
      videoId: id,
      thumbs: [
        { label: "HD cover", url: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` },
        { label: "High", url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` },
        { label: "Medium", url: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` },
      ],
    };
  });
