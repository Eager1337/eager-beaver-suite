import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Copy, Download, Loader2, MessageCircle, Image as ImageIcon, TrendingUp, Type, Send, Clapperboard, Upload, X, Share2, Music } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { makeCaptions, makePicture, trendIdeas, chatHelper } from "@/lib/ai-tools.functions";
import { startAdVideo, checkAdVideo } from "@/lib/ad-video.functions";
import { fetchBlob, saveBlob, shareFile, extractAudioWav } from "@/lib/media-share";

type Tab = "captions" | "picture" | "trends" | "chat" | "advideo";

export const Route = createFileRoute("/ai")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => ({
    tab: ["captions", "picture", "trends", "chat", "advideo"].includes(s.tab as string) ? (s.tab as Tab) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "AI Studio — EagerBeaver" },
      { name: "description", content: "Free AI tools for Sierra Leone creators: captions and hashtags in English or Krio, picture maker, trend ideas and a chat helper." },
      { property: "og:title", content: "AI Studio — EagerBeaver" },
      { property: "og:description", content: "Captions in Krio, AI pictures, trend ideas and a friendly chat helper." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AiPage,
});

const TABS: { key: Tab; label: string; icon: typeof Type }[] = [
  { key: "captions", label: "Captions & hashtags", icon: Type },
  { key: "picture", label: "Picture maker", icon: ImageIcon },
  { key: "trends", label: "Trend ideas", icon: TrendingUp },
  { key: "chat", label: "Chat helper", icon: MessageCircle },
  { key: "advideo", label: "Ad video", icon: Clapperboard },
];

const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("Copied"); };
const field = "w-full rounded-xl border border-border bg-card/40 px-4 py-3 text-sm outline-none focus:border-primary";
const btn = "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50";

function AiPage() {
  const { tab } = Route.useSearch();
  const nav = Route.useNavigate();
  const active = tab ?? "captions";
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="font-display text-4xl md:text-5xl font-bold">AI <span className="text-gradient">Studio</span></h1>
        <p className="mt-2 text-muted-foreground">Smart tools for Salone creators — free to try.</p>
        <div className="mt-8 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => nav({ search: { tab: t.key } })}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${active === t.key ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>
        <div className="mt-8 glass rounded-2xl p-5 md:p-8">
          {active === "captions" && <Captions />}
          {active === "picture" && <Picture />}
          {active === "trends" && <Trends />}
          {active === "chat" && <Chat />}
          {active === "advideo" && <AdVideo />}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Captions() {
  const fn = useServerFn(makeCaptions);
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState<"English" | "Krio" | "Both">("Both");
  const [tone, setTone] = useState("fun");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ captions: string[]; hashtags: string[] } | null>(null);
  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setRes(null);
    try { const r = await fn({ data: { topic, language, tone } }); r.ok ? setRes(r) : toast.error(r.error); }
    catch { toast.error("Please describe your post in at least 3 letters."); }
    setBusy(false);
  }
  return (
    <form onSubmit={go} className="space-y-4">
      <textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={3} placeholder="What's your post about? e.g. Sunset at Lumley Beach with friends" className={field} />
      <div className="flex flex-wrap gap-3">
        <select value={language} onChange={(e) => setLanguage(e.target.value as typeof language)} className={`${field} w-auto`}>
          <option>English</option><option>Krio</option><option value="Both">English + Krio</option>
        </select>
        <select value={tone} onChange={(e) => setTone(e.target.value)} className={`${field} w-auto`}>
          {["fun", "inspiring", "professional", "romantic", "funny"].map((t) => <option key={t}>{t}</option>)}
        </select>
        <button disabled={busy || topic.trim().length < 3} className={btn}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Write captions</button>
      </div>
      {res && (
        <div className="space-y-3 animate-fade-up">
          {res.captions.map((c, i) => (
            <div key={i} className="flex items-start justify-between gap-3 rounded-xl border border-border p-4 text-sm">
              <p>{c}</p>
              <button type="button" aria-label="Copy caption" onClick={() => copy(c)} className="shrink-0 text-muted-foreground hover:text-foreground"><Copy className="h-4 w-4" /></button>
            </div>
          ))}
          <div className="rounded-xl border border-border p-4">
            <p className="text-sm text-primary">{res.hashtags.join(" ")}</p>
            <button type="button" onClick={() => copy(res.hashtags.join(" "))} className="mt-2 text-xs text-muted-foreground hover:text-foreground">Copy hashtags</button>
          </div>
        </div>
      )}
    </form>
  );
}

