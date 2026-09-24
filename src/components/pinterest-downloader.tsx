import { useEffect, useState } from "react";
import {
  Clipboard,
  Download,
  Loader2,
  Link as LinkIcon,
  AlertTriangle,
  X,
  Layers,
  Sparkles,
  Copy,
  CheckCircle2,
  History,
  Youtube,
} from "lucide-react";
import { SocialMode } from "@/components/social-downloader";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { resolveMedia, type ResolveResult } from "@/lib/resolve-media.functions";
import { analyzePin, type AnalyzeResult } from "@/lib/analyze-pin.functions";

const pinUrl = z
  .string()
  .trim()
  .url({ message: "Please paste a valid URL" })
  .refine((v) => /pinterest\.[a-z.]+|pin\.it/i.test(v), {
    message: "That doesn't look like a Pinterest link",
  });

type Resolved = Extract<ResolveResult, { ok: true }>;
type Variant = Resolved["variants"][number];
type Mode = "single" | "batch" | "ai" | "social";

type LocalItem = {
  id: string;
  title: string | null;
  mediaType: string;
  label: string;
  preview: string | null;
  mediaUrl: string;
  at: number;
};

const LOCAL_KEY = "eb-local-downloads";

function proxyUrl(mediaUrl: string, title: string | null) {
  const name = (title ?? "eagerbeaver").slice(0, 60);
  return `/api/public/media?url=${encodeURIComponent(mediaUrl)}&filename=${encodeURIComponent(name)}`;
}

function prettySize(bytes: number | null) {
  if (!bytes) return null;
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

function readLocal(): LocalItem[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]") as LocalItem[];
  } catch {
    return [];
  }
}

function triggerDownload(href: string) {
  const a = document.createElement("a");
  a.href = href;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function useSaveDownload() {
  const qc = useQueryClient();
  const [local, setLocal] = useState<LocalItem[]>([]);
  useEffect(() => setLocal(readLocal()), []);

  async function save(media: Resolved, variant: Variant, sourceUrl: string) {
    const item: LocalItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: media.title,
      mediaType: variant.mediaType,
      label: variant.label,
      preview: media.previewUrl,
      mediaUrl: variant.url,
      at: Date.now(),
    };
    const next = [item, ...readLocal()].slice(0, 30);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
    setLocal(next);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from("downloads").insert({
      user_id: userData.user.id,
      source_url: sourceUrl,
      quality: variant.id,
      status: "success",
      progress: 100,
      title: media.title,
      author_name: media.authorName,
      media_type: variant.mediaType,
      media_url: variant.url,
      preview_url: media.previewUrl,
      thumbnail_url: media.previewUrl,
      width: variant.width ?? media.width,
      height: variant.height ?? media.height,
      duration_seconds: media.durationSeconds,
      file_size: media.fileSize,
    });
    qc.invalidateQueries({ queryKey: ["downloads"] });
  }

  function clear() {
    localStorage.removeItem(LOCAL_KEY);
    setLocal([]);
  }

  return { save, local, clear };
}

