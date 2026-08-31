import { Metadata } from "next"
import Link from "next/link"

import { BLOG_POSTS } from "@/lib/blog/posts"

export const metadata: Metadata = {
  title: "Blog - Experiment Design & AI for Life Sciences Researchers",
  description:
    "Practical guides on experiment design, hypothesis generation, statistical power, AI tools, and reproducibility for PhD researchers, postdocs, and lab scientists in life sciences.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Shadow AI Blog - Life Sciences Research Guides",
    description:
      "Practical guides on experiment design, AI tools, and reproducibility for life sciences researchers."
  }
}

export default function BlogIndexPage() {
  const sorted = [...BLOG_POSTS].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )

  return (
    <div className="bg-paper min-h-dvh">
      {/* Header */}
      <div className="border-ink-200/40 border-b px-6 py-5">
        <div className="mx-auto flex max-w-[900px] items-center justify-between">
          <Link
            href="/"
            className="text-ink-500 hover:text-ink-900 text-[13px] transition-colors"
          >
            ← Shadow AI
          </Link>
          <Link
            href="/signup"
            className="bg-brick text-paper rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors hover:opacity-90"
          >
            Try free
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-[900px] px-6 py-14">
        {/* Hero */}
        <div className="mb-12">
          <p className="text-brick mb-3 text-[11px] font-bold uppercase tracking-[0.14em]">
            Shadow AI Blog
          </p>
          <h1 className="text-ink-900 text-[36px] font-extrabold leading-tight tracking-tight">
            Experiment design & AI for life sciences researchers
          </h1>
          <p className="text-ink-500 mt-3 max-w-[600px] text-[16px] leading-relaxed">
            Practical guides on designing better experiments, generating
            hypotheses, understanding statistics, and using AI in the lab.
          </p>
        </div>

        {/* Posts grid */}
        <div className="grid gap-5 sm:grid-cols-2">
          {sorted.map(post => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="border-ink-200 group flex flex-col rounded-2xl border bg-white p-6 transition-shadow hover:shadow-md"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="text-2xl">{post.coverEmoji}</span>
                <span className="text-ink-400 text-[11px] font-semibold uppercase tracking-wider">
                  {post.category}
                </span>
              </div>
              <h2 className="text-ink-900 group-hover:text-brick mb-2 text-[16px] font-bold leading-snug transition-colors">
                {post.title}
              </h2>
              <p className="text-ink-500 mb-4 flex-1 text-[13px] leading-relaxed">
                {post.description}
              </p>
              <div className="text-ink-400 flex items-center gap-3 text-[12px]">
                <span>
                  {new Date(post.publishedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  })}
                </span>
                <span>·</span>
                <span>{post.readTimeMin} min read</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="border-ink-200 mt-16 rounded-2xl border bg-white p-8 text-center">
          <p className="text-ink-900 mb-2 text-[18px] font-bold">
            Design your next experiment with AI
          </p>
          <p className="text-ink-500 mb-5 text-[14px]">
            Shadow AI turns your research question into a complete, run-ready
            experiment plan - literature, hypotheses, protocol included. Free to
            start.
          </p>
          <Link
            href="/signup"
            className="bg-brick text-paper inline-flex h-10 items-center rounded-md px-5 text-[14px] font-medium transition-colors hover:opacity-90"
          >
            Try Shadow AI free →
          </Link>
        </div>
      </div>
    </div>
  )
}
