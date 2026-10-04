import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { posts } from "@/lib/blog-posts";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = posts.find((p) => p.slug === params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: `${loaderData.post.title} — EagerBeaver` },
            { name: "description", content: loaderData.post.excerpt },
            { property: "og:title", content: loaderData.post.title },
            { property: "og:description", content: loaderData.post.excerpt },
            { property: "og:type", content: "article" },
            { name: "twitter:card", content: "summary" },
          ],
        }
      : { meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }] },
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center text-center p-8">
      <div><p className="text-lg">That article doesn't exist.</p><Link to="/blog" className="mt-3 inline-block text-primary">Back to blog</Link></div>
    </div>
  ),
  errorComponent: () => <div className="p-8 text-center">Couldn't load this article.</div>,
  component: PostPage,
});

function PostPage() {
  const { post } = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <article className="mx-auto max-w-2xl px-4 py-12">
        <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground">← All articles</Link>
        <h1 className="mt-4 font-display text-4xl font-bold">{post.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{new Date(post.date).toLocaleDateString(undefined, { dateStyle: "long" })} · {post.read} read</p>
        <div className="mt-8 space-y-4 text-lg leading-relaxed">{post.body.map((p, i) => <p key={i}>{p}</p>)}</div>
        <Link to="/ai" className="mt-10 inline-block rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">Try AI Studio</Link>
      </article>
      <SiteFooter />
    </div>
  );
}