function Picture() {
  const fn = useServerFn(makePicture);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [img, setImg] = useState<string | null>(null);
  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setImg(null);
    try { const r = await fn({ data: { prompt } }); r.ok ? setImg(r.image) : toast.error(r.error); }
    catch { toast.error("Describe your picture in a few more words."); }
    setBusy(false);
  }
  return (
    <form onSubmit={go} className="space-y-4">
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="e.g. Colourful Freetown street market at golden hour, photo style" className={field} />
      <button disabled={busy || prompt.trim().length < 3} className={btn}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} {busy ? "Making your picture…" : "Make picture"}</button>
      {busy && <div className="aspect-square max-w-md animate-pulse rounded-2xl bg-muted" />}
      {img && (
        <div className="max-w-md space-y-3 animate-fade-up">
          <img src={img} alt={prompt} className="w-full rounded-2xl" />
          <a href={img} download="eagerbeaver-ai.png" className={btn}><Download className="h-4 w-4" /> Download</a>
        </div>
      )}
    </form>
  );
}

function Trends() {
  const fn = useServerFn(trendIdeas);
  const [niche, setNiche] = useState("");
  const [busy, setBusy] = useState(false);
  const [ideas, setIdeas] = useState<{ title: string; why: string; format: string; hook: string }[] | null>(null);
  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setIdeas(null);
    try { const r = await fn({ data: { niche } }); r.ok ? setIdeas(r.ideas) : toast.error(r.error); }
    catch { toast.error("Type your topic first."); }
    setBusy(false);
  }
  return (
    <form onSubmit={go} className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Your topic: fashion, food, music, comedy…" className={`${field} flex-1`} />
        <button disabled={busy || niche.trim().length < 2} className={btn}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Get ideas</button>
      </div>
      {ideas && (
        <div className="grid gap-3 md:grid-cols-2 animate-fade-up">
          {ideas.map((i, k) => (
            <div key={k} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-2"><p className="font-semibold">{i.title}</p><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{i.format}</span></div>
              <p className="mt-1 text-sm text-muted-foreground">{i.why}</p>
              <p className="mt-2 text-sm italic">“{i.hook}”</p>
            </div>
          ))}
        </div>
      )}
    </form>
  );
}

type Msg = { role: "user" | "assistant"; content: string };
function Chat() {
  const fn = useServerFn(chatHelper);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: "Kushe! I'm Beaver 🦫. Ask me how to download something, write a caption, or find a page." }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), [msgs, busy]);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim(); if (!text || busy) return;
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next); setInput(""); setBusy(true);
    try {
      const r = await fn({ data: { messages: next.slice(1).slice(-30) } });
      setMsgs([...next, { role: "assistant", content: r.ok ? r.reply : `⚠️ ${r.error}` }]);
    } catch { setMsgs([...next, { role: "assistant", content: "⚠️ I couldn't answer just now. Please try again." }]); }
    setBusy(false);
  }
  return (
    <div className="flex h-[520px] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
            {m.role === "user"
              ? <div className="max-w-[80%] rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground">{m.content}</div>
              : <div className="prose prose-sm max-w-none text-foreground dark:prose-invert"><ReactMarkdown>{m.content}</ReactMarkdown></div>}
          </div>
        ))}
        {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <div ref={end} />
      </div>
      <form onSubmit={send} className="mt-4 flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask Beaver anything…" className={`${field} flex-1`} />
        <button aria-label="Send" disabled={busy || !input.trim()} className={btn}><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );
}

