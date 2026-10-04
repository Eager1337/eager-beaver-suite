import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help & FAQ — EagerBeaver" },
      { name: "description", content: "Answers to common questions about downloading, saving and AI tools on EagerBeaver, plus a contact form." },
      { property: "og:title", content: "Help & FAQ — EagerBeaver" },
      { property: "og:description", content: "Get help with EagerBeaver downloads, saving and AI tools." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Help,
});

const faqs = [
  ["Is EagerBeaver free?", "Yes. Downloading, browsing, share links and most AI tools are free. Premium will add extras later."],
  ["Which sites can I download from?", "Pinterest (pictures, GIFs, videos), TikTok, and most websites with a plain video file. Full YouTube and Instagram videos are coming soon."],
  ["Where do my downloads go?", "Your phone or computer saves the file in its Downloads folder. If you're signed in, a copy also appears in My account → Downloads."],
  ["Do I need an account?", "No. Sign in only if you want your name and downloads to follow you to other devices."],
  ["Can I write captions in Krio?", "Yes — open AI Studio → Captions & hashtags and choose Krio or English + Krio."],
  ["A download failed. What now?", "Check the link is public and try again. Old TikTok links can expire — copy a fresh link. Still stuck? Use the form below."],
];

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().email("Enter a valid email").max(200),
  kind: z.enum(["question", "bug", "feature"]),
  message: z.string().trim().min(10, "Tell us a bit more (10+ letters)").max(2000),
});

function Help() {
  const [f, setF] = useState({ name: "", email: "", kind: "question" as "question" | "bug" | "feature", message: "" });
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = schema.safeParse(f);
    if (!p.success) return toast.error(p.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.from("support_messages").insert(p.data);
    setBusy(false);
    if (error) return toast.error("Couldn't send. Please try again.");
    toast.success("Thanks! We got your message.");
    setF({ name: "", email: "", kind: "question", message: "" });
  }
  const input = "w-full rounded-xl border border-border bg-card/40 px-4 py-3 text-sm outline-none focus:border-primary";
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-4xl font-bold">Help & FAQ</h1>
        <p className="mt-2 text-muted-foreground">Quick answers — or ask <Link to="/ai" search={{ tab: "chat" }} className="text-primary">Beaver, our AI helper</Link>.</p>
        <Accordion type="single" collapsible className="mt-8 glass rounded-2xl px-6">
          {faqs.map(([q, a]) => (
            <AccordionItem key={q} value={q}><AccordionTrigger>{q}</AccordionTrigger><AccordionContent className="text-muted-foreground">{a}</AccordionContent></AccordionItem>
          ))}
        </Accordion>
        <h2 className="mt-12 text-2xl font-semibold">Contact us</h2>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Your name" className={input} />
            <input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="Email" type="email" className={input} />
          </div>
          <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as typeof f.kind })} className={input}>
            <option value="question">Question</option><option value="bug">Report a problem</option><option value="feature">Suggest a feature</option>
          </select>
          <textarea value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} rows={5} placeholder="How can we help?" className={input} />
          <button disabled={busy} className="rounded-xl bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50">{busy ? "Sending…" : "Send message"}</button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
