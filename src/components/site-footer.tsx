import { Link } from "@tanstack/react-router";
import { Sparkles, Github, Twitter } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/40 bg-card/30">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-16">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-semibold">EagerBeaver</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm">
              The AI-powered Pinterest downloader &amp; content discovery platform.
              Save what inspires you — beautifully.
            </p>
            <form className="flex max-w-sm gap-2 pt-2">
              <input
                type="email"
                placeholder="you@studio.com"
                className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                className="rounded-full bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow"
              >
                Notify me
              </button>
            </form>
          </div>

          <FooterCol title="Product" links={[
            { label: "Downloader", to: "/downloader" },
            { label: "Dashboard", to: "/dashboard" },
            { label: "Pricing", to: "/#pricing" },
            { label: "Changelog", to: "/#" },
          ]} />
          <FooterCol title="Company" links={[
            { label: "About", to: "/#" },
            { label: "Blog", to: "/#" },
            { label: "Contact", to: "/#" },
            { label: "Careers", to: "/#" },
          ]} />
          <FooterCol title="Legal" links={[
            { label: "Privacy", to: "/#" },
            { label: "Terms", to: "/#" },
            { label: "DMCA", to: "/#" },
            { label: "Cookies", to: "/#" },
          ]} />
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-border/40">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} EagerBeaver. Not affiliated with Pinterest.
          </p>
          <div className="flex items-center gap-3 text-muted-foreground">
            <a href="#" aria-label="Twitter" className="hover:text-foreground transition-colors">
              <Twitter className="h-4 w-4" />
            </a>
            <a href="#" aria-label="Github" className="hover:text-foreground transition-colors">
              <Github className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; to: string }[] }) {
  return (
    <div>
      <div className="text-sm font-semibold mb-3">{title}</div>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {links.map((l) => (
          <li key={l.label}>
            <Link to={l.to} className="hover:text-foreground transition-colors">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
