export type MockPin = {
  id: string;
  title: string;
  creator: string;
  category: string;
  thumbnail: string;
  aspect: number;
  color: string;
};

const palette = [
  "#c2410c", "#0f766e", "#7c2d12", "#1e3a8a", "#4c1d95", "#065f46",
  "#a16207", "#831843", "#134e4a", "#3730a3", "#7f1d1d", "#166534",
];

export const trendingPins: MockPin[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `pin-${i}`,
  title: [
    "Minimal desk setup",
    "Autumn moodboard",
    "Neo-brutalist poster",
    "Kyoto in October",
    "Interior sketch",
    "Analog film photography",
    "Editorial typography",
    "Sunset gradient palette",
    "Home library goals",
    "Ceramic vessel study",
    "Winter fashion look",
    "Vintage travel poster",
  ][i],
  creator: [
    "@studio.north", "@paperlane", "@formfolk", "@archive.co",
    "@saltandpepper", "@nightowl", "@dailyframe", "@lumenlab",
    "@softserif", "@claybody", "@fitcurator", "@wanderprint",
  ][i],
  category: ["Design", "Mood", "Poster", "Travel", "Home", "Photo",
             "Type", "Palette", "Home", "Craft", "Fashion", "Travel"][i],
  thumbnail: "",
  aspect: [1.2, 0.75, 1.4, 0.85, 1.1, 0.9, 1.3, 0.8, 1.15, 1, 0.7, 1.25][i],
  color: palette[i],
}));

export const categories = [
  "Design", "Photography", "Fashion", "Home", "Food", "Travel",
  "Art", "Type", "Craft", "Nature",
];

export const testimonials = [
  {
    quote: "The cleanest Pinterest downloader I've used. Feels like a real product, not a spammy tool.",
    name: "Maya Ortega",
    role: "Art Director, Fold Studio",
  },
  {
    quote: "Batch downloads and the AI caption tools save me hours every week on client moodboards.",
    name: "Jonas Reyes",
    role: "Freelance Designer",
  },
  {
    quote: "Finally something that looks as beautiful as the pins I'm saving.",
    name: "Ines Kowalski",
    role: "Content Strategist",
  },
];

export const faqs = [
  {
    q: "Is EagerBeaver free to use?",
    a: "The core downloader is free. Premium unlocks unlimited batch downloads, higher speed servers, AI tools and advanced analytics.",
  },
  {
    q: "What can I download?",
    a: "Pins, videos, GIFs, boards, carousels and stories — in original quality or 1080p/720p when available.",
  },
  {
    q: "Do you store my downloads?",
    a: "Only if you're signed in and choose to save them to your collections. Anonymous downloads are never persisted.",
  },
  {
    q: "Can I use downloaded content commercially?",
    a: "Respect original creators and Pinterest's terms. EagerBeaver is a personal tool for research and moodboards.",
  },
];
