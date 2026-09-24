import { createFileRoute, Link } from "@tanstack/react-router";
import { PinterestDownloader } from "@/components/pinterest-downloader";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { categories, testimonials, faqs } from "@/lib/mock-data";
import {
  Sparkles, Wand2, FolderHeart, Zap, Shield, Layers,
  TrendingUp, ChevronRight, Check, Star,
} from "lucide-react";
import { useState } from "react";
import owner from "@/assets/owner.jpg.asset.json";
import freetown from "@/assets/sl-freetown.jpg";
import beach from "@/assets/sl-beach.jpg";
import market from "@/assets/sl-market.jpg";

const slMedia: { title: string; creator: string; src: string; video?: string }[] = [
  { title: "Freetown at golden hour", creator: "@salone.views", src: freetown },
  { title: "Founder of EagerBeaver", creator: "@eagerbeaver", src: owner.url },
  { title: "River No. 2 Beach", creator: "@visit.salone", src: beach },
  { title: "Market day in Freetown", creator: "@sweet.salone", src: market },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EagerBeaver — Pinterest, YouTube & more downloader for Sierra Leone" },
      { name: "description", content: "Save Pinterest pins, videos and GIFs in original quality. Built for Sierra Leoneans, no login needed." },
      { property: "og:title", content: "EagerBeaver — media downloader for Sierra Leone" },
      { property: "og:description", content: "Save Pinterest pins, videos and GIFs in original quality, free." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Hero />
      <TrendingSection />
      <Features />
      <CategoriesSection />
      <Stats />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTA />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
      <div
        className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full blur-3xl opacity-30 animate-float-slow"
        style={{ background: "var(--gradient-primary)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full blur-3xl opacity-20 animate-float-slow-2"
        style={{ background: "linear-gradient(135deg, oklch(0.55 0.2 260), oklch(0.65 0.24 20))" }}
      />

      <div className="relative mx-auto max-w-6xl px-4 md:px-6 pt-20 md:pt-28 pb-16 md:pb-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-4 py-1.5 text-xs md:text-sm text-muted-foreground animate-fade-up">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Now with AI captions, hashtags & smart collections
        </div>

        <h1 className="mt-6 font-display text-5xl md:text-7xl font-bold tracking-tight animate-fade-up" style={{ animationDelay: "60ms" }}>
          Pinterest, but{" "}
          <span className="text-gradient">powerful.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base md:text-lg text-muted-foreground animate-fade-up" style={{ animationDelay: "120ms" }}>
          Download pins, videos, boards and GIFs in original quality.
          Curate them into beautiful collections. Let AI title, tag and enhance them.
        </p>

        <div className="mx-auto mt-10 max-w-3xl animate-fade-up" style={{ animationDelay: "180ms" }}>
          <PinterestDownloader />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground animate-fade-up" style={{ animationDelay: "240ms" }}>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> No signup required</span>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Original quality</span>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Batch download</span>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> No watermarks</span>
        </div>
      </div>
    </section>
  );
}

function TrendingSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 md:px-6 py-16 md:py-20">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/60 px-3 py-1 text-xs font-medium">
            <TrendingUp className="h-3 w-3" /> Trending now
          </div>
          <h2 className="mt-3 font-display text-3xl md:text-4xl font-semibold">
            What creators are saving today
          </h2>
        </div>
        <Link to="/downloader" className="hidden md:inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          Explore more <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="columns-2 md:columns-3 lg:columns-4 gap-4 [column-fill:_balance]">
        {slMedia.map((m, i) => (
          <div key={m.title} className="mb-4 break-inside-avoid group animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="relative overflow-hidden rounded-2xl shadow-elegant transition-transform group-hover:-translate-y-1">
              {m.video ? (
                <video src={m.video} poster={m.src} autoPlay muted loop playsInline className="w-full object-cover" />
              ) : (
                <img src={m.src} alt={m.title} loading="lazy" className="w-full object-cover animate-kenburns" />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-3">
                <div className="text-xs font-semibold text-foreground">{m.title}</div>
                <div className="text-[10px] text-muted-foreground">{m.creator}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const features = [
    { icon: Zap, title: "Original quality", desc: "Pins, videos, GIFs, boards, carousels & stories in 720p, 1080p or original." },
    { icon: Wand2, title: "AI-powered", desc: "Auto captions, hashtags, SEO keywords, image upscaler & background remover." },
    { icon: FolderHeart, title: "Smart collections", desc: "Save into folders and boards. Tag, filter, share — publicly or privately." },
    { icon: Layers, title: "Batch downloads", desc: "Grab an entire board as a ZIP. Preview before saving. Zero watermarks." },
    { icon: Shield, title: "Private by default", desc: "Anonymous downloads are never persisted. Your history is yours." },
    { icon: Sparkles, title: "Delightful UX", desc: "Handcrafted animations, keyboard shortcuts, dark & light themes." },
  ];
  return (
    <section id="features" className="mx-auto max-w-7xl px-4 md:px-6 py-16 md:py-24">
      <div className="max-w-2xl mb-12">
        <h2 className="font-display text-3xl md:text-5xl font-semibold tracking-tight">
          Everything you need to <span className="text-gradient">curate</span> better.
        </h2>
        <p className="mt-4 text-muted-foreground">
          Not just a downloader — a complete workspace for Pinterest research and moodboards.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="glass rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-glow">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-primary shadow-glow">
              <f.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="mt-4 font-display text-lg font-semibold">{f.title}</div>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CategoriesSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 md:px-6 py-8 md:py-12">
      <div className="flex flex-wrap gap-2 justify-center">
        {categories.map((c, i) => (
          <button
            key={c}
            className="rounded-full border border-border bg-card/40 px-4 py-1.5 text-sm text-muted-foreground transition-all hover:text-foreground hover:border-primary/50 hover:bg-accent/60 animate-fade-up"
            style={{ animationDelay: `${i * 20}ms` }}
          >
            {c}
          </button>
        ))}
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    { value: "12M+", label: "Pins downloaded" },
    { value: "180+", label: "Countries served" },
    { value: "4.9★", label: "User rating" },
    { value: "99.9%", label: "Uptime" },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 md:px-6 py-16">
      <div className="glass rounded-3xl p-8 md:p-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="font-display text-3xl md:text-5xl font-bold text-gradient">{s.value}</div>
            <div className="mt-2 text-xs md:text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="mx-auto max-w-7xl px-4 md:px-6 py-16 md:py-24">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="font-display text-3xl md:text-5xl font-semibold">Loved by curators</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {testimonials.map((t) => (
          <figure key={t.name} className="glass rounded-2xl p-6">
            <div className="flex gap-0.5 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
              ))}
            </div>
            <blockquote className="text-sm leading-relaxed">"{t.quote}"</blockquote>
            <figcaption className="mt-4 text-xs">
              <div className="font-semibold">{t.name}</div>
              <div className="text-muted-foreground">{t.role}</div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  const tiers = [
    {
      name: "Free",
      price: "$0",
      desc: "For casual saving",
      features: ["10 downloads / day", "1080p quality", "Basic history", "Community support"],
      cta: "Start free",
      highlight: false,
    },
    {
      name: "Pro",
      price: "$8",
      desc: "For serious curators",
      features: ["Unlimited downloads", "Original quality", "Batch downloads", "AI tools", "Priority servers", "No ads"],
      cta: "Go Pro",
      highlight: true,
    },
    {
      name: "Studio",
      price: "$24",
      desc: "For teams & agencies",
      features: ["Everything in Pro", "Team collections", "Advanced analytics", "API access", "White-label exports"],
      cta: "Contact sales",
      highlight: false,
    },
  ];
  return (
    <section id="pricing" className="mx-auto max-w-7xl px-4 md:px-6 py-16 md:py-24">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="font-display text-3xl md:text-5xl font-semibold">Simple pricing</h2>
        <p className="mt-3 text-muted-foreground">Start free. Upgrade when you're ready.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`rounded-3xl p-8 ${
              t.highlight
                ? "bg-gradient-primary text-primary-foreground shadow-glow scale-[1.02]"
                : "glass"
            }`}
          >
            <div className="text-sm font-semibold opacity-80">{t.name}</div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-display text-4xl font-bold">{t.price}</span>
              <span className="text-sm opacity-70">/mo</span>
            </div>
            <p className="mt-1 text-sm opacity-70">{t.desc}</p>
            <ul className="mt-6 space-y-2 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className={`mt-8 block text-center rounded-full py-2.5 text-sm font-semibold transition-transform hover:scale-[1.02] ${
                t.highlight
                  ? "bg-background text-foreground"
                  : "bg-gradient-primary text-primary-foreground shadow-glow"
              }`}
            >
              {t.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 md:px-6 py-16 md:py-24">
      <div className="text-center mb-10">
        <h2 className="font-display text-3xl md:text-5xl font-semibold">Questions</h2>
      </div>
      <div className="space-y-3">
        {faqs.map((f, i) => (
          <div key={f.q} className="glass rounded-2xl overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between p-5 text-left"
            >
              <span className="font-medium">{f.q}</span>
              <ChevronRight
                className={`h-4 w-4 text-muted-foreground transition-transform ${open === i ? "rotate-90" : ""}`}
              />
            </button>
            {open === i && (
              <div className="px-5 pb-5 -mt-1 text-sm text-muted-foreground animate-fade-up">
                {f.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="mx-auto max-w-7xl px-4 md:px-6 py-16 md:py-24">
      <div
        className="relative overflow-hidden rounded-3xl p-10 md:p-16 text-center shadow-glow"
        style={{ background: "var(--gradient-primary)" }}
      >
        <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{
          background: "radial-gradient(circle at 30% 20%, white, transparent 40%), radial-gradient(circle at 70% 80%, white, transparent 40%)"
        }} />
        <div className="relative">
          <h2 className="font-display text-3xl md:text-5xl font-bold text-primary-foreground">
            Start curating in 30 seconds.
          </h2>
          <p className="mt-3 text-primary-foreground/90 max-w-xl mx-auto">
            Sign up free — no credit card. Import your first board and see the magic.
          </p>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-background px-6 py-3 text-sm font-semibold text-foreground transition-transform hover:scale-105"
          >
            Create free account <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
