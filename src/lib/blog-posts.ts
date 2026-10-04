export type Post = { slug: string; title: string; excerpt: string; date: string; read: string; body: string[] };

export const posts: Post[] = [
  {
    slug: "save-pinterest-videos-hd",
    title: "How to save Pinterest videos in HD",
    excerpt: "A quick guide to grabbing pins, GIFs and videos at the best quality on EagerBeaver.",
    date: "2026-09-28",
    read: "3 min",
    body: [
      "Open Pinterest, tap the three dots on a pin and choose Copy link.",
      "Go to the EagerBeaver Downloader, paste the link and press Download. We find every quality the pin has.",
      "Pick the size you want — Original is the biggest — and tap Download. Sign in to keep a copy in your saved downloads.",
      "Tip: use Batch mode to paste up to 20 links at once.",
    ],
  },
  {
    slug: "krio-captions-that-pop",
    title: "Krio captions that make people stop scrolling",
    excerpt: "Mixing Krio and English is one of the easiest ways to feel local and real. Here's how.",
    date: "2026-09-20",
    read: "4 min",
    body: [
      "Your audience trusts creators who sound like them. A short Krio line at the start of a caption feels personal.",
      "Keep it short: one Krio hook, one English line, three to five hashtags.",
      "Try our AI Captions tool — choose “English + Krio” and a tone, then copy your favourite.",
      "Always read the caption out loud before posting. If it sounds natural, it works.",
    ],
  },
  {
    slug: "trending-in-salone",
    title: "What's trending for Salone creators this season",
    excerpt: "Beaches, food, Afrobeats dances and city life — the topics people keep saving.",
    date: "2026-09-12",
    read: "5 min",
    body: [
      "Beach content from Lumley, River No. 2 and Tokeh keeps getting saved, especially sunsets and drone shots.",
      "Food videos — cassava leaf, jollof, street snacks — do very well as short Reels.",
      "Dance challenges with local artists spread fast; post within the first week of a song taking off.",
      "Use the Trend ideas tool in AI Studio to get fresh ideas for your topic every week.",
    ],
  },
];
