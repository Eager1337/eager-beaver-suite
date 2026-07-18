import { createFileRoute } from "@tanstack/react-router";
import { FolderHeart, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/collections")({
  component: CollectionsPage,
});

function CollectionsPage() {
  return (
    <div className="max-w-6xl mx-auto animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Collections</h1>
          <p className="mt-1 text-muted-foreground text-sm">Group your downloads into folders and boards.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow">
          <Plus className="h-4 w-4" /> New collection
        </button>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {["Moodboards", "Client work", "Personal", "Autumn 2025", "Type ideas", "Interiors"].map((name, i) => (
          <div key={name} className="glass rounded-2xl p-6 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-glow">
            <div className="grid grid-cols-3 gap-1 mb-4">
              {[0, 1, 2, 3, 4, 5].map((k) => (
                <div
                  key={k}
                  className="aspect-square rounded"
                  style={{
                    background: `linear-gradient(160deg, oklch(${0.5 + (i * 0.03)} 0.15 ${(i * 30 + k * 20) % 360}), oklch(${0.6 + (k * 0.02)} 0.2 ${(i * 30 + k * 20) % 360}))`,
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <FolderHeart className="h-4 w-4 text-primary" />
              <div className="font-medium">{name}</div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">{12 - i} pins</div>
          </div>
        ))}
      </div>
    </div>
  );
}
