import { NextRequest, NextResponse } from "next/server"

// Mock data based on the user's example
const mockDesignData = {
  problem: "Reduce viscosity of bispecific antibody solution at 180 mg/ml",
  objectives: [
    "Evaluate formulation additives for viscosity reduction",
    "Maintain protein stability and activity",
    "Optimize processing conditions",
    "Ensure manufacturability and patient compliance"
  ],
  variables: [
    "Formulation Additive Type",
    "Additive Concentration",
    "Temperature",
    "pH levels",
    "Ionic strength"
  ],
  specialConsiderations: [
    "High protein concentration requirements",
    "Stability maintenance critical",
    "Subcutaneous injection compatibility",
    "Regulatory compliance requirements",
    "Cost-effectiveness of additives"
  ],
  literatureFindings: {
    papers: [
      {
        title:
          "Viscosity Reduction Strategies in High-Concentration Antibody Formulations",
        summary:
          "Comprehensive review of excipients and formulation approaches for reducing viscosity in therapeutic antibody solutions.",
        relevance:
          "Directly applicable to bispecific antibody formulation challenges",
        methodology:
          "Systematic review of 50+ formulation studies with rheological analysis",
        pitfalls: [
          "Some excipients may compromise protein stability",
          "Concentration-dependent effects not always predictable",
          "Aggregation risks with certain additives"
        ]
      },
      {
        title: "Surfactant Effects on Protein Viscosity and Stability",
        summary:
          "Investigation of surfactant types and concentrations on protein solution properties.",
        relevance:
          "Provides insights into surfactant selection for viscosity control",
        methodology:
          "Multi-factorial experimental design with rheological measurements",
        pitfalls: [
          "High surfactant concentrations can cause foaming",
          "Protein-surfactant interactions may alter efficacy"
        ]
      },
      {
        title: "Temperature and pH Optimization for Antibody Formulations",
        summary:
          "Study on environmental factors affecting antibody solution properties.",
        relevance: "Critical for processing condition optimization",
        methodology: "Design of experiments approach with stability monitoring",
        pitfalls: [
          "Temperature sensitivity varies by protein",
          "pH changes can affect protein charge and interactions"
        ]
      }
    ],
    searchResults: {
      totalResults: 45,
      sources: {
        pubmed: [
          {
            title:
              "Novel Excipients for High-Concentration Antibody Formulations",
            authors: ["Smith, J.A.", "Johnson, B.R.", "Williams, C.D."],
            abstract:
              "This study investigates the use of novel excipients including trehalose, arginine, and polysorbate variants for reducing viscosity in high-concentration antibody formulations while maintaining stability...",
            publishedDate: "2023",
            journal: "Journal of Pharmaceutical Sciences",
            citationCount: 45,
            url: "https://pubmed.ncbi.nlm.nih.gov/12345678",
            source: "pubmed" as const,
            relevanceScore: 0.95
          },
          {
            title: "Rheological Properties of Bispecific Antibody Solutions",
            authors: ["Chen, L.", "Rodriguez, M.", "Kim, S."],
            abstract:
              "Comprehensive analysis of rheological behavior in bispecific antibody solutions at various concentrations, with focus on viscosity reduction strategies...",
            publishedDate: "2023",
            journal: "Biotechnology and Bioengineering",
            citationCount: 32,
            url: "https://pubmed.ncbi.nlm.nih.gov/12345679",
            source: "pubmed" as const,
            relevanceScore: 0.92
          }
        ],
        arxiv: [
          {
            title:
              "Machine Learning Approaches to Protein Formulation Optimization",
            authors: ["Thompson, R.", "Davis, K."],
            abstract:
              "Novel computational methods for predicting optimal formulation conditions using machine learning algorithms trained on large datasets of protein formulation experiments...",
            publishedDate: "2024",
            url: "https://arxiv.org/abs/2024.0001",
            source: "arxiv" as const,
            relevanceScore: 0.88
          }
        ],
        scholar: [
          {
            title: "Formulation Science for Therapeutic Proteins",
            authors: ["Brown, A.L.", "Taylor, S.M."],
            abstract:
              "Comprehensive guide to formulation development for therapeutic proteins, including viscosity management and stability optimization...",
            publishedDate: "2023",
            citationCount: 78,
            url: "https://scholar.google.com/example1",
            source: "scholar" as const,
            relevanceScore: 0.9
          }
        ],
        semanticScholar: [
          {
            title:
              "Advanced Characterization of Protein-Excipient Interactions",
            authors: ["Wilson, P.", "Martinez, J."],
            abstract:
              "Detailed investigation of molecular interactions between therapeutic proteins and formulation excipients using advanced analytical techniques...",
            publishedDate: "2023",
            journal: "Molecular Pharmaceutics",
            citationCount: 28,
            url: "https://semanticscholar.org/example1",
            source: "semantic_scholar" as const,
            relevanceScore: 0.87
          }
        ],
        tavily: [
          {
            title: "Latest Developments in Antibody Formulation Technologies",
            authors: [],
            abstract:
              "Recent industry reports and developments in antibody formulation technologies, including novel approaches to viscosity reduction and stability enhancement...",
            publishedDate: "2024",
            url: "https://tavily.com/example1",
            source: "tavily" as const,
            relevanceScore: 0.85
          }
        ]
      },
      synthesizedFindings: {
        keyMethodologies: [
          "Use of kosmotropic salts for protein stabilization",
          "Combination excipient approaches for synergistic effects",
          "Temperature-controlled processing to minimize aggregation",
          "pH optimization based on protein isoelectric point",
          "Rheological characterization using advanced viscometry"
        ],
        commonPitfalls: [
          "Overlooking protein-excipient interaction effects",
          "Insufficient stability testing under stress conditions",
          "Inadequate viscosity measurements across shear rates",
          "Ignoring container-closure compatibility",
          "Underestimating manufacturing scale-up challenges"
        ],
        recommendedApproaches: [
          "Systematic screening of excipient combinations",
          "Use of design of experiments methodology",
          "Multi-parameter optimization including stability",
          "Early-stage manufacturability assessment",
          "Comprehensive analytical characterization"
        ],
        novelInsights: [
          "AI-driven formulation prediction models showing promise",
          "New surfactant classes with improved protein compatibility",
          "Advanced rheological modifiers for injectable formulations",
          "Microfluidic approaches for formulation screening",
          "Real-time viscosity monitoring during manufacturing"
        ]
      }
    },
    synthesizedInsights: {
      keyMethodologies: [
        "Multi-factorial experimental design approach",
        "Systematic excipient screening protocols",
        "Advanced rheological characterization techniques",
        "Accelerated stability testing methods",
        "Protein-excipient interaction analysis"
      ],
      commonPitfalls: [
        "Inadequate consideration of protein-excipient interactions",
        "Insufficient long-term stability data",
        "Limited rheological characterization",
        "Manufacturing scalability issues",
        "Regulatory compliance oversights"
      ],
      recommendedApproaches: [
        "Design of experiments for systematic optimization",
        "Combination excipient strategies",
        "Temperature and pH co-optimization",
        "Early manufacturability assessment",
        "Comprehensive analytical development"
      ],
      novelInsights: [
        "Machine learning for formulation prediction",
        "Novel biocompatible viscosity reducers",
        "Advanced characterization techniques",
        "Continuous manufacturing integration",
        "Patient-centric formulation design"
      ]
    }
  },
  dataAnalysis: {
    correlations: [
      "Negative correlation between surfactant concentration and viscosity",
      "Positive correlation between temperature and protein flexibility",
      "Strong correlation between ionic strength and protein-protein interactions",
      "Inverse relationship between pH and aggregation tendency"
    ],
    outliers: [
      "Unusually high viscosity at moderate surfactant concentrations",
      "Unexpected stability loss at optimal pH conditions",
      "Anomalous rheological behavior at specific temperature ranges",
      "Irregular aggregation patterns with certain excipient combinations"
    ],
    keyFindings: [
      "Optimal surfactant concentration range identified: 0.05-0.15%",
      "Temperature control critical below 25°C for stability",
      "pH range 6.0-7.0 provides best viscosity-stability balance",
      "Combination of trehalose and arginine shows synergistic effects"
    ],
    metrics: [
      "Viscosity reduction: 35-60% achievable",
      "Stability maintenance: >95% over 6 months",
      "Aggregation levels: <2% monomer loss",
      "Injection force reduction: 40-50%"
    ]
  },
  experimentDesign: {
    hypothesis:
      "Incorporating specific formulation additives such as surfactants and adjusting processing conditions will result in the reduction of the viscosity of the bispecific antibody solution at 180 mg/ml without compromising its stability and activity.",
    factors: [
      {
        name: "Formulation Additive Type",
        levels: [
          "None (Control)",
          "Surfactant A (Polysorbate 80)",
          "Surfactant B (Poloxamer 188)",
          "Salt C (Sodium Citrate)"
        ]
      },
      {
        name: "Additive Concentration",
        levels: ["Low (0.05%)", "Medium (0.1%)", "High (0.2%)"]
      },
      {
        name: "Temperature",
        levels: [
          "4°C (Storage)",
          "25°C (Room Temperature)",
          "37°C (Body Temperature)"
        ]
      },
      {
        name: "pH Level",
        levels: ["6.0", "6.5", "7.0"]
      }
    ],
    randomization:
      "Randomize the order of testing each combination of formulation additives and conditions to minimize systematic errors. Use block randomization to ensure balanced representation across all factor combinations.",
    statisticalPlan: {
      methods: [
        "Full factorial ANOVA to assess the impact of different factors on viscosity",
        "Multiple regression analysis to model the relationship between additive concentrations and viscosity",
        "Response surface methodology to optimize factor combinations",
        "Post-hoc Tukey HSD tests for pairwise comparisons"
      ],
      significance:
        "Use a significance level of 0.05 to determine statistically significant effects. Power analysis indicates n=3 replicates needed for 80% power to detect 20% viscosity reduction."
    }
  },
  finalReport: {
    introduction:
      "Viscosity poses significant challenges in the formulation of bispecific antibodies, especially at high concentrations required for therapeutic efficacy. This study aims to lower the viscosity of a bispecific antibody at 180 mg/ml while maintaining stability and activity, thus enhancing manufacturability and patient compliance. High viscosity can lead to injection difficulties, patient discomfort, and manufacturing challenges.",
    literatureSummary:
      "The literature suggests utilizing colloidal and self-assembly approaches and computational models to explore viscosity reduction. However, a lack of experimental validation highlights the need for empirical studies. Recent advances in excipient science and formulation design provide new opportunities for viscosity management while maintaining protein integrity.",
    dataInsights:
      "Historical data suggest that specific additives and precise control of processing conditions can reduce viscosity effectively. However, attention must be given to concentrations that could inversely increase viscosity. Analysis of 45 relevant studies shows consistent patterns in excipient effectiveness and optimal concentration ranges.",
    hypothesis:
      "Incorporating specific formulation additives such as surfactants and adjusting processing conditions will result in the reduction of the viscosity of the bispecific antibody solution at 180 mg/ml without compromising its stability and activity.",
    designOfExperiments:
      "The DOE proposes evaluating the impact of different additives, concentrations, temperatures, and pH levels. A full factorial design will be employed with 4 factors at multiple levels. Randomized testing is employed to reduce bias, with ANOVA and regression analysis for comprehensive statistical evaluation. The design includes appropriate controls and replication for robust conclusions.",
    statisticalAnalysis:
      "Statistical analysis will employ ANOVA to assess factor significance, followed by regression modeling to predict optimal conditions. Response surface methodology will identify optimal factor combinations. Multiple comparison tests will determine which specific conditions differ significantly. Power analysis confirms adequate sample size for detecting meaningful differences.",
    recommendations:
      "Implement the proposed factorial design to systematically evaluate formulation variables. Priority should be given to surfactant type and concentration optimization, followed by pH and temperature studies. Consider combination approaches for synergistic effects. Establish robust analytical methods for viscosity and stability monitoring throughout the study. Plan for scale-up considerations in final formulation selection."
  }
}

export async function POST(req: NextRequest) {
  console.log("🎭 [MOCK_API] Mock design draft API called")

  try {
    const requestData = await req.json()
    console.log("📥 [MOCK_API] Request data:", requestData)

    // Add 2 second delay to simulate real API
    console.log("⏳ [MOCK_API] Simulating 2-second processing delay...")
    await new Promise(resolve => setTimeout(resolve, 2000))

    console.log("✅ [MOCK_API] Returning mock design data")
    return NextResponse.json(mockDesignData)
  } catch (error) {
    console.error("❌ [MOCK_API] Error:", error)
    return NextResponse.json(
      { success: false, error: "Mock API error" },
      { status: 500 }
    )
  }
}
