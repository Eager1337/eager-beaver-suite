import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Moon, Sun, Sparkles, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { User } from "@supabase/supabase-js";

export function SiteHeader() {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const links = [
    { to: "/downloader", label: "Downloader" },
    { to: "/#features", label: "Features" },
    { to: "/#pricing", label: "Premium" },
    { to: "/#faq", label: "FAQ" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="glass border-b border-border/40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow transition-transform group-hover:scale-105">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-semibold tracking-tight">
              EagerBeaver
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <a
                key={l.to}
                href={l.to}
                className="rounded-full px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-accent/50"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/50 text-muted-foreground transition-colors hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {user ? (
              <Button
                onClick={() => navigate({ to: "/dashboard" })}
                className="rounded-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
              >
                Dashboard
              </Button>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="hidden sm:inline-flex rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Sign in
                </Link>
                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  className="inline-flex rounded-full bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition-transform hover:scale-[1.03]"
                >
                  Get started
                </Link>
              </>
            )}

            <button
              onClick={() => setOpen(!open)}
              className="md:hidden grid h-9 w-9 place-items-center rounded-full border border-border"
              aria-label="Menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden border-t border-border/40 px-4 py-3 space-y-1">
            {links.map((l) => (
              <a
                key={l.to}
                href={l.to}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50"
              >
                {l.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
