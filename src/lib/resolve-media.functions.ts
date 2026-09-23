import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ResolveSchema = z.object({
  url: z.string().url(),
  quality: z.enum(["720p", "1080p", "original"]).default("original"),
});

export type ResolveResult =
  | {
      ok: true;
      title: string | null;
      authorName: string | null;
      mediaType: "image" | "video" | "gif";
      mediaUrl: string;
      previewUrl: string | null;
      width: number | null;
      height: number | null;
      durationSeconds: number | null;
      fileSize: number | null;
      variants: {
        id: string;
        label: string;
        mediaType: "image" | "video" | "gif";
        url: string;
        width: number | null;
        height: number | null;
      }[];
    }
  | { ok: false; error: string };

/** Public resolver — anyone can paste a link and get media back, no sign-in. */
export const resolveMedia = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ResolveSchema.parse(input))
  .handler(async ({ data }): Promise<ResolveResult> => {
    const { resolvePinterestMedia } = await import("./pinterest.server");
    try {
      const media = await resolvePinterestMedia(data.url, data.quality);
      return { ok: true, ...media };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Couldn't fetch that pin.",
      };
    }
  });
