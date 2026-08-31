import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "About Shadow AI",
  description:
    "Shadow AI is an AI-powered experiment design platform built for life sciences researchers. Learn about our mission to help PhD scholars, postdocs, and research scientists move from research question to run-ready protocol faster.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Shadow AI - AI Experiment Design for Life Sciences",
    description:
      "Shadow AI is an AI co-scientist for bench researchers. Learn about our mission, what we build, and who we build it for."
  }
}

export default function AboutPage() {
  return (
    <div className="bg-paper min-h-dvh">
      {/* Nav */}
      <div className="border-ink-200/40 border-b px-6 py-5">
        <div className="mx-auto flex max-w-[860px] items-center justify-between">
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

      <div className="mx-auto max-w-[860px] px-6 py-14">
        {/* Hero */}
        <div className="mb-14 max-w-screen-sm">
          <p className="text-brick mb-3 text-[11px] font-bold uppercase tracking-[0.14em]">
            About
          </p>
          <h1 className="text-ink-900 mb-5 text-[38px] font-extrabold leading-tight tracking-tight">
            The fastest path from research question to run-ready experiment
          </h1>
          <p className="text-ink-500 text-[17px] leading-relaxed">
            Shadow AI is an AI co-scientist for bench researchers in life
            sciences. We compress the hours of literature review, hypothesis
            formulation, and protocol drafting that precede every experiment
            into minutes - so scientists spend more time doing science.
          </p>
        </div>

        <hr className="border-ink-200 mb-14" />

        {/* Mission */}
        <div className="mb-14 grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-ink-900 mb-3 text-[20px] font-bold">
              Our mission
            </h2>
            <p className="text-ink-600 text-[15px] leading-relaxed">
              Research moves in cycles of question, design, experiment, and
              interpretation. The design phase - reading the literature,
              generating hypotheses, writing the protocol - has always been the
              most time-consuming part of science that produces no data. We are
              building the tools to change that.
            </p>
            <p className="text-ink-600 mt-3 text-[15px] leading-relaxed">
              Our mission is to give every life sciences researcher access to
              the same depth of experimental planning that only the
              best-resourced labs with the most experienced scientists have had
              until now.
            </p>
          </div>
          <div>
            <h2 className="text-ink-900 mb-3 text-[20px] font-bold">
              Who we build for
            </h2>
            <p className="text-ink-600 text-[15px] leading-relaxed">
              We build for bench scientists - the people who write protocols,
              run experiments, and interpret data. PhD scholars designing their
              first independent experiments. Postdocs optimising complex assays.
              Research scientists building assay platforms in industry. Lab
              heads and PIs who need to guide multiple projects at once.
            </p>
            <p className="text-ink-600 mt-3 text-[15px] leading-relaxed">
              Fields we focus on: drug discovery, molecular biology,
              biochemistry, cell biology, pharmacology, immunology,
              neuroscience, genomics and proteomics, and bioprocessing.
            </p>
          </div>
        </div>

        {/* What Shadow AI does */}
        <div className="border-ink-200 mb-14 rounded-2xl border bg-white p-8">
          <h2 className="text-ink-900 mb-6 text-[22px] font-bold">
            What Shadow AI does
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                emoji: "🔬",
                title: "Experiment design",
                body: "From your research question, Shadow AI designs a complete experiment - assay format, treatment conditions, controls, and replication strategy - grounded in the literature."
              },
              {
                emoji: "💡",
                title: "Hypothesis generation",
                body: "Shadow AI scouts the relevant literature and generates mechanistically grounded, testable hypotheses. Each hypothesis comes with a rationale citing the supporting evidence."
              },
              {
                emoji: "📋",
                title: "Protocol creation",
                body: "Shadow AI writes complete step-by-step protocols - materials list, buffer recipes, instrument settings, troubleshooting notes - ready to take straight to the bench."
              },
              {
                emoji: "📚",
                title: "Literature synthesis",
                body: "Shadow AI surfaces the most relevant papers for your question, extracts key experimental parameters, and maps the mechanistic gaps your experiment should address."
              },
              {
                emoji: "📊",
                title: "Lab reports",
                body: "Shadow AI generates structured lab reports from your design and data - clear enough for a PI meeting, detailed enough for a regulatory submission."
              },
              {
                emoji: "🤝",
                title: "AI chat co-pilot",
                body: "An always-on AI research assistant that knows your experiment design - available to answer questions, suggest optimisations, and help interpret unexpected results."
              }
            ].map(f => (
              <div key={f.title}>
                <div className="mb-2 text-2xl">{f.emoji}</div>
                <h3 className="text-ink-900 mb-1 text-[15px] font-semibold">
                  {f.title}
                </h3>
                <p className="text-ink-500 text-[13px] leading-relaxed">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Principles */}
        <div className="mb-14">
          <h2 className="text-ink-900 mb-6 text-[22px] font-bold">
            What we believe
          </h2>
          <div className="space-y-5">
            {[
              {
                title: "Science is the work, not the paperwork",
                body: "The creative and analytical work of science is irreplaceable. The administrative overhead - formatting protocols, formatting references, formatting reports - is not. We automate the second category to give scientists more time for the first."
              },
              {
                title: "Reproducibility is not optional",
                body: "Experiments that cannot be replicated are not science - they are expensive noise. Shadow AI builds reproducibility best practices (power calculations, complete controls, full protocol documentation) into every design by default."
              },
              {
                title: "AI assists; scientists decide",
                body: "AI in the lab is most useful as an accelerant for human expertise, not a replacement for it. Shadow AI generates, drafts, and suggests - the scientist evaluates, decides, and takes responsibility for the science."
              },
              {
                title: "Breadth and depth, not breadth alone",
                body: "Generic AI tools write generic science. Shadow AI is purpose-built for life sciences - the assay formats, the controls, the statistics, the terminology, and the literature are specific to bench research in this domain."
              }
            ].map(p => (
              <div
                key={p.title}
                className="border-ink-200 rounded-xl border bg-white p-5"
              >
                <h3 className="text-ink-900 mb-1 text-[15px] font-semibold">
                  {p.title}
                </h3>
                <p className="text-ink-500 text-[14px] leading-relaxed">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="border-ink-200 rounded-2xl border bg-white p-8 text-center">
          <p className="text-ink-900 mb-1 text-[20px] font-bold">
            Ready to design your next experiment?
          </p>
          <p className="text-ink-500 mb-5 text-[14px]">
            Free to start. From research question to run-ready protocol in
            minutes.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="bg-brick text-paper inline-flex h-10 items-center rounded-md px-6 text-[14px] font-medium transition-colors hover:opacity-90"
            >
              Get started free →
            </Link>
            <Link
              href="/blog"
              className="border-ink-200 text-ink-700 hover:border-ink-400 inline-flex h-10 items-center rounded-md border px-6 text-[14px] transition-colors"
            >
              Read the blog
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
