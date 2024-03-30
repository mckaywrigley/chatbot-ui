import { PluginID, PluginSummary } from "@/types/plugins"

export const availablePlugins: PluginSummary[] = [
  {
    id: 0,
    name: "None",
    selectorName: "No plugin selected",
    value: PluginID.NONE,
    categories: ["Uncategorized"],
    isInstalled: false,
    isPremium: false,
    starters: [
      {
        title: "Explain How To",
        description: "identify and exploit XSS vulnerabilities",
        chatMessage: "Explain how to identify and exploit XSS vulnerabilities."
      },
      {
        title: "Explain How To",
        description: "identify information disclosure vulnerabilities",
        chatMessage:
          "Explain how to identify information disclosure vulnerabilities."
      },
      {
        title: "Recommend",
        description: "some CLI tools for network hacking?",
        chatMessage: "Recommend some CLI tools for network hacking?"
      },
      {
        title: "Provide Techniques",
        description: "to bypass two-factor authentication",
        chatMessage: "Provide techniques to bypass two-factor authentication"
      }
    ]
  },
  {
    id: 1,
    name: "CVEMap",
    selectorName: "CVEMap: Explore CVEs",
    value: PluginID.CVEMAP,
    icon: "https://avatars.githubusercontent.com/u/50994705",
    description:
      "Efficiently explore CVE databases, linking vulnerabilities to exploits and remediations.",
    categories: ["Free", "Popular", "New"],
    githubRepoUrl: "https://github.com/projectdiscovery/cvemap",
    isInstalled: false,
    isPremium: false,
    starters: [
      {
        title: "Provide Me With",
        description: "the latest CVEs with the severity of critical",
        chatMessage:
          "Provide me with the latest CVEs with the severity of critical."
      },
      {
        title: "Provide Me With",
        description: "the CVEs for Microsoft that have nuclei templates",
        chatMessage:
          "Provide me with the CVEs for Microsoft that have nuclei templates."
      },
      {
        title: "Provide Information About",
        description: "CVE-2024-23897 (critical LFI in Jenkins)",
        chatMessage:
          "Provide information about CVE-2024-23897 (critical LFI in Jenkins)."
      },
      {
        title: "CVEMap Help",
        description: "How does the CVEMap plugin work?",
        chatMessage: "How does the CVEMap plugin work?"
      }
    ]
  },
  {
    id: 2,
    name: "Subfinder",
    selectorName: "Subfinder: Discover Subdomains",
    value: PluginID.SUBFINDER,
    icon: "https://avatars.githubusercontent.com/u/50994705",
    description:
      "A robust discovery tool for passive enumeration on valid subdomains",
    categories: ["Free", "Popular"],
    githubRepoUrl: "https://github.com/projectdiscovery/subfinder",
    isInstalled: false,
    isPremium: false,
    starters: [
      {
        title: "Start Subdomain Discovery",
        description: "for reddit.com",
        chatMessage: "Start subdomain discovery for reddit.com"
      },
      {
        title: "Scan For Active-Only",
        description: "subdomains of hackthebox.com",
        chatMessage: "Scan for active-only subdomains of hackthebox.com"
      },
      {
        title: "Scan For Subdomains",
        description: "of netflix.com including their host IPs",
        chatMessage:
          "Scan for subdomains of netflix.com including their host IPs."
      },
      {
        title: "Subfinder Help",
        description: "How does the Subfinder plugin work?",
        chatMessage: "How does the Subfinder plugin work?"
      }
    ]
  },
  {
    id: 3,
    name: "CyberChef",
    selectorName: "CyberChef: Data Manipulation",
    value: PluginID.CYBERCHEF,
    icon: "https://gchq.github.io/CyberChef/images/cyberchef-128x128.png",
    description:
      "A tool for for encryption, encoding, compression, and data analysis.",
    categories: ["Free", "Popular", "New"],
    githubRepoUrl: "https://github.com/gchq/CyberChef",
    isInstalled: false,
    isPremium: false,
    starters: [
      // {
      //   title: "Encode/Decode",
      //   description: "Quickly encode or decode data.",
      //   chatMessage: "/encode-decode"
      // },
      {
        title: "Decode The Following",
        description: "sequence: '54 68 65 20 77 6f 72 6c 64 20 69 73...",
        chatMessage:
          "Decode the following sequence: '54 68 65 20 77 6f 72 6c 64 20 69 73 20 61 20 64 61 6e 67 65 72 6f 75 73 20 70 6c 61 63 65 2c 20 6e 6f 74 20 62 65 63 61 75 73 65 20 6f 66 20 74 68 6f 73 65 20 77 68 6f 20 64 6f 20 65 76 69 6c 2c 20 62 75 74 20 62 65 63 61 75 73 65 20 6f 66 20 74 68 6f 73 65 20 77 68 6f 20 6c 6f 6f 6b 20 6f 6e 20 61 6e 64 20 64 6f 20 6e 6f 74 68 69 6e 67 2e'"
      },
      // {
      //   title: "CyberChef Help",
      //   description: "Learn how to use CyberChef with tutorials and guides.",
      //   chatMessage: "/cyberchef-help"
      // },
      {
        title: "CyberChef Help",
        description: "How does the CyberChef plugin work?",
        chatMessage: "How does the CyberChef plugin work?"
      }
    ]
  },
  {
    id: 4,
    name: "GoLinkFinder",
    selectorName: "GoLinkFinder: URL Extraction",
    value: PluginID.GOLINKFINDER,
    icon: "https://cdn-icons-png.flaticon.com/512/5972/5972097.png",
    description: "A minimalistic JavaScript endpoint extractor.",
    categories: ["Free", "New", "Popular"],
    githubRepoUrl: "https://github.com/0xsha/GoLinkFinder",
    isInstalled: false,
    isPremium: false,
    starters: [
      // {
      //   title: "Start URL Extraction",
      //   description: "Extract URLs from JavaScript files.",
      //   chatMessage: "/start-url-extraction"
      // },
      // {
      //   title: "GoLinkFinder Settings",
      //   description: "Adjust GoLinkFinder settings for your needs.",
      //   chatMessage: "/golinkfinder-settings"
      // },
      // {
      //   title: "GoLinkFinder Help",
      //   description: "Get help on how to use GoLinkFinder effectively.",
      //   chatMessage: "/golinkfinder-help"
      // },
      {
        title: "GoLinkFinder Help",
        description: "How does the GoLinkFinder plugin work?",
        chatMessage: "How does the GoLinkFinder plugin work?"
      }
    ]
  },
  {
    id: 5,
    name: "Web Scraper",
    selectorName: "Web Scraper: Extract Data from Websites",
    value: PluginID.WEB_SCRAPER,
    icon: "https://cdn-icons-png.flaticon.com/512/11892/11892629.png",
    description: "Extract data from websites and chat with the extracted data",
    categories: ["Free", "Popular", "New"],
    githubRepoUrl: "https://github.com/Hacker-GPT/HackerGPT-2.0",
    isInstalled: false,
    isPremium: false,
    starters: [
      // {
      //   title: "Initiate Scraping",
      //   description: "Start scraping data from specified websites.",
      //   chatMessage: "/initiate-scraping"
      // },
      // {
      //   title: "Web Scraper Help",
      //   description: "Learn how to use the Web Scraper for data extraction.",
      //   chatMessage: "/web-scraper-help"
      // },
      // {
      //   title: "Customize Scraping",
      //   description: "Customize scraping parameters for optimized results.",
      //   chatMessage: "/customize-scraping"
      // },
      {
        title: "Web Scraper Help",
        description: "How does the Web Scraper plugin work?",
        chatMessage: "How does the Web Scraper plugin work?"
      }
    ]
  },
  {
    id: 6,
    name: "Nuclei",
    selectorName: "Nuclei: Discover Vulnerabilities",
    value: PluginID.NUCLEI,
    icon: "https://avatars.githubusercontent.com/u/50994705",
    description: "Fast and customisable vulnerability scanner",
    categories: ["Popular"],
    githubRepoUrl: "https://github.com/projectdiscovery/nuclei",
    isInstalled: false,
    isPremium: true,
    starters: [
      // {
      //   title: "Start Vulnerability Scan",
      //   description:
      //     "Scan for vulnerabilities in your network or applications.",
      //   chatMessage: "/start-vulnerability-scan"
      // },
      // {
      //   title: "Nuclei Templates",
      //   description: "Use or contribute to Nuclei's vast template library.",
      //   chatMessage: "/nuclei-templates"
      // },
      // {
      //   title: "Nuclei Help",
      //   description: "Get help on how to configure and use Nuclei effectively.",
      //   chatMessage: "/nuclei-help"
      // },
      {
        title: "Nuclei Help",
        description: "How does the Nuclei plugin work?",
        chatMessage: "How does the Nuclei plugin work?"
      }
    ]
  },
  {
    id: 7,
    name: "Katana",
    selectorName: "Katana: Crawl Websites",
    value: PluginID.KATANA,
    icon: "https://avatars.githubusercontent.com/u/50994705",
    description:
      "A web crawling framework designed to navigate and parse for hidden details",
    categories: ["Popular"],
    githubRepoUrl: "https://github.com/projectdiscovery/katana",
    isInstalled: false,
    isPremium: true,
    starters: [
      // {
      //   title: "Initiate Web Crawling",
      //   description: "Start crawling websites for information gathering.",
      //   chatMessage: "/initiate-web-crawling"
      // },
      // {
      //   title: "Katana Configuration",
      //   description: "Configure Katana for targeted web crawling.",
      //   chatMessage: "/katana-configuration"
      // },
      // {
      //   title: "Katana Usage Guide",
      //   description: "Learn how to use Katana effectively for web crawling.",
      //   chatMessage: "/katana-usage-guide"
      // },
      {
        title: "Katana Help",
        description: "How does the Katana plugin work?",
        chatMessage: "How does the Katana plugin work?"
      }
    ]
  },
  {
    id: 8,
    name: "HttpX",
    selectorName: "HttpX: Web Analysis",
    value: PluginID.HTTPX,
    icon: "https://avatars.githubusercontent.com/u/50994705",
    description:
      "An HTTP toolkit that probes services, web servers, and other valuable metadata",
    categories: ["Popular"],
    githubRepoUrl: "https://github.com/projectdiscovery/httpx",
    isInstalled: false,
    isPremium: true,
    starters: [
      // {
      //   title: "Start HTTP Analysis",
      //   description: "Analyze HTTP servers for useful information.",
      //   chatMessage: "/start-http-analysis"
      // },
      // {
      //   title: "HttpX Configuration",
      //   description: "Configure HttpX for your specific analysis needs.",
      //   chatMessage: "/httpx-configuration"
      // },
      // {
      //   title: "HttpX Help",
      //   description: "Get help on how to use HttpX for web analysis.",
      //   chatMessage: "/httpx-help"
      // },
      {
        title: "HttpX Help",
        description: "How does the HttpX plugin work?",
        chatMessage: "How does the HttpX plugin work?"
      }
    ]
  },
  {
    id: 9,
    name: "Naabu",
    selectorName: "Naabu: Discover Ports",
    value: PluginID.NAABU,
    icon: "https://avatars.githubusercontent.com/u/50994705",
    description:
      "A fast port scanner designed to scan large networks at high speed",
    categories: ["Popular"],
    githubRepoUrl: "https://github.com/projectdiscovery/naabu",
    isInstalled: false,
    isPremium: true,
    starters: [
      {
        title: "Start Port Scanning",
        description: "for shopify.com",
        chatMessage: "Start port scanning for shopify.com"
      },
      // {
      //   title: "Naabu Configuration",
      //   description: "Adjust Naabu settings for optimized port scanning.",
      //   chatMessage: "/naabu-configuration"
      // },
      // {
      //   title: "Naabu Usage Guide",
      //   description: "Learn how to use Naabu for efficient port scanning.",
      //   chatMessage: "/naabu-usage-guide"
      // },
      {
        title: "Naabu Help",
        description: "How does the Naabu plugin work?",
        chatMessage: "How does the Naabu plugin work?"
      }
    ]
  },
  {
    id: 10,
    name: "GAU",
    selectorName: "GAU: Url Enumeration",
    value: PluginID.GAU,
    icon: "https://avatars.githubusercontent.com/u/19563282",
    description:
      "Fetches known URLs from AlienVault's Open Threat Exchange, the Wayback Machine, Common Crawl, and URLScan.",
    categories: ["Free"],
    githubRepoUrl: "https://github.com/lc/gau",
    isInstalled: false,
    isPremium: false,
    starters: [
      {
        title: "Start URL Enumeration",
        description: "for tesla.com",
        chatMessage: "Enumerate URLs for tesla.com"
      },
      // {
      //   title: "GAU Guide",
      //   description: "Learn how to use GAU for URL enumeration.",
      //   chatMessage: "/gau-guide"
      // },
      // {
      //   title: "GAU Settings",
      //   description: "Configure GAU settings for your enumeration needs.",
      //   chatMessage: "/gau-settings"
      // },
      {
        title: "GAU Help",
        description: "How does the GAU plugin work?",
        chatMessage: "How does the GAU plugin work?"
      }
    ]
  },
  {
    id: 11,
    name: "AlterX",
    selectorName: "AlterX: Subdomain Wordlist Generator",
    value: PluginID.ALTERX,
    icon: "https://avatars.githubusercontent.com/u/50994705",
    description: "Fast and customizable subdomain wordlist generator",
    categories: ["Free"],
    githubRepoUrl: "https://github.com/projectdiscovery/alterx",
    isInstalled: false,
    isPremium: false,
    starters: [
      {
        title: "Generate Subdomain Wordlist",
        description: "for hackerone.com",
        chatMessage: "Generate custom subdomain wordlist for hackerone.com"
      },
      // {
      //   title: "AlterX Help",
      //   description: "Learn how to use AlterX for wordlist generation.",
      //   chatMessage: "/alterx-help"
      // },
      // {
      //   title: "Customize Wordlist Generation",
      //   description: "Customize parameters for targeted wordlist generation.",
      //   chatMessage: "/customize-wordlist-generation"
      // },
      {
        title: "AlterX Help",
        description: "How does the AlterX plugin work?",
        chatMessage: "How does the AlterX plugin work?"
      }
    ]
  },
  {
    id: 99,
    name: "Plugins Store",
    selectorName: "Plugins Store",
    value: PluginID.PLUGINS_STORE,
    categories: ["Uncategorized"],
    isInstalled: false,
    isPremium: false,
    starters: []
  }
]
