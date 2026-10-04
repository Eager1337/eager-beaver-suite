import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — EagerBeaver" },
      { name: "description", content: "EagerBeaver Free and Premium plans: unlimited downloads, batch mode, AI tools and more." },
      { property: "og:title", content: "Pricing — EagerBeaver" },
      { property: "og:description", content: "Compare EagerBeaver Free and Premium plans." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pricing,
});

const plans = [
  { name: "Free", price: "Le 0", note: "forever", features: ["Pinterest, TikTok & web video downloads", "Batch up to 20 links", "Browse & save", "AI captions & chat helper", "Share links"], cta: "Start free", featured: false },
  { name: "Premium", price: "Le 99", note: "per month", features: ["Everything in Free", "No ads", "Faster priority downloads", "Unlimited AI pictures & trend ideas", "Bigger batches (100 links)", "Download history export"], cta: "Join the waitlist", featured: true },
];

function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-12 text-center">
        <h1 className="font-display text-4xl md:text-5xl font-bold">Simple <span className="text-gradient">pricing</span></h1>
        <p className="mt-2 text-muted-foreground">Start free. Upgrade when you're ready.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-2 text-left">
          {plans.map((p) => (
            <div key={p.name} className={`rounded-2xl p-8 ${p.featured ? "bg-gradient-primary text-primary-foreground shadow-glow" : "glass"}`}>
              <p className="text-sm font-semibold uppercase tracking-wide">{p.name}</p>
              <p className="mt-3 text-4xl font-bold">{p.price} <span className="text-base font-normal opacity-80">{p.note}</span></p>
              <ul className="mt-6 space-y-2 text-sm">{p.features.map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 shrink-0" />{f}</li>)}</ul>
              {p.featured
                ? <button onClick={() => toast.success("You're on the list! We'll tell you when Premium opens.")} className="mt-8 w-full rounded-xl bg-background px-5 py-3 text-sm font-semibold text-foreground">{p.cta}</button>
                : <Link to="/downloader" className="mt-8 block w-full rounded-xl border border-border px-5 py-3 text-center text-sm font-semibold">{p.cta}</Link>}
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-muted-foreground">Premium payments aren't open yet.</p>
      </main>
      <SiteFooter />
    </div>
  );
}
