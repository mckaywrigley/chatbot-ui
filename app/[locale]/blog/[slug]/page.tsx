import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import {
  BLOG_POSTS,
  getPostBySlug,
  getAllSlugs,
  PostSection
} from "@/lib/blog/posts"

interface Props {
  params: { slug: string; locale: string }
}

export function generateStaticParams() {
  return getAllSlugs().map(slug => ({ slug }))
}

export function generateMetadata({ params }: Props): Metadata {
  const post = getPostBySlug(params.slug)
  if (!post) return {}
  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.shadowai.work"
  return {
    title: post.seoTitle,
    description: post.description,
    keywords: post.tags,
    authors: [{ name: "Shadow AI Team", url: SITE_URL }],
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.seoTitle,
      description: post.description,
      publishedTime: post.publishedAt,
      authors: ["Shadow AI Team"],
      tags: post.tags,
      images: [
        {
          url: "/logo-full.png",
          width: 1200,
          height: 630,
          alt: post.title
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: post.seoTitle,
      description: post.description
    }
  }
}

function renderSection(s: PostSection, i: number) {
  switch (s.type) {
    case "h2":
      return (
        <h2
          key={i}
          className="text-ink-900 mb-3 mt-8 text-[22px] font-bold leading-tight tracking-tight"
        >
          {s.text}
        </h2>
      )
    case "h3":
      return (
        <h3
          key={i}
          className="text-ink-800 mb-2 mt-6 text-[17px] font-semibold"
        >
          {s.text}
        </h3>
      )
    case "p":
      return (
        <p key={i} className="text-ink-700 mb-4 text-[16px] leading-[1.75]">
          {s.text}
        </p>
      )
    case "ul":
      return (
        <ul key={i} className="mb-4 space-y-2 pl-1">
          {s.items.map((item, j) => (
            <li
              key={j}
              className="text-ink-700 flex gap-2.5 text-[15px] leading-relaxed"
            >
              <span className="text-brick mt-[5px] shrink-0 text-[10px]">
                ●
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )
    case "ol":
      return (
        <ol key={i} className="mb-4 space-y-2 pl-1">
          {s.items.map((item, j) => (
            <li
              key={j}
              className="text-ink-700 flex gap-3 text-[15px] leading-relaxed"
            >
              <span className="text-brick shrink-0 font-bold tabular-nums">
                {j + 1}.
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      )
    case "callout":
      return (
        <div
          key={i}
          className="border-brick/30 bg-brick/5 my-8 rounded-xl border-l-4 p-5"
        >
          <p className="text-ink-800 text-[15px] leading-relaxed">{s.text}</p>
          <Link
            href="/signup"
            className="bg-brick text-paper mt-3 inline-flex h-9 items-center rounded-md px-4 text-[13px] font-semibold transition-colors hover:opacity-90"
          >
            Try Shadow AI free →
          </Link>
        </div>
      )
    case "quote":
      return (
        <blockquote
          key={i}
          className="border-ink-300 bg-ink-50 my-5 rounded-r-xl border-l-4 px-5 py-4"
        >
          <p className="text-ink-700 text-[15px] italic leading-relaxed">
            &ldquo;{s.text}&rdquo;
          </p>
          {s.attribution && (
            <p className="text-ink-400 mt-2 text-[12px]">{s.attribution}</p>
          )}
        </blockquote>
      )
    default:
      return null
  }
}

export default function BlogPostPage({ params }: Props) {
  const post = getPostBySlug(params.slug)
  if (!post) notFound()

  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.shadowai.work"

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.seoTitle,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: {
      "@type": "Organization",
      name: "Shadow AI",
      url: SITE_URL
    },
    publisher: {
      "@type": "Organization",
      name: "Shadow AI",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` }
    },
    keywords: post.tags.join(", "),
    url: `${SITE_URL}/blog/${post.slug}`,
    image: `${SITE_URL}/logo-full.png`
  }

  const others = BLOG_POSTS.filter(p => p.slug !== post.slug).slice(0, 3)

  return (
    <div className="bg-paper min-h-dvh">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Nav */}
      <div className="border-ink-200/40 border-b px-6 py-5">
        <div className="mx-auto flex max-w-[760px] items-center justify-between">
          <Link
            href="/blog"
            className="text-ink-500 hover:text-ink-900 text-[13px] transition-colors"
          >
            ← All posts
          </Link>
          <Link
            href="/signup"
            className="bg-brick text-paper rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors hover:opacity-90"
          >
            Try Shadow AI free
          </Link>
        </div>
      </div>

      <article className="mx-auto max-w-[760px] px-6 py-12">
        {/* Meta */}
        <div className="mb-6 flex items-center gap-3">
          <span className="text-2xl">{post.coverEmoji}</span>
          <span className="text-ink-400 text-[11px] font-bold uppercase tracking-[0.14em]">
            {post.category}
          </span>
          <span className="text-ink-300">·</span>
          <span className="text-ink-400 text-[12px]">
            {new Date(post.publishedAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric"
            })}
          </span>
          <span className="text-ink-300">·</span>
          <span className="text-ink-400 text-[12px]">
            {post.readTimeMin} min read
          </span>
        </div>

        <h1 className="text-ink-900 mb-4 text-[32px] font-extrabold leading-tight tracking-tight sm:text-[36px]">
          {post.title}
        </h1>
        <p className="text-ink-500 mb-10 text-[17px] leading-relaxed">
          {post.description}
        </p>

        <hr className="border-ink-200 mb-10" />

        {/* Content */}
        <div>{post.sections.map((s, i) => renderSection(s, i))}</div>

        {/* Tags */}
        <div className="mt-10 flex flex-wrap gap-2">
          {post.tags.map(tag => (
            <span
              key={tag}
              className="border-ink-200 text-ink-500 rounded-full border px-3 py-1 text-[12px]"
            >
              {tag}
            </span>
          ))}
        </div>
      </article>

      {/* Related posts */}
      {others.length > 0 && (
        <div className="border-ink-200/40 border-t px-6 py-12">
          <div className="mx-auto max-w-[760px]">
            <h2 className="text-ink-900 mb-6 text-[18px] font-bold">
              More from the blog
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {others.map(p => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="border-ink-200 group rounded-xl border bg-white p-4 transition-shadow hover:shadow-sm"
                >
                  <span className="mb-2 block text-xl">{p.coverEmoji}</span>
                  <p className="text-ink-900 group-hover:text-brick text-[14px] font-semibold leading-snug transition-colors">
                    {p.title}
                  </p>
                  <p className="text-ink-400 mt-1 text-[12px]">
                    {p.readTimeMin} min
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer CTA */}
      <div className="border-ink-200/40 border-t bg-white px-6 py-12 text-center">
        <p className="text-ink-900 mb-1 text-[20px] font-bold">
          Design your next experiment with AI
        </p>
        <p className="text-ink-500 mb-5 text-[14px]">
          From research question to run-ready protocol in minutes. Free to
          start.
        </p>
        <Link
          href="/signup"
          className="bg-brick text-paper inline-flex h-10 items-center rounded-md px-6 text-[14px] font-medium transition-colors hover:opacity-90"
        >
          Try Shadow AI free →
        </Link>
      </div>
    </div>
  )
}
