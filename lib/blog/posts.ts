export type PostSection =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "callout"; text: string }
  | { type: "quote"; text: string; attribution?: string }

export interface BlogPost {
  slug: string
  title: string
  seoTitle: string
  description: string
  publishedAt: string
  readTimeMin: number
  tags: string[]
  category: string
  coverEmoji: string
  sections: PostSection[]
}

export const BLOG_POSTS: BlogPost[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // 1
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "how-to-design-a-drug-discovery-experiment",
    title: "How to Design a Drug Discovery Experiment: A Step-by-Step Guide",
    seoTitle:
      "How to Design a Drug Discovery Experiment (2025 Step-by-Step Guide)",
    description:
      "A practical, step-by-step guide to designing drug discovery experiments - from defining the biological target to writing a reproducible protocol. Includes checklists for hit identification, lead optimisation, and ADMET assays.",
    publishedAt: "2025-06-10",
    readTimeMin: 9,
    tags: [
      "drug discovery",
      "experiment design",
      "protocol",
      "pharmacology",
      "assay development"
    ],
    category: "Experiment Design",
    coverEmoji: "🧬",
    sections: [
      {
        type: "p",
        text: "Designing a drug discovery experiment is one of the highest-stakes tasks in life sciences research. A poorly designed assay wastes months of effort; a well-structured one provides clear, reproducible data that moves a compound through the pipeline. This guide walks through every stage - from framing your biological question to writing a protocol your whole lab can follow."
      },
      {
        type: "h2",
        text: "1. Define the Biological Question and Target"
      },
      {
        type: "p",
        text: "Before touching a pipette, you need an unambiguous statement of what you are trying to learn. In drug discovery this means identifying the target (protein, pathway, or phenotype), the disease context, and the hypothesis connecting target modulation to a therapeutic effect."
      },
      {
        type: "p",
        text: "A good biological question in drug discovery is falsifiable and specific. 'Does compound X inhibit EGFR kinase activity in an in vitro biochemical assay at concentrations below 100 nM?' is testable. 'Can we find something that treats cancer?' is not."
      },
      {
        type: "ul",
        items: [
          "Identify the molecular target and its disease validation status",
          "Review existing assay formats for that target class (biochemical vs. cell-based)",
          "Confirm target expression levels in your chosen cell line or recombinant system",
          "Define the primary readout (IC50, Ki, cellular viability, reporter gene signal)"
        ]
      },
      {
        type: "h2",
        text: "2. Choose the Right Assay Format"
      },
      {
        type: "p",
        text: "Assay format is the single biggest variable in drug discovery experiment design. Each format has trade-offs between throughput, physiological relevance, and signal quality. The most common formats are:"
      },
      {
        type: "ul",
        items: [
          "Biochemical assays (enzymatic inhibition, binding) - high throughput, low false-positive rate, limited for membrane proteins",
          "Cell-based assays (reporter gene, cytotoxicity, phenotypic) - physiologically relevant, but more complex to control",
          "Biophysical assays (SPR, ITC, DSF) - direct binding information, no requirement for enzymatic activity",
          "Target-engagement assays (NanoBRET, CETSA) - intracellular binding confirmation in live cells"
        ]
      },
      {
        type: "p",
        text: "For early-stage hit identification from a compound library, a robust biochemical assay with a Z-prime ≥ 0.5 is the standard entry point. Once you have confirmed hits, layering in cellular assays validates that compounds are cell-penetrant and reach the target."
      },
      {
        type: "h2",
        text: "3. Design Your Controls"
      },
      {
        type: "p",
        text: "Controls are non-negotiable. Every well-designed drug discovery experiment requires at minimum:"
      },
      {
        type: "ul",
        items: [
          "Positive control - a known active compound at a saturating concentration to confirm assay sensitivity",
          "Negative control - vehicle (typically DMSO at matched concentration) to set the baseline",
          "Blank control - assay components without target or cells, to measure background signal",
          "Counter-screen control - for assays prone to fluorescence interference (compound-only, no enzyme)"
        ]
      },
      {
        type: "h2",
        text: "4. Define Sample Size and Replication Strategy"
      },
      {
        type: "p",
        text: "Statistical rigour starts at the design stage, not during analysis. For dose-response experiments, 8–10 concentration points spanning at least 3 log units give reliable IC50 estimates. For confirmation screens, run triplicates on every confirmed hit before investing in counter-screens."
      },
      {
        type: "p",
        text: "Biological replicates (independent experiments on different days, ideally with freshly prepared reagents) are far more valuable than technical replicates (replicate wells within the same run). A result that holds across three independent runs with separate enzyme batches is trustworthy; a result from one run with twelve technical replicates is not."
      },
      {
        type: "h2",
        text: "5. Write the Protocol Before You Start"
      },
      {
        type: "p",
        text: "A reproducible drug discovery experiment requires a complete, written protocol before the first well is plated. This is not bureaucracy - it is the only way to ensure another scientist in your lab can replicate your work, and it forces you to think through every step in advance."
      },
      {
        type: "ul",
        items: [
          "Materials list with CAS numbers, catalogue numbers, and lot numbers for critical reagents",
          "Buffer compositions with exact pH and temperature of preparation",
          "Instrument settings (wavelength, gain, integration time) locked at optimisation stage",
          "Data collection and analysis plan written before unblinding results"
        ]
      },
      {
        type: "h2",
        text: "6. Plan for ADMET Early"
      },
      {
        type: "p",
        text: "One of the most expensive mistakes in drug discovery is deferring ADMET (absorption, distribution, metabolism, excretion, toxicity) profiling until after a compound series has been extensively optimised for potency. Building basic ADMET flags - solubility, microsomal stability, Caco-2 permeability - into your hit-to-lead workflow avoids optimising yourself into a corner."
      },
      {
        type: "h2",
        text: "Using AI to Speed Up Experiment Design"
      },
      {
        type: "p",
        text: "Designing a drug discovery experiment that hits all of the above checkpoints from scratch takes an experienced scientist hours. AI tools like Shadow AI compress this to minutes - given your biological question, they scout the relevant literature, surface assay formats that have worked for similar targets, generate a hypothesis-driven experimental design, and produce a complete step-by-step protocol you can take straight to the bench."
      },
      {
        type: "callout",
        text: "Shadow AI is purpose-built for life sciences researchers. Describe your drug discovery question and get a structured experiment design - including controls, replication strategy, and protocol - in minutes. Free to try."
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 2
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "ai-tools-for-phd-researchers-life-sciences",
    title: "10 AI Tools Every Life Sciences PhD Researcher Should Know in 2025",
    seoTitle:
      "10 AI Tools for Life Sciences PhD Researchers (2025) - Experiment Design to Writing",
    description:
      "A curated list of the best AI tools for PhD researchers in life sciences - covering experiment design, literature review, data analysis, writing, and lab management. Includes honest trade-offs for each tool.",
    publishedAt: "2025-06-12",
    readTimeMin: 8,
    tags: [
      "AI tools",
      "PhD research",
      "life sciences",
      "productivity",
      "literature review"
    ],
    category: "AI in Research",
    coverEmoji: "🤖",
    sections: [
      {
        type: "p",
        text: "The AI tooling landscape for life sciences researchers has exploded. There are now AI tools for almost every step of the research process - from designing experiments and reviewing literature to writing manuscripts and managing lab data. This guide cuts through the noise and focuses on the tools that PhD researchers in molecular biology, biochemistry, drug discovery, and adjacent fields are actually using and finding valuable."
      },
      {
        type: "h2",
        text: "1. Shadow AI - Experiment Design and Protocol Generation"
      },
      {
        type: "p",
        text: "Shadow AI is built specifically for the experiment design workflow: you describe your research question, and it scouts the relevant literature, generates testable hypotheses, designs the experiment (with controls, replication strategy, and materials), and writes a step-by-step protocol. It is the most focused AI tool for the bench-science design-to-protocol pipeline."
      },
      {
        type: "p",
        text: "Best for: PhD students and postdocs who spend hours designing experiments before running them. Particularly strong for molecular biology, biochemistry, pharmacology, and cell biology."
      },
      {
        type: "h2",
        text: "2. Semantic Scholar - AI-Powered Literature Search"
      },
      {
        type: "p",
        text: "Semantic Scholar uses AI to surface the most relevant papers for a query, including papers that cite or are cited by a seed paper. Its TLDR feature gives a one-sentence summary of each paper, and the citation graph lets you understand how a finding has propagated through the field."
      },
      {
        type: "h2",
        text: "3. Elicit - Literature Review Automation"
      },
      {
        type: "p",
        text: "Elicit extracts structured information from papers - sample sizes, outcomes, methods - and presents it in a table you can export. It is particularly strong for systematic reviews and meta-analyses, where you need to compare methodology and results across dozens of papers."
      },
      {
        type: "h2",
        text: "4. Perplexity - Fast Scientific Fact-Checking"
      },
      {
        type: "p",
        text: "Perplexity combines a search engine with an AI summariser and cites its sources. It is useful for quick factual lookups during experiment planning - checking a molecular weight, confirming a standard assay condition, or getting a primer on an unfamiliar pathway - faster than a full literature search."
      },
      {
        type: "h2",
        text: "5. BioRender - Scientific Figures"
      },
      {
        type: "p",
        text: "BioRender has incorporated AI-assisted figure generation that can produce schematic diagrams from text prompts. For PhD students preparing thesis figures, posters, or paper graphics, it dramatically accelerates the design process."
      },
      {
        type: "h2",
        text: "6. Scite - Citation Credibility Analysis"
      },
      {
        type: "p",
        text: "Scite classifies how a paper has been cited - whether subsequent papers support, contradict, or merely mention it. This is invaluable for life sciences research, where papers sometimes remain cited long after their central claims have been challenged or retracted."
      },
      {
        type: "h2",
        text: "7. Research Rabbit - Citation Network Exploration"
      },
      {
        type: "p",
        text: "Research Rabbit visualises the citation network around a set of seed papers, making it easy to find seminal papers, closely related work, and recent papers building on a line of research. It integrates with Zotero for reference management."
      },
      {
        type: "h2",
        text: "8. Otter.ai - Lab Meeting Transcription"
      },
      {
        type: "p",
        text: "Otter.ai transcribes audio and video in real time and summarises the key points. For PhD students, transcribing lab meetings and supervisor sessions means you never lose a piece of feedback or a suggested experiment - and the AI summary captures the action items."
      },
      {
        type: "h2",
        text: "9. Consensus - Evidence-Based Q&A from Literature"
      },
      {
        type: "p",
        text: "Consensus answers scientific questions by synthesising evidence from peer-reviewed literature. Unlike a general-purpose LLM, it only draws on published research and shows you the supporting papers. Useful for quickly establishing whether a hypothesis has empirical support before investing in an experiment."
      },
      {
        type: "h2",
        text: "10. Claude or GPT-4 - General Research Writing and Analysis"
      },
      {
        type: "p",
        text: "For writing - grant sections, manuscript drafts, thesis chapters, email responses to reviewers - large language models like Claude and GPT-4 are genuinely useful. They are best used as a thinking partner and first-draft generator, with all scientific claims verified against primary literature."
      },
      {
        type: "h2",
        text: "How to Choose"
      },
      {
        type: "p",
        text: "The mistake most PhD researchers make is adopting too many AI tools at once. Start with the one that addresses your biggest bottleneck. If designing experiments takes you the most time, start with Shadow AI. If literature review is the pain point, start with Elicit. If writing is the bottleneck, experiment with Claude or GPT-4. Add tools incrementally and evaluate whether each one actually saves time before adding another."
      },
      {
        type: "callout",
        text: "Shadow AI is free to start. Describe your next research question and get a complete experiment design - literature, hypotheses, controls, and protocol - in under five minutes."
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 3
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "how-to-write-scientific-experimental-protocol",
    title: "How to Write a Scientific Experimental Protocol (With Examples)",
    seoTitle:
      "How to Write a Scientific Experimental Protocol - Templates and Examples",
    description:
      "A complete guide to writing reproducible experimental protocols for life sciences research. Covers the essential sections, common mistakes, and examples from molecular biology, biochemistry, and cell biology.",
    publishedAt: "2025-06-14",
    readTimeMin: 10,
    tags: [
      "experimental protocol",
      "SOP",
      "reproducibility",
      "molecular biology",
      "lab documentation"
    ],
    category: "Lab Skills",
    coverEmoji: "📋",
    sections: [
      {
        type: "p",
        text: "A well-written experimental protocol is the backbone of reproducible science. It should be detailed enough that a competent scientist unfamiliar with your specific project can follow it and get the same result. In practice, most protocols in life sciences fail this test - they are written for the person who already knows the experiment, not for the person who will need to repeat it in six months."
      },
      {
        type: "p",
        text: "This guide covers what every protocol must contain, the most common structural mistakes, and concrete examples from molecular biology, biochemistry, and cell biology."
      },
      {
        type: "h2",
        text: "The Essential Sections of a Scientific Protocol"
      },
      {
        type: "h3",
        text: "1. Title and Purpose"
      },
      {
        type: "p",
        text: "The title should state what the protocol does, not just name the technique. 'Western Blot Protocol' is uninformative. 'Western Blot for Detection of Phospho-ERK1/2 (T202/Y204) in Cell Lysates' tells the reader exactly what they are looking at."
      },
      {
        type: "p",
        text: "The purpose section (2–4 sentences) explains the scientific rationale: what question does this protocol answer, and why is this method the right one? This matters because future users - including yourself - need to understand why a specific step is done to troubleshoot deviations intelligently."
      },
      {
        type: "h3",
        text: "2. Materials and Reagents"
      },
      {
        type: "p",
        text: "List everything required. For each reagent, include the supplier, catalogue number, and lot number (or note that lot numbers must be recorded). For equipment, include the model number and any calibration requirements. Ambiguity about which antibody clone, which restriction enzyme supplier, or which brand of PBS has been the root cause of thousands of failed replication attempts."
      },
      {
        type: "ul",
        items: [
          "Include final working concentrations, not just stock concentrations",
          "Note storage conditions for every reagent",
          "Flag reagents with short bench-stability windows (e.g. DTT-containing buffers)",
          "Specify the grade of water required (MilliQ, HPLC-grade, etc.)"
        ]
      },
      {
        type: "h3",
        text: "3. Safety Information"
      },
      {
        type: "p",
        text: "List hazardous materials and the corresponding PPE and disposal requirements. This is not optional and not just a formality - it is a legal requirement in most jurisdictions and an ethical obligation to everyone who will use your protocol."
      },
      {
        type: "h3",
        text: "4. Step-by-Step Procedure"
      },
      {
        type: "p",
        text: "Number every step. Do not combine multiple actions into a single step - each discrete action should be its own numbered item. Where timing matters, include it in the step itself ('incubate at 37°C for exactly 30 minutes') rather than in a footnote."
      },
      {
        type: "p",
        text: "Include critical decision points: 'If the lysate appears viscous at this stage, add 5 µL of Benzonase and incubate for an additional 10 minutes before centrifugation.' These are the troubleshooting insights that exist only in experienced researchers' heads - capturing them in the protocol is high-value institutional knowledge."
      },
      {
        type: "h3",
        text: "5. Controls"
      },
      {
        type: "p",
        text: "Every protocol must specify which controls are required, what result each control should produce, and what to do if a control fails. A protocol without explicit control criteria gives the reader no basis for evaluating whether an experiment is valid."
      },
      {
        type: "h3",
        text: "6. Data Collection and Analysis"
      },
      {
        type: "p",
        text: "Specify how data will be collected (instrument settings, image acquisition parameters, file formats) and analysed (software, statistical tests, normalisation strategy). Pre-specifying the analysis plan prevents post-hoc flexibility that inflates false-positive rates."
      },
      {
        type: "h3",
        text: "7. Expected Results and Troubleshooting"
      },
      {
        type: "p",
        text: "Include a representative result figure or description. Then list the most common failure modes and their likely causes. This is the section that transforms a protocol from a procedure into a troubleshooting guide - and it dramatically reduces the time a new lab member spends chasing phantom technical problems."
      },
      {
        type: "h2",
        text: "The Most Common Protocol Mistakes"
      },
      {
        type: "ol",
        items: [
          "Using brand names without catalogue numbers ('add Tween-20' instead of 'add Polysorbate 20, Sigma P9416, 0.05% v/v')",
          "Omitting the purpose of steps, making troubleshooting impossible",
          "Combining multiple actions into one step, causing missed steps",
          "Not specifying the source, grade, or lot of antibodies and cell lines",
          "Writing 'as per manufacturer's instructions' without specifying which revision of those instructions",
          "Not including expected timelines for each phase of the experiment"
        ]
      },
      {
        type: "h2",
        text: "Using AI to Generate Protocol First Drafts"
      },
      {
        type: "p",
        text: "AI tools can significantly accelerate protocol writing. Shadow AI, for example, generates a complete step-by-step protocol from your experimental design - including materials lists, buffer recipes, control specifications, and troubleshooting notes - in a format you can refine rather than write from scratch. This is particularly valuable for protocols based on established methods, where the AI can pull the standard conditions from the literature and you focus on the specific parameters of your experiment."
      },
      {
        type: "callout",
        text: "Shadow AI generates complete experimental protocols - including materials, controls, and troubleshooting - from your research question. Try it free."
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 4
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "hypothesis-generation-molecular-biology",
    title: "Hypothesis Generation in Molecular Biology: A Practical Guide",
    seoTitle:
      "How to Generate a Scientific Hypothesis in Molecular Biology (Practical Guide)",
    description:
      "How to formulate strong, testable hypotheses in molecular biology research. Covers the difference between a good and bad hypothesis, the role of literature in hypothesis generation, and how AI is changing the process.",
    publishedAt: "2025-06-16",
    readTimeMin: 7,
    tags: [
      "hypothesis generation",
      "molecular biology",
      "scientific method",
      "research design",
      "AI"
    ],
    category: "Scientific Method",
    coverEmoji: "💡",
    sections: [
      {
        type: "p",
        text: "A hypothesis is not a guess. In molecular biology, a good hypothesis is a specific, testable, mechanistic statement that follows logically from existing evidence and makes a prediction that can be falsified with a defined experiment. The quality of your hypothesis determines the quality of your research before a single experiment is run."
      },
      {
        type: "h2",
        text: "What Makes a Good Hypothesis in Molecular Biology?"
      },
      {
        type: "p",
        text: "A strong hypothesis in molecular biology has four properties:"
      },
      {
        type: "ul",
        items: [
          "Specific - it names the molecules, conditions, and direction of effect",
          "Mechanistic - it proposes a biological mechanism, not just a correlation",
          "Testable - it makes a prediction that can be confirmed or refuted with available techniques",
          "Falsifiable - there is a clear result that would disprove it"
        ]
      },
      {
        type: "h3",
        text: "Weak hypothesis"
      },
      {
        type: "quote",
        text: "Inhibiting mTOR will affect cancer cell growth.",
        attribution:
          "Vague direction of effect; no mechanism; not falsifiable with a single experiment"
      },
      {
        type: "h3",
        text: "Strong hypothesis"
      },
      {
        type: "quote",
        text: "Rapamycin-mediated inhibition of mTORC1 will reduce S6K1 phosphorylation at T389 and decrease proliferation in MCF-7 breast cancer cells at concentrations below 10 nM, as measured by Western blot and BrdU incorporation assay.",
        attribution:
          "Specific molecule, pathway, cell line, concentration, assay, and measurable outcome"
      },
      {
        type: "h2",
        text: "The Role of Literature in Hypothesis Generation"
      },
      {
        type: "p",
        text: "A hypothesis that ignores existing evidence is not a scientific hypothesis - it is speculation. Before formulating a hypothesis, you need to know what is already established about the system you are working in, what the key mechanistic gaps are, and what results would be surprising versus expected given current knowledge."
      },
      {
        type: "p",
        text: "Effective literature review for hypothesis generation is not about reading every paper in a field. It is about identifying the mechanistic boundary - the point where experimental evidence runs out and inference begins. Your hypothesis lives at that boundary."
      },
      {
        type: "ul",
        items: [
          "Use review articles to establish the consensus model",
          "Read primary papers at the mechanistic frontier of the field",
          "Note conflicting results between labs - these represent real mechanistic uncertainty",
          "Pay attention to phenotypic observations without mechanistic explanation"
        ]
      },
      {
        type: "h2",
        text: "Common Hypothesis Formulation Mistakes"
      },
      {
        type: "ol",
        items: [
          "Too broad - 'PI3K signalling is important in cancer' cannot be tested by a single experiment",
          "No directional prediction - 'X will affect Y' is not a hypothesis; 'X will increase Y by inhibiting Z' is",
          "Circular - 'activating the pathway will activate downstream effectors' is trivially true by definition",
          "No experimental handle - 'epigenetic mechanisms contribute to drug resistance' is a hypothesis that could take a decade to test without specifying which mechanism",
          "Disconnected from the literature - ignoring existing evidence that already partially answers the question"
        ]
      },
      {
        type: "h2",
        text: "How AI Is Changing Hypothesis Generation"
      },
      {
        type: "p",
        text: "Large-scale literature synthesis is precisely where AI systems have an advantage over individual researchers. A researcher can deeply engage with perhaps a few hundred papers in their area; AI systems can surface patterns across tens of thousands. Shadow AI, for example, uses your problem statement and the relevant literature it identifies to generate a set of mechanistically grounded, testable hypotheses - each with a rationale citing the supporting evidence."
      },
      {
        type: "p",
        text: "This does not replace the scientist's judgment about which hypothesis is worth pursuing. But it dramatically accelerates the literature synthesis step and surfaces hypotheses that a researcher might not have arrived at from their narrower reading of the field."
      },
      {
        type: "h2",
        text: "The Hypothesis → Experiment → Protocol Chain"
      },
      {
        type: "p",
        text: "A hypothesis is only valuable if it connects directly to an experiment. The moment you formulate a hypothesis, you should also specify: what experiment would test it, what the positive and negative results would look like, and what controls are required. A hypothesis that cannot be connected to a concrete experiment within your lab's capabilities is not ready to be tested."
      },
      {
        type: "callout",
        text: "Shadow AI generates mechanistically grounded, testable hypotheses from your research question and the literature - then builds the experiment design around them. Start free."
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 5
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "experimental-controls-guide-life-sciences",
    title:
      "Positive Controls, Negative Controls, and Everything In Between: A Complete Guide",
    seoTitle:
      "Experimental Controls in Life Sciences: Positive, Negative, and Beyond",
    description:
      "A comprehensive guide to experimental controls in life sciences research - what each type does, why it matters, and how to choose the right controls for your assay. Includes examples from cell biology, biochemistry, and in vivo studies.",
    publishedAt: "2025-06-18",
    readTimeMin: 8,
    tags: [
      "experimental controls",
      "positive control",
      "negative control",
      "assay validation",
      "scientific rigor"
    ],
    category: "Scientific Method",
    coverEmoji: "⚖️",
    sections: [
      {
        type: "p",
        text: "Controls are the backbone of valid experimental design. Without them, you have no way to know whether a result reflects the biology you are studying or an artefact of your assay conditions. Yet in practice, control design is often treated as an afterthought - a checkbox rather than a considered scientific decision. This guide explains each type of control, why each matters, and how to design a control strategy for your specific assay."
      },
      {
        type: "h2",
        text: "Positive Controls"
      },
      {
        type: "p",
        text: "A positive control is a condition that produces a known, expected result. Its purpose is to confirm that your assay is capable of detecting the effect you are looking for. If your positive control fails, any negative result in your experimental conditions is uninterpretable - you cannot distinguish 'the treatment had no effect' from 'the assay failed to detect the effect.'"
      },
      {
        type: "ul",
        items: [
          "In a cell viability assay, staurosporine at 1 µM is a standard positive control for cell death",
          "In an ELISA, a recombinant protein at a known concentration confirms the detection antibody is working",
          "In a CRISPR knockout experiment, a validated guide RNA for a housekeeping gene confirms editing efficiency",
          "In an enzyme inhibition assay, a known inhibitor at saturating concentration confirms enzyme activity and assay sensitivity"
        ]
      },
      {
        type: "h2",
        text: "Negative Controls"
      },
      {
        type: "p",
        text: "A negative control is a condition where no effect is expected. It establishes the baseline signal - the noise floor of your assay. Without a negative control, you cannot define what 'no effect' looks like, which means you cannot quantify the magnitude of a real effect."
      },
      {
        type: "p",
        text: "The most common negative control is a vehicle control - treating cells or reactions with the solvent used to dissolve your compound (typically DMSO for small molecules) at the same final concentration. This controls for solvent effects and is mandatory for any pharmacological experiment."
      },
      {
        type: "h2",
        text: "Vehicle Controls"
      },
      {
        type: "p",
        text: "Vehicle controls are a specific type of negative control that account for the solvent effects of your compound carrier. DMSO, for example, affects membrane permeability, transcription, and cell viability at concentrations above 0.5%. Always match the vehicle concentration between your experimental and control conditions."
      },
      {
        type: "h2",
        text: "Blank Controls"
      },
      {
        type: "p",
        text: "A blank control contains all assay components except the analyte you are measuring. It captures background signal from the assay reagents themselves - antibody non-specific binding in an ELISA, autofluorescence in a cell-based fluorescence assay, or background luminescence in a luciferase reporter system. Subtract the blank from all readings before calculating results."
      },
      {
        type: "h2",
        text: "Counter-Screen Controls"
      },
      {
        type: "p",
        text: "Counter-screen controls identify compounds or conditions that interfere with the assay readout rather than with the biology. They are essential in fluorescence-based drug screening, where many compounds absorb light at the detection wavelength and produce false positives. A counter-screen for fluorescence interference runs the assay without the target protein - any signal reduction in this condition is a technical artefact, not target engagement."
      },
      {
        type: "h2",
        text: "Isotype Controls (Immunological Assays)"
      },
      {
        type: "p",
        text: "In flow cytometry and immunofluorescence, isotype controls use an antibody of the same isotype and conjugate as your primary antibody, but with no specificity for any target in your sample. They control for non-specific antibody binding. While their use is sometimes debated in the literature, they remain standard practice for establishing gating strategies in flow cytometry."
      },
      {
        type: "h2",
        text: "Scrambled and Non-Targeting Controls (Gene Silencing)"
      },
      {
        type: "p",
        text: "In siRNA, shRNA, and CRISPR experiments, a non-targeting (scrambled) control - a sequence with no complementarity to any known transcript in the organism - controls for the off-target effects of transfection, viral transduction, or nuclease delivery. Every gene silencing experiment requires this control."
      },
      {
        type: "h2",
        text: "How Many Controls Do You Actually Need?"
      },
      {
        type: "p",
        text: "The principle is minimum sufficient controls - enough to make your results interpretable, but not so many that the controls consume most of your experiment. For most cell-based assays, you need at minimum: vehicle negative control, known positive control, and a no-enzyme/no-protein blank. For immunological assays, add an isotype control. For gene silencing experiments, add a scrambled control. For assays with high false-positive rates (fluorescence screening), add a counter-screen condition."
      },
      {
        type: "callout",
        text: "Shadow AI designs your control strategy as part of the experiment design - specifying which controls are required, at what concentrations, and what each result means. Try it free."
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 6
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "ai-changing-experiment-design-bench-scientists",
    title: "How AI Is Changing Experiment Design for Bench Scientists",
    seoTitle:
      "AI in Experiment Design: How AI Is Transforming Life Sciences Research (2025)",
    description:
      "An honest look at how AI is changing the way bench scientists design experiments - what AI can do well, where it still falls short, and which parts of the scientific process are most affected.",
    publishedAt: "2025-06-20",
    readTimeMin: 7,
    tags: [
      "AI in science",
      "experiment design",
      "AI research tools",
      "life sciences AI",
      "bench science"
    ],
    category: "AI in Research",
    coverEmoji: "🔬",
    sections: [
      {
        type: "p",
        text: "For most of the history of experimental science, the bottleneck has been running experiments - not designing them. Sequencing took weeks. Mass spectrometry required dedicated instruments and operators. Cell lines were difficult to maintain. All of that has changed: modern life sciences labs can generate data at extraordinary speed. The new bottleneck is interpreting data and designing the next experiment intelligently. That is precisely where AI is having the most immediate impact."
      },
      {
        type: "h2",
        text: "What AI Can Do in Experiment Design Today"
      },
      {
        type: "h3",
        text: "Literature Synthesis at Scale"
      },
      {
        type: "p",
        text: "A researcher might read 200–300 papers closely in their career. AI systems have been trained on millions. When designing an experiment, the most time-consuming step is often establishing what is already known - which cell lines have been used, which assay conditions are standard, which controls are required. AI can compress this to seconds."
      },
      {
        type: "h3",
        text: "Hypothesis Generation from Patterns Across Fields"
      },
      {
        type: "p",
        text: "Some of the most productive scientific hypotheses come from importing a mechanism from one field into another. Researchers who work in narrow specialties rarely have the breadth to see those connections. AI systems that span the literature can surface unexpected analogies - a signalling pathway implicated in cancer that has structural parallels to one in neurodegeneration, for instance."
      },
      {
        type: "h3",
        text: "Protocol Drafting from Experimental Design"
      },
      {
        type: "p",
        text: "Once an experimental design is specified - cell line, assay format, compound concentrations, time points, controls - generating the step-by-step protocol is largely a mechanical translation. AI does this well. Shadow AI, for example, produces complete protocols with materials lists, buffer recipes, instrument settings, and troubleshooting notes from a structured experiment design."
      },
      {
        type: "h3",
        text: "Optimisation Suggestions"
      },
      {
        type: "p",
        text: "AI trained on failed and successful experiments can suggest optimisation paths for common technical problems - low transfection efficiency, high background in immunofluorescence, variable qPCR results. This is beginning to move from literature-based suggestion toward actual learned optimisation, though that capability is still maturing."
      },
      {
        type: "h2",
        text: "Where AI Still Falls Short"
      },
      {
        type: "h3",
        text: "Novel, Unprecedented Experiments"
      },
      {
        type: "p",
        text: "AI systems learn from what has already been done. For experiments at the absolute frontier - new organisms, new techniques without established best practices, novel assay formats - AI has no training data to draw on. Here, experienced scientific judgment remains irreplaceable."
      },
      {
        type: "h3",
        text: "Lab-Specific Optimisation"
      },
      {
        type: "p",
        text: "A protocol that works perfectly in one lab may produce inconsistent results in another due to differences in equipment, water quality, reagent sources, and operator technique. AI does not know your specific lab's quirks, and that tacit knowledge is still held by experienced researchers."
      },
      {
        type: "h3",
        text: "Interpreting Unexpected Results"
      },
      {
        type: "p",
        text: "When an experiment produces a surprising result - especially one that contradicts the hypothesis - the scientist needs to decide whether the result reflects a real biological phenomenon or a technical artefact. This judgment call requires deep contextual understanding that AI does not yet reliably possess."
      },
      {
        type: "h2",
        text: "The Right Way to Think About AI in the Lab"
      },
      {
        type: "p",
        text: "AI in experiment design is most usefully thought of as a knowledgeable assistant who has read far more literature than you, can draft faster than you, and never forgets to include the controls - but who needs your scientific judgment at every decision point. The goal is to compress the time between research question and first experiment, not to remove the scientist from the loop."
      },
      {
        type: "p",
        text: "The researchers who will be most effective with AI are those who treat it as an accelerant for their own expertise, not a replacement for it. Use AI to do in ten minutes what used to take a day of literature review and protocol drafting. Use your expertise to evaluate the output, catch the gaps, and make the judgment calls that AI cannot."
      },
      {
        type: "callout",
        text: "Shadow AI is designed to accelerate your experiment design workflow - not replace your scientific judgment. Try it free: describe your research question and get a complete design in minutes."
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 7
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "statistical-power-sample-size-biomedical-research",
    title:
      "Statistical Power and Sample Size in Biomedical Research: A Practical Guide",
    seoTitle:
      "Statistical Power and Sample Size in Biomedical Research - A Practical Guide",
    description:
      "Why statistical power matters in life sciences research, how to calculate the sample size you actually need, and the most common mistakes that lead to underpowered studies. Includes worked examples for cell biology and in vivo experiments.",
    publishedAt: "2025-06-22",
    readTimeMin: 9,
    tags: [
      "statistical power",
      "sample size",
      "biomedical research",
      "statistics",
      "reproducibility"
    ],
    category: "Statistics & Analysis",
    coverEmoji: "📊",
    sections: [
      {
        type: "p",
        text: "Underpowered studies are one of the most pervasive and underappreciated problems in biomedical research. A study that lacks the statistical power to detect a real effect will produce a negative result indistinguishable from a genuine null result - and waste the resources that went into running it. Worse, if the study happens to return a positive result by chance, that result will be a false positive and will not replicate. Understanding statistical power and sample size is not a statistical nicety; it is fundamental to designing experiments worth running."
      },
      {
        type: "h2",
        text: "What Is Statistical Power?"
      },
      {
        type: "p",
        text: "Statistical power is the probability that your experiment will detect a real effect, given that the effect truly exists. Power is typically set at 0.8 in biomedical research - meaning an 80% chance of detecting a real effect. A power of 0.8 means a 20% chance of missing a real effect (a false negative, or Type II error)."
      },
      {
        type: "p",
        text: "Power is determined by four variables: effect size, sample size, significance threshold (alpha), and variability in your measurements. If any of these changes, the power of your study changes."
      },
      {
        type: "h2",
        text: "Effect Size: The Most Commonly Misunderstood Variable"
      },
      {
        type: "p",
        text: "Effect size is the magnitude of the difference you are trying to detect. In a cell viability assay, are you trying to detect a 10% reduction in viability or a 50% reduction? In a qPCR experiment, are you powered to detect a 1.5-fold change or only a 3-fold change? The smaller the effect size, the larger the sample you need to detect it."
      },
      {
        type: "p",
        text: "The most common mistake in biomedical sample size calculation is using an effect size that is too optimistic - often based on a pilot experiment with very few replicates, which will overestimate the effect due to sampling noise. Basing your power calculation on a literature-derived effect size from a well-powered study is more reliable."
      },
      {
        type: "h2",
        text: "How to Calculate Sample Size for Common Experiments"
      },
      {
        type: "h3",
        text: "Two-group comparison (e.g. treated vs. untreated cells)"
      },
      {
        type: "p",
        text: "For a simple two-group comparison with equal group sizes, the required sample size per group can be calculated using a t-test power analysis: n = 2 × ((Z_alpha/2 + Z_beta) / delta)² × sigma², where delta is the expected difference between means, sigma is the standard deviation (estimated from pilot data or the literature), Z_alpha/2 is 1.96 for alpha = 0.05, and Z_beta is 0.84 for power = 0.8."
      },
      {
        type: "h3",
        text: "In vivo animal studies"
      },
      {
        type: "p",
        text: "For in vivo studies, power calculations follow the same logic but require very careful estimation of biological variability, which is much higher in animal models than in cell-based assays. In rodent pharmacology studies, a coefficient of variation of 20–30% is common, requiring larger group sizes than many researchers expect."
      },
      {
        type: "h2",
        text: "Biological vs. Technical Replicates"
      },
      {
        type: "p",
        text: "One of the most consequential errors in life sciences statistics is treating technical replicates (repeated measurements on the same biological sample) as biological replicates (independent biological samples). Statistical power calculations assume biological replicates - independent experiments where each data point comes from a separate biological source."
      },
      {
        type: "p",
        text: "Twelve wells of the same cell passage treated with the same compound are twelve technical replicates - they give you one biological data point, not twelve. Three independent experiments conducted on different days with cells from different passages give you three biological data points. Power calculations require the latter."
      },
      {
        type: "h2",
        text: "Common Mistakes in Power Calculations"
      },
      {
        type: "ul",
        items: [
          "Using an effect size from a pilot experiment with n=3 (severely overestimated due to sampling noise)",
          "Treating technical replicates as biological replicates in the power calculation",
          "Calculating sample size after the experiment and adjusting alpha to make the result 'significant'",
          "Not accounting for expected attrition (animals that die during the study, cell lines that do not behave as expected)",
          "Using a single-tailed test when the direction of effect is not mechanistically constrained",
          "Setting power at 0.8 when the cost of a false negative is very high (use 0.9 for definitive studies)"
        ]
      },
      {
        type: "h2",
        text: "The 3Rs and Statistical Power"
      },
      {
        type: "p",
        text: "In animal research, there is an ethical obligation to use the minimum number of animals necessary to answer the experimental question - but also an obligation to use enough animals to answer the question reliably. An underpowered animal study that produces an inconclusive result is not a refusal; it is animal use that produced no scientific value. Proper power calculation is therefore an ethical requirement in addition to a statistical one."
      },
      {
        type: "callout",
        text: "Shadow AI includes statistical power and sample size recommendations as part of every experiment design - specifying n per group, replication strategy, and the statistical test appropriate for your design. Try it free."
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 8
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "research-question-to-runnable-protocol",
    title:
      "From Research Question to Runnable Protocol: How to Do It in Under an Hour",
    seoTitle:
      "From Research Question to Experiment Protocol in Under an Hour - A Researcher's Guide",
    description:
      "A workflow for moving from a research question to a complete, runnable experimental protocol as efficiently as possible. Covers literature scoping, hypothesis selection, assay design, and AI-assisted protocol writing.",
    publishedAt: "2025-06-24",
    readTimeMin: 7,
    tags: [
      "research workflow",
      "experiment planning",
      "experimental protocol",
      "AI research tools",
      "productivity"
    ],
    category: "Research Workflow",
    coverEmoji: "⚡",
    sections: [
      {
        type: "p",
        text: "The gap between a research question and a protocol in the lab notebook is often measured in days or weeks. Literature review. Hypothesis formulation. Assay selection. Protocol drafting. Control design. Materials sourcing. Each step bleeds into the next, and without a structured approach, the whole process is subject to context-switching, distraction, and the creeping scope of 'just one more paper.'"
      },
      {
        type: "p",
        text: "This guide describes a disciplined, time-bounded workflow for moving from question to protocol. With practice - and with AI assistance at the right stages - this workflow can be executed in under an hour for most standard experiments."
      },
      {
        type: "h2",
        text: "Step 1: Write the Question Precisely (5 minutes)"
      },
      {
        type: "p",
        text: "Before touching a database or a protocol template, write your research question in one sentence. Not a paragraph. One sentence, specific enough that another scientist could tell you what experiment you are talking about."
      },
      {
        type: "p",
        text: "Bad: 'Investigate the role of autophagy in drug resistance.' Good: 'Does rapamycin-induced autophagy reduce doxorubicin sensitivity in MCF-7 breast cancer cells in a 72-hour cytotoxicity assay?'"
      },
      {
        type: "p",
        text: "If you cannot write the question in one precise sentence, you are not ready to design the experiment. Precision at this stage saves hours later."
      },
      {
        type: "h2",
        text: "Step 2: Rapid Literature Scope (15 minutes)"
      },
      {
        type: "p",
        text: "The goal of the literature scope is not to read everything relevant - it is to establish: (1) whether the question has already been answered, (2) which assay formats have been used for similar questions, and (3) what the established controls and expected effect sizes are."
      },
      {
        type: "ul",
        items: [
          "3–5 minutes: keyword search on PubMed or Semantic Scholar, scan titles and abstracts",
          "5 minutes: read the most relevant recent paper's Methods section in full",
          "5 minutes: check for a published review that covers the assay format you are considering",
          "2 minutes: note the n per group and effect sizes reported in similar experiments"
        ]
      },
      {
        type: "p",
        text: "AI tools like Shadow AI or Elicit can compress this step to 2–3 minutes by automatically identifying the most relevant papers and extracting the key experimental parameters."
      },
      {
        type: "h2",
        text: "Step 3: Formulate and Select a Hypothesis (5 minutes)"
      },
      {
        type: "p",
        text: "From the literature scope, you should have enough context to write a specific, mechanistic, testable hypothesis. Write two or three candidate hypotheses - different mechanistic explanations for what you expect to observe - and select the one that is most directly testable with your available resources."
      },
      {
        type: "p",
        text: "The selection criteria: which hypothesis would give the most mechanistically informative result? Which can be tested with your lab's existing capabilities? Which is the most falsifiable?"
      },
      {
        type: "h2",
        text: "Step 4: Design the Experiment (15 minutes)"
      },
      {
        type: "p",
        text: "From the selected hypothesis, define the experiment structure:"
      },
      {
        type: "ol",
        items: [
          "Assay format and primary readout",
          "Cell line or model system",
          "Treatment conditions (concentrations, time points)",
          "Controls (positive, negative, vehicle, counter-screen as appropriate)",
          "Number of biological replicates",
          "Statistical test for the primary comparison"
        ]
      },
      {
        type: "p",
        text: "This is the step where most time is lost to indecision. Constrain yourself: make the best decision you can with available information and move on. The protocol can be refined after the pilot experiment."
      },
      {
        type: "h2",
        text: "Step 5: Write the Protocol (20 minutes)"
      },
      {
        type: "p",
        text: "With the experiment designed, protocol writing is largely mechanical. Start from the closest existing protocol in your lab notebook or an established method from the literature. Modify for your specific conditions. Add your controls explicitly. Specify instrument settings. Write the data collection and analysis plan before you run the experiment."
      },
      {
        type: "p",
        text: "AI tools like Shadow AI can generate a complete first-draft protocol from the experiment design in seconds - including materials list, step-by-step procedure, buffer recipes, and troubleshooting notes. The scientist's role is to review, verify against lab-specific conditions, and sign off."
      },
      {
        type: "h2",
        text: "What AI Does and Does Not Replace in This Workflow"
      },
      {
        type: "p",
        text: "AI accelerates Steps 2, 3, and 5 dramatically. It does not replace Steps 1 and 4 - the precision of the question and the scientific judgment about which hypothesis to pursue and how to design the experiment. Those decisions require a scientist. Everything else is execution."
      },
      {
        type: "callout",
        text: "Shadow AI compresses the research question → protocol workflow to under 10 minutes. Describe your question and get a complete experiment design and protocol. Free to start."
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 9
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "systematic-literature-review-for-researchers",
    title: "How to Do a Literature Review That Actually Helps Your Research",
    seoTitle:
      "How to Do a Scientific Literature Review for Lab Research (2025 Guide)",
    description:
      "A practical guide to doing a literature review that informs your experiment design - not just your introduction. Covers search strategy, paper evaluation, synthesis across conflicting studies, and AI tools that accelerate the process.",
    publishedAt: "2025-06-26",
    readTimeMin: 8,
    tags: [
      "literature review",
      "systematic review",
      "research skills",
      "PubMed",
      "life sciences"
    ],
    category: "Research Skills",
    coverEmoji: "📚",
    sections: [
      {
        type: "p",
        text: "Most scientists learn to do literature reviews the same way they learned to drive - by doing it, without any formal instruction. The result is a process that is often inefficient, incomplete, and - critically - disconnected from the experiment design it is supposed to inform. This guide describes a structured approach to literature review that is useful for lab researchers: focused on what you need to design and interpret experiments, not on what you need to write an introduction."
      },
      {
        type: "h2",
        text: "Why Most Literature Reviews Are Not Useful Enough"
      },
      {
        type: "p",
        text: "The standard approach to literature review in lab science is: search PubMed with a few keywords, read the abstracts, download the relevant papers, skim the methods and results, and add the most useful ones to your reference manager. This approach has two structural problems:"
      },
      {
        type: "ul",
        items: [
          "It is biased toward recent, highly-cited papers - which means you miss the foundational mechanistic work that explains why those papers reached their conclusions",
          "It reads papers as narrative rather than as evidence - you summarise what papers claim rather than evaluating what they actually demonstrated and what the limitations are"
        ]
      },
      {
        type: "h2",
        text: "A Better Framework: Literature Review as Evidence Mapping"
      },
      {
        type: "p",
        text: "Think of a literature review not as reading papers, but as building an evidence map: a structured representation of what is established, what is contested, and what is unknown in the area relevant to your experiment."
      },
      {
        type: "p",
        text: "The evidence map has three zones:"
      },
      {
        type: "ol",
        items: [
          "Established consensus - findings that have been replicated across multiple independent labs and model systems",
          "Contested territory - findings that conflict between studies, often because of differences in cell lines, assay conditions, or interpretation of the same data",
          "Mechanistic gaps - observations without a mechanistic explanation, or predictions from the current model that have not yet been tested"
        ]
      },
      {
        type: "p",
        text: "Your experiment should be designed to address the contested territory or mechanistic gaps - not to replicate the established consensus. If you find yourself designing an experiment whose outcome is already well-established in the literature, you need a better research question."
      },
      {
        type: "h2",
        text: "Building Your Search Strategy"
      },
      {
        type: "ul",
        items: [
          "Start with a broad search to establish the landscape, then narrow iteratively",
          "Use MeSH terms in PubMed for precision; supplement with free-text keyword searches",
          "Search for your assay format specifically - the Methods of relevant papers often cite the original assay development papers, which contain the best controls and expected results",
          "Use citation tracking in both directions: papers that cite a key paper (forward), and papers cited by it (backward)",
          "Look for meta-analyses and systematic reviews in your area - these have already done the synthesis work"
        ]
      },
      {
        type: "h2",
        text: "Evaluating Papers as Evidence, Not as Claims"
      },
      {
        type: "p",
        text: "For each paper you read, ask: what experiment did they actually do, and what does the data show? Not what does the abstract claim, and not what does the discussion conclude. Authors interpret their data; you need to evaluate whether their interpretation is the only valid one."
      },
      {
        type: "ul",
        items: [
          "What was the n? A result from n=3 is much weaker evidence than n=20",
          "What controls were included? A result without appropriate controls is anecdotal",
          "Is the effect size biologically meaningful, or just statistically significant?",
          "Has the result been replicated in an independent lab or model system?",
          "What are the limitations acknowledged in the paper, and what limitations are not acknowledged?"
        ]
      },
      {
        type: "h2",
        text: "Using AI to Accelerate Literature Review"
      },
      {
        type: "p",
        text: "AI tools have significantly changed the literature review workflow for bench scientists. Tools like Elicit can extract structured information from papers - sample sizes, statistical methods, key findings - across hundreds of papers simultaneously. Semantic Scholar can surface papers you would not find through keyword search alone. Shadow AI synthesises the relevant literature around your research question to identify the mechanistic gaps and generate hypotheses."
      },
      {
        type: "p",
        text: "The caution: AI literature tools are excellent at breadth and speed, but they do not replace careful reading of the primary data. Use AI to scope the landscape and identify the most important papers; use your own careful reading to evaluate those papers as evidence."
      },
      {
        type: "h2",
        text: "Synthesising Conflicting Results"
      },
      {
        type: "p",
        text: "Conflicting results in the literature are not a problem to be ignored - they are often the most valuable scientific signal. When two well-run studies report opposite findings, there is almost always a mechanistic explanation: a difference in cell line, passage number, assay conditions, reagent source, or timing. Investigating that discrepancy often leads directly to a productive research question."
      },
      {
        type: "callout",
        text: "Shadow AI reads the literature relevant to your research question and surfaces the key findings, mechanistic gaps, and candidate hypotheses - in minutes. Try it free."
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 10
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "reproducibility-crisis-life-sciences-experiment-design",
    title:
      "The Reproducibility Problem in Life Sciences and How Better Experiment Design Fixes It",
    seoTitle:
      "Reproducibility Crisis in Life Sciences: How Better Experiment Design Helps",
    description:
      "A practical look at the reproducibility crisis in life sciences - what causes it, which problems are in your control as a researcher, and how better experiment design practices can fix the most common sources of irreproducibility.",
    publishedAt: "2025-06-28",
    readTimeMin: 9,
    tags: [
      "reproducibility",
      "replication crisis",
      "experiment design",
      "scientific rigor",
      "open science"
    ],
    category: "Scientific Method",
    coverEmoji: "🔄",
    sections: [
      {
        type: "p",
        text: "The reproducibility crisis in life sciences is not a new discovery. The landmark 2011 paper by Begley and Ellis reported that Amgen scientists could only reproduce 6 out of 53 landmark cancer biology findings. Bayer HealthCare reported that two-thirds of published drug target findings could not be validated internally. More than a decade on, the problem has not been solved - but its causes are now much better understood, and many of them are in the control of individual researchers."
      },
      {
        type: "h2",
        text: "The Causes of Irreproducibility"
      },
      {
        type: "p",
        text: "It is tempting to attribute the reproducibility crisis to research misconduct. But the evidence points to a much more mundane set of causes - most of which are invisible in published papers precisely because the methods sections do not report them."
      },
      {
        type: "h3",
        text: "1. Underpowered studies"
      },
      {
        type: "p",
        text: "A survey of published neuroscience studies found median statistical power of around 20% - meaning only one in five of those studies had enough subjects to reliably detect the effects they were studying. Underpowered studies that produce positive results are, almost by definition, false positives. The result is unreplicable because it was never real."
      },
      {
        type: "h3",
        text: "2. P-hacking and multiple comparisons"
      },
      {
        type: "p",
        text: "When researchers test multiple hypotheses or analysis approaches and report only the statistically significant results, the probability of a false positive increases with each test. A study that tests ten hypotheses and reports the one that achieves p<0.05 has a ~40% chance of a false positive even if none of the effects are real. Pre-registering analysis plans before looking at the data is the solution."
      },
      {
        type: "h3",
        text: "3. Incomplete methods reporting"
      },
      {
        type: "p",
        text: "Published methods sections routinely omit information that is essential for replication: exact reagent catalogue numbers and lot numbers, cell line passage numbers and authentication status, the precise conditions of the statistical analysis, and the criteria used to include or exclude data points. Without this information, replication attempts are guesses."
      },
      {
        type: "h3",
        text: "4. Cell line and reagent issues"
      },
      {
        type: "p",
        text: "A significant fraction of published cell biology research has used misidentified cell lines. HeLa contamination of other cell lines has affected laboratories worldwide for decades. Antibodies with variable specificity between lots are another common source of irreproducibility. The field now recommends STR profiling of cell lines and validation of every antibody in each experimental context."
      },
      {
        type: "h3",
        text: "5. Publication bias toward positive results"
      },
      {
        type: "p",
        text: "Journals are more likely to publish positive results than null results. This means the published literature systematically overrepresents effects that are real and underrepresents negative findings. Researchers designing new experiments based on the published literature are therefore starting from a biased evidence base."
      },
      {
        type: "h2",
        text: "What You Can Do: Reproducibility Best Practices"
      },
      {
        type: "p",
        text: "Many sources of irreproducibility are under the control of individual researchers. These practices significantly improve the reproducibility of your own work:"
      },
      {
        type: "ul",
        items: [
          "Pre-register your analysis plan before unblinding data - specify statistical tests, inclusion/exclusion criteria, and primary outcome in advance",
          "Calculate and report statistical power in your methods - and don't run the experiment if it is underpowered",
          "Use biological replicates, not just technical replicates, and report them honestly",
          "Authenticate your cell lines and include the passage number in every methods section",
          "Report catalogue numbers, lot numbers, and storage conditions for every critical reagent",
          "Include positive and negative controls in every experiment and report their results explicitly",
          "Write complete protocols and deposit them in a repository (protocols.io) so other labs can replicate them exactly",
          "Report all data collected, including failed experiments that met pre-specified validity criteria"
        ]
      },
      {
        type: "h2",
        text: "How Better Experiment Design Prevents Irreproducibility"
      },
      {
        type: "p",
        text: "The root cause of most reproducibility failures is not in the analysis - it is in the design. An experiment that is not powered to detect the effect of interest will produce an unreliable result regardless of how carefully the statistics are run. An experiment without appropriate controls will produce uninterpretable data. An experiment whose protocol is not written down in full will be run differently by every person who attempts to repeat it."
      },
      {
        type: "p",
        text: "Investing time in rigorous experiment design upfront - power calculation, control selection, complete protocol writing, pre-specified analysis plan - is the single highest-return intervention for reproducibility. This is the stage where AI tools like Shadow AI add the most value: ensuring the design includes all the elements required for a reproducible result before the first well is plated."
      },
      {
        type: "h2",
        text: "The Systemic Changes Still Needed"
      },
      {
        type: "p",
        text: "Individual researchers cannot solve the reproducibility crisis alone. Systemic changes - journals that publish null results, funding agencies that reward rigour rather than novelty, institutions that do not incentivise publication volume over quality - are necessary. But those changes are slow. In the meantime, the practices above meaningfully improve the reproducibility of your own work and make you a more trustworthy scientific collaborator."
      },
      {
        type: "callout",
        text: "Shadow AI builds reproducibility best practices into every experiment design - power calculations, control specifications, and complete protocols included by default. Try it free."
      }
    ]
  }
]

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find(p => p.slug === slug)
}

export function getAllSlugs(): string[] {
  return BLOG_POSTS.map(p => p.slug)
}
