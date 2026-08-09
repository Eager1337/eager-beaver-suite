import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Download, Heart, FolderHeart, Settings,
  Sparkles, LogOut, Bell, Search, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

const navItems = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/downloads", label: "Downloads", icon: Download },
  { to: "/favorites", label: "Favorites", icon: Heart },
  { to: "/collections", label: "Collections", icon: FolderHeart },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user.id]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  const displayName = profile?.full_name || (user.email?.split("@")[0] ?? "You");

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden lg:flex w-64 flex-col border-r border-border/60 bg-sidebar">
        <Link to="/" className="flex items-center gap-2 px-6 py-5 border-b border-border/60">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary shadow-glow">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-display text-base font-semibold">EagerBeaver</span>
        </Link>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border/60 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-accent/40 p-3">
            <div className="h-9 w-9 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground font-semibold text-sm shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{displayName}</div>
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            </div>
            <button
              onClick={signOut}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 glass border-b border-border/40">
          <div className="flex h-16 items-center justify-between px-4 md:px-8 gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <Link to="/" className="lg:hidden grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary">
                <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
              </Link>
              <BreadcrumbNav pathname={pathname} />
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-1.5 text-sm text-muted-foreground w-64">
                <Search className="h-3.5 w-3.5" />
                <input placeholder="Search…" className="flex-1 bg-transparent outline-none text-sm" />
                <kbd className="text-[10px] text-muted-foreground">⌘K</kbd>
              </div>
              <NotificationBell userId={user.id} />

            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function BreadcrumbNav({ pathname }: { pathname: string }) {
  const segment = pathname.split("/").filter(Boolean).pop() ?? "dashboard";
  const label = segment.charAt(0).toUpperCase() + segment.slice(1);
  return (
    <div className="flex items-center gap-2 text-sm min-w-0">
      <span className="text-muted-foreground">Workspace</span>
      <ChevronRight className="h-3 w-3 text-muted-foreground" />
      <span className="font-medium truncate">{label}</span>
    </div>
  );
}