function AdVideo() {
  const start = useServerFn(startAdVideo);
  const check = useServerFn(checkAdVideo);
  const [brand, setBrand] = useState("");
  const [product, setProduct] = useState("");
  const [tagline, setTagline] = useState("");
  const [style, setStyle] = useState<"luxury" | "bold" | "minimal" | "neon" | "afro-vibrant">("bold");
  const [aspect, setAspect] = useState<"16:9" | "9:16">("9:16");
  const [duration, setDuration] = useState<"10s" | "15s">("15s");
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current); }, []);

  function addImages(files: FileList | null) {
    if (!files) return;
    const room = 3 - images.length;
    const picks = Array.from(files).slice(0, room);
    for (const f of picks) {
      if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { toast.error("Only PNG, JPG or WebP photos."); continue; }
      if (f.size > 4 * 1024 * 1024) { toast.error(`"${f.name}" is over 4 MB.`); continue; }
      const reader = new FileReader();
      reader.onload = () => setImages((cur) => (cur.length < 3 ? [...cur, String(reader.result)] : cur));
      reader.readAsDataURL(f);
    }
  }

  async function poll(id: string, extend: boolean) {
    try {
      const r = await check({ data: { id, extend } });
      if (r.status === "failed") { toast.error(r.error ?? "Video failed."); setBusy(false); return; }
      if (r.nextId) {
        setStage("Adding the final 5 seconds…");
        setProgress(0);
        pollRef.current = setTimeout(() => poll(r.nextId!, false), 6000);
        return;
      }
      if (r.status === "completed" && r.videoUrl) {
        setVideoUrl(r.videoUrl);
        setProgress(100);
        setBusy(false);
        toast.success("Your advert is ready!");
        return;
      }
      setProgress(r.progress);
      pollRef.current = setTimeout(() => poll(id, extend), 6000);
    } catch {
      toast.error("Lost connection while checking your video. Try again.");
      setBusy(false);
    }
  }

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setVideoUrl(null); setProgress(0);
    setStage("Writing your advert script…");
    try {
      const r = await start({ data: { brand, product, tagline, style, aspect, duration, images } });
      if (!r.ok) { toast.error(r.error); setBusy(false); return; }
      setStage("Filming your advert (this takes 1–3 minutes)…");
      pollRef.current = setTimeout(() => poll(r.id, r.extend), 6000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(/auth|sign|token|401/i.test(msg) ? "Please sign in first — adverts are saved to your account." : "Couldn't start the video. Check your details and try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={go} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload up to 3 product photos, describe your offer, and get a premium motion-graphics advert with music. Sign in required — your video is saved to your account.
      </p>

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Product photos (up to 3, optional)</p>
        <div className="flex flex-wrap items-center gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl border border-border">
              <img src={img} alt={`Product ${i + 1}`} className="h-full w-full object-cover" />
              <button type="button" aria-label="Remove photo" onClick={() => setImages(images.filter((_, k) => k !== i))}
                className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5"><X className="h-3 w-3" /></button>
            </div>
          ))}
          {images.length < 3 && (
            <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary">
              <Upload className="h-5 w-5" />
              <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={(e) => addImages(e.target.files)} />
            </label>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Brand name, e.g. Luspa Banks" className={field} />
        <input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Tagline (optional)" className={field} />
      </div>
      <textarea value={product} onChange={(e) => setProduct(e.target.value)} rows={2} placeholder="What are you advertising? e.g. Handmade shea butter soap, Le 25, delivery in Freetown" className={field} />

      <div className="flex flex-wrap gap-3">
        <select value={style} onChange={(e) => setStyle(e.target.value as typeof style)} className={`${field} w-auto`}>
          <option value="luxury">Luxury</option><option value="bold">Bold</option><option value="minimal">Minimal</option>
          <option value="neon">Neon</option><option value="afro-vibrant">Afro-vibrant</option>
        </select>
        <select value={aspect} onChange={(e) => setAspect(e.target.value as typeof aspect)} className={`${field} w-auto`}>
          <option value="9:16">Tall (TikTok / Reels)</option><option value="16:9">Wide (YouTube)</option>
        </select>
        <select value={duration} onChange={(e) => setDuration(e.target.value as typeof duration)} className={`${field} w-auto`}>
          <option value="10s">10 seconds</option><option value="15s">15 seconds</option>
        </select>
        <button disabled={busy || brand.trim().length < 2 || product.trim().length < 3} className={btn}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clapperboard className="h-4 w-4" />} Make my advert
        </button>
      </div>

      {busy && (
        <div className="space-y-2 animate-fade-up">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-gradient-primary transition-all" style={{ width: `${Math.max(progress, 5)}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">{stage}</p>
        </div>
      )}

      {videoUrl && <AdResult url={videoUrl} />}
    </form>
  );
}

function AdResult({ url }: { url: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const getVideo = async () => (blobRef.current ??= await fetchBlob(url));
  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try { await fn(); } catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong."); }
    setBusy(null);
  }
  const small = "inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:border-primary disabled:opacity-50";
  const spin = (k: string) => busy === k && <Loader2 className="h-4 w-4 animate-spin" />;
  return (
    <div className="max-w-sm space-y-3 animate-fade-up">
      <video src={url} controls autoPlay loop playsInline className="w-full rounded-2xl border border-border" />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={!!busy} className={btn} onClick={() => run("dv", async () => saveBlob(await getVideo(), "eagerbeaver-advert.mp4"))}>
          {spin("dv") || <Download className="h-4 w-4" />} Video
        </button>
        <button type="button" disabled={!!busy} className={small} onClick={() => run("sv", async () => {
          const r = await shareFile(await getVideo(), "eagerbeaver-advert.mp4", "My EagerBeaver advert");
          if (r === "saved") toast.info("Sharing files isn't supported here, so the video was saved instead.");
        })}>
          {spin("sv") || <Share2 className="h-4 w-4" />} Share video
        </button>
        <button type="button" disabled={!!busy} className={small} onClick={() => run("da", async () => saveBlob(await extractAudioWav(await getVideo()), "eagerbeaver-advert-sound.wav"))}>
          {spin("da") || <Music className="h-4 w-4" />} Audio
        </button>
        <button type="button" disabled={!!busy} className={small} onClick={() => run("sa", async () => {
          const r = await shareFile(await extractAudioWav(await getVideo()), "eagerbeaver-advert-sound.wav", "Advert sound");
          if (r === "saved") toast.info("Sharing files isn't supported here, so the sound was saved instead.");
        })}>
          {spin("sa") || <Share2 className="h-4 w-4" />} Share audio
        </button>
      </div>
      <p className="text-xs text-muted-foreground">Share sends the real file — on your phone pick WhatsApp, TikTok, Instagram and more.</p>
    </div>
  );
}