function ResultCard({
  result,
  sourceUrl,
  onSave,
  onRemove,
  onPick,
}: {
  result: Resolved;
  sourceUrl: string;
  onSave: (m: Resolved, v: Variant, src: string) => Promise<void>;
  onRemove?: () => void;
  onPick?: (v: Variant) => void;
}) {
  const variants = result.variants?.length
    ? result.variants
    : [
        {
          id: "default",
          label: result.mediaType.toUpperCase(),
          mediaType: result.mediaType,
          url: result.mediaUrl,
          width: result.width,
          height: result.height,
        },
      ];
  const [vid, setVid] = useState(variants[0]!.id);
  const variant = variants.find((v) => v.id === vid) ?? variants[0]!;
  const [saved, setSaved] = useState(false);

  async function download() {
    triggerDownload(proxyUrl(variant.url, result.title));
    await onSave(result, variant, sourceUrl);
    setSaved(true);
    toast.success("Download started · saved to history");
  }

  return (
    <div className="glass rounded-2xl p-4 md:p-5 shadow-elegant text-left animate-fade-up">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="sm:w-44 shrink-0">
          {result.mediaType === "video" ? (
            <video
              src={result.mediaUrl}
              poster={result.previewUrl ?? undefined}
              controls
              playsInline
              preload="metadata"
              className="w-full rounded-xl bg-muted"
            />
          ) : (
            <img
              src={result.previewUrl ?? result.mediaUrl}
              alt={result.title ?? "Pinterest media"}
              className="w-full rounded-xl object-cover"
            />
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium line-clamp-2">{result.title ?? "Pinterest media"}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {[
                  result.authorName,
                  result.mediaType.toUpperCase(),
                  result.width && result.height ? `${result.width}×${result.height}` : null,
                  result.durationSeconds ? `${Math.round(result.durationSeconds)}s` : null,
                  prettySize(result.fileSize),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            {onRemove && (
              <button type="button" onClick={onRemove} aria-label="Remove">
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Format & quality</p>
            <div className="flex flex-wrap gap-1.5">
              {variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setVid(v.id);
                    onPick?.(v);
                  }}
                  className={`rounded-full px-3 py-1 text-xs transition-colors ${
                    v.id === variant.id
                      ? "bg-gradient-primary text-primary-foreground"
                      : "border border-border hover:bg-accent/60"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={download}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
            >
              {saved ? <CheckCircle2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
              Download {variant.mediaType === "video" ? "MP4" : variant.mediaType === "gif" ? "GIF" : "image"}
            </button>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(variant.url);
                toast.success("Direct link copied");
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent/60 transition-colors"
            >
              <Copy className="h-4 w-4" /> Copy link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PinterestDownloader({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<Mode>("single");
  const { save, local, clear } = useSaveDownload();

  const tabs: Array<[Mode, string, typeof LinkIcon]> = [
    ["single", "Single", LinkIcon],
    ["batch", "Batch", Layers],
    ["ai", "AI describe", Sparkles],
    ["social", "YouTube & Instagram", Youtube],
  ];

  return (
    <div className={compact ? "" : "relative"}>
      <div className="mb-3 inline-flex flex-wrap justify-center rounded-full border border-border bg-card/40 p-1">
        {tabs.map(([m, label, Icon]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              mode === m ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {mode === "single" && <SingleMode onSave={save} />}
      {mode === "batch" && <BatchMode onSave={save} />}
      {mode === "ai" && <AiMode />}
      {mode === "social" && <SocialMode />}

      {local.length > 0 && (
        <div className="mt-8 text-left">
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <History className="h-4 w-4" /> Your saved downloads
            </h3>
            <button type="button" onClick={clear} className="text-xs text-muted-foreground hover:text-foreground">
              Clear
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {local.slice(0, 12).map((i) => (
              <a
                key={i.id}
                href={proxyUrl(i.mediaUrl, i.title)}
                title={`${i.title ?? "Pin"} · ${i.label}`}
                className="group relative aspect-square overflow-hidden rounded-xl bg-muted"
              >
                {i.preview && <img src={i.preview} alt={i.title ?? "Saved pin"} className="h-full w-full object-cover" />}
                <span className="absolute bottom-1 left-1 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium">
                  {i.mediaType.toUpperCase()}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Every download is saved on this device. Signed in? It's also saved to your{" "}
        <span className="text-foreground font-medium">Downloads</span>.
      </p>
    </div>
  );
}

function SingleMode({ onSave }: { onSave: (m: Resolved, v: Variant, s: string) => Promise<void> }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ r: Resolved; src: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const run = useServerFn(resolveMedia);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const parsed = pinUrl.safeParse(url);
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Invalid URL");
    setBusy(true);
    setErrorMsg(null);
    setResult(null);
    try {
      const res = await run({ data: { url: parsed.data, quality: "original" } });
      if (!res.ok) {
        setErrorMsg(res.error);
        return;
      }
      setResult({ r: res, src: parsed.data });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={submit} className="glass rounded-2xl p-2 md:p-3 shadow-elegant">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-xl bg-background/60 px-4 py-3">
            <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a Pinterest link — pin, video, GIF…"
              className="flex-1 bg-transparent text-sm md:text-base outline-none placeholder:text-muted-foreground"
              disabled={busy}
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  setUrl(await navigator.clipboard.readText());
                } catch {
                  toast.error("Clipboard access blocked");
                }
              }}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60"
            >
              <Clipboard className="h-3.5 w-3.5" /> Paste
            </button>
          </div>
          <button
            type="submit"
            disabled={busy || !url}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {busy ? "Fetching…" : "Fetch"}
          </button>
        </div>
      </form>
      {busy && <div className="mt-6 h-32 glass rounded-2xl animate-pulse" />}
      {errorMsg && !busy && <ErrorBox msg={errorMsg} onClose={() => setErrorMsg(null)} />}
      {result && !busy && (
        <div className="mt-6">
          <ResultCard result={result.r} sourceUrl={result.src} onSave={onSave} />
        </div>
      )}
    </>
  );
}

type BatchItem = { src: string; state: "loading" | "ok" | "error"; r?: Resolved; error?: string; pick?: Variant };

function BatchMode({ onSave }: { onSave: (m: Resolved, v: Variant, s: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const [items, setItems] = useState<BatchItem[]>([]);
  const [busy, setBusy] = useState(false);
  const run = useServerFn(resolveMedia);

  async function resolveAll() {
    const urls = Array.from(new Set(text.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)));
    const valid = urls.filter((u) => pinUrl.safeParse(u).success).slice(0, 20);
    if (!valid.length) return toast.error("Paste at least one Pinterest link");
    if (valid.length < urls.length) toast.message(`Skipped ${urls.length - valid.length} invalid link(s)`);
    setBusy(true);
    setItems(valid.map((src) => ({ src, state: "loading" })));
    await Promise.all(
      valid.map(async (src, idx) => {
        try {
          const res = await run({ data: { url: src, quality: "original" } });
          setItems((prev) =>
            prev.map((it, i) =>
              i === idx ? (res.ok ? { src, state: "ok", r: res } : { src, state: "error", error: res.error }) : it,
            ),
          );
        } catch (e) {
          setItems((prev) =>
            prev.map((it, i) =>
              i === idx ? { src, state: "error", error: e instanceof Error ? e.message : "Failed" } : it,
            ),
          );
        }
      }),
    );
    setBusy(false);
  }

  const ready = items.filter((i) => i.state === "ok" && i.r);

  async function downloadAll() {
    for (const it of ready) {
      const r = it.r!;
      const v = it.pick ?? r.variants?.[0] ?? {
        id: "default",
        label: r.mediaType,
        mediaType: r.mediaType,
        url: r.mediaUrl,
        width: r.width,
        height: r.height,
      };
      triggerDownload(proxyUrl(v.url, r.title));
      await onSave(r, v, it.src);
      await new Promise((res) => setTimeout(res, 700));
    }
    toast.success(`${ready.length} downloads started · saved to history`);
  }

  return (
    <>
      <div className="glass rounded-2xl p-3 shadow-elegant text-left">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder={"Paste several Pinterest links — one per line (up to 20)"}
          className="w-full resize-y rounded-xl bg-background/60 p-3 text-sm outline-none placeholder:text-muted-foreground"
        />
        <div className="mt-2 flex flex-wrap gap-2 justify-end">
          {ready.length > 1 && (
            <button
              type="button"
              onClick={downloadAll}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent/60"
            >
              <Download className="h-4 w-4" /> Download all ({ready.length})
            </button>
          )}
          <button
            type="button"
            onClick={resolveAll}
            disabled={busy || !text.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
            {busy ? "Fetching…" : "Fetch all"}
          </button>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {items.map((it, i) =>
          it.state === "loading" ? (
            <div key={i} className="glass rounded-2xl p-4 text-left text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> <span className="truncate">{it.src}</span>
            </div>
          ) : it.state === "error" ? (
            <ErrorBox
              key={i}
              msg={`${it.src} — ${it.error}`}
              onClose={() => setItems((p) => p.filter((_, j) => j !== i))}
            />
          ) : (
            <ResultCard
              key={i}
              result={it.r!}
              sourceUrl={it.src}
              onSave={onSave}
              onPick={(v) => setItems((p) => p.map((x, j) => (j === i ? { ...x, pick: v } : x)))}
              onRemove={() => setItems((p) => p.filter((_, j) => j !== i))}
            />
          ),
        )}
      </div>
    </>
  );
}

function AiMode() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Extract<AnalyzeResult, { ok: true }> | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const run = useServerFn(analyzePin);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = pinUrl.safeParse(url);
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Invalid URL");
    setBusy(true);
    setErrorMsg(null);
    setRes(null);
    try {
      const out = await run({ data: { url: parsed.data } });
      if (out.ok) setRes(out);
      else setErrorMsg(out.error);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={submit} className="glass rounded-2xl p-2 md:p-3 shadow-elegant">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-xl bg-background/60 px-4 py-3">
            <Sparkles className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a pin to get an AI description + hashtags"
              className="flex-1 bg-transparent text-sm md:text-base outline-none placeholder:text-muted-foreground"
              disabled={busy}
            />
          </div>
          <button
            type="submit"
            disabled={busy || !url}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "Analyzing…" : "Analyze"}
          </button>
        </div>
      </form>
      {busy && <p className="mt-6 text-sm text-muted-foreground">Looking at the pin… this can take up to a minute.</p>}
      {errorMsg && !busy && <ErrorBox msg={errorMsg} onClose={() => setErrorMsg(null)} />}
      {res && !busy && (
        <div className="mt-6 glass rounded-2xl p-4 md:p-5 shadow-elegant text-left flex flex-col sm:flex-row gap-4 animate-fade-up">
          <img src={res.previewUrl} alt={res.description} className="sm:w-44 w-full rounded-xl object-cover" />
          <div className="flex-1 space-y-3">
            <p className="font-medium">{res.title ?? "Pinterest pin"}</p>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Accessible description</p>
              <p className="text-sm">{res.description}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {res.hashtags.map((h) => (
                <span key={h} className="rounded-full border border-border px-2.5 py-0.5 text-xs">
                  {h}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(`${res.description}\n\n${res.hashtags.join(" ")}`);
                toast.success("Copied");
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-accent/60"
            >
              <Copy className="h-4 w-4" /> Copy all
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function ErrorBox({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div className="mt-6 flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-left animate-fade-up">
      <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
      <div className="flex-1 text-sm min-w-0">
        <p className="font-medium text-foreground">Couldn't fetch that link</p>
        <p className="text-muted-foreground text-xs mt-1 break-words">{msg}</p>
      </div>
      <button type="button" onClick={onClose} aria-label="Dismiss">
        <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
      </button>
    </div>
  );
}
