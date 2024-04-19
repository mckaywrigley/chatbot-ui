import { PluginID, pluginUrls, PluginSummary } from "@/types/plugins"

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
        title: "Provide General Methodology",
        description: "for file upload vulnerabilities",
        chatMessage:
          "Provide General Methodology for file upload vulnerabilities."
      },
      {
        title: "Provide Techniques",
        description: "to bypass two-factor authentication",
        chatMessage: "Provide techniques to bypass two-factor authentication."
      }
    ]
  },
  {
    id: 1,
    name: "CVEMap",
    selectorName: "CVEMap: CVE Database",
    value: PluginID.CVEMAP,
    icon: "https://avatars.githubusercontent.com/u/50994705",
    description: "Navigate the CVE jungle with ease",
    categories: ["Free", "Popular", "New"],
    githubRepoUrl: pluginUrls.CVEmap,
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
        chatMessage: "/cvemap -help"
      }
    ]
  },
  {
    id: 2,
    name: "CyberChef",
    selectorName: "CyberChef: Data Manipulation",
    value: PluginID.CYBERCHEF,
    icon: "https://gchq.github.io/CyberChef/images/cyberchef-128x128.png",
    description:
      "A tool for for encryption, encoding, compression, and data analysis",
    categories: ["Free", "Popular", "New"],
    githubRepoUrl: pluginUrls.Cyberchef,
    isInstalled: false,
    isPremium: false,
    starters: [
      {
        title: "Encode The Following",
        description: "to base64: 'This is your last chance. After this...",
        chatMessage:
          "Encode the following to base64: 'This is your last chance. After this, there is no turning back. You take the blue pill - the story ends, you wake up in your bed and believe whatever you want to believe. You take the red pill - you stay in Wonderland and I show you how deep the rabbit hole goes.'"
      },
      {
        title: "Decode The Following",
        description: "sequence: '54 68 65 20 77 6f 72 6c 64 20 69 73...",
        chatMessage:
          "Decode the following sequence: '54 68 65 20 77 6f 72 6c 64 20 69 73 20 61 20 64 61 6e 67 65 72 6f 75 73 20 70 6c 61 63 65 2c 20 6e 6f 74 20 62 65 63 61 75 73 65 20 6f 66 20 74 68 6f 73 65 20 77 68 6f 20 64 6f 20 65 76 69 6c 2c 20 62 75 74 20 62 65 63 61 75 73 65 20 6f 66 20 74 68 6f 73 65 20 77 68 6f 20 6c 6f 6f 6b 20 6f 6e 20 61 6e 64 20 64 6f 20 6e 6f 74 68 69 6e 67 2e'"
      },
      {
        title: "Help Me Decode",
        description: "this Morse Code-based 64 encoding: 'Li4uLiAu...",
        chatMessage:
          "Help me decode this Morse Code-based 64 encoding: 'Li4uLiAuLSAuLS0uIC4tLS4gLS4tLQouLi4uIC4tIC0uLS4gLS4tIC4uIC0uIC0tLg=='"
      },
      {
        title: "CyberChef Help",
        description: "How does the CyberChef plugin work?",
        chatMessage: "How does the CyberChef plugin work?"
      }
    ]
  },
  {
    id: 3,
    name: "Subfinder",
    selectorName: "Subfinder: Subdomain Finder",
    value: PluginID.SUBFINDER,
    icon: "https://avatars.githubusercontent.com/u/50994705",
    description: "Fast passive subdomain enumeration tool",
    categories: ["Free", "Popular"],
    githubRepoUrl: pluginUrls.Subfinder,
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
        chatMessage: "/subfinder -help"
      }
    ]
  },
  {
    id: 4,
    name: "Web Scraper",
    selectorName: "Web Scraper: Website Data Extractor",
    value: PluginID.WEB_SCRAPER,
    icon: "https://cdn-icons-png.flaticon.com/512/11892/11892629.png",
    description: "Extract data from websites and chat with the extracted data",
    categories: ["Free", "Popular", "New"],
    githubRepoUrl: "https://github.com/Hacker-GPT/HackerGPT-2.0",
    isInstalled: false,
    isPremium: false,
    starters: [
      {
        title: "Scrape Data",
        description: "from https://github.com/Hacker-GPT/...",
        chatMessage: "https://github.com/Hacker-GPT/HackerGPT-2.0"
      },
      {
        title: "Web Scraper Help",
        description: "How does the Web Scraper plugin work?",
        chatMessage: "How does the Web Scraper plugin work?"
      }
    ]
  },
  {
    id: 5,
    name: "GoLinkFinder",
    selectorName: "GoLinkFinder: Endpoint Extractor",
    value: PluginID.GOLINKFINDER,
    icon: "https://cdn-icons-png.flaticon.com/512/5972/5972097.png",
    description: "Fast and minimal JS endpoint extractor",
    categories: ["Free", "New", "Popular"],
    githubRepoUrl: pluginUrls.GoLinkFinder,
    isInstalled: false,
    isPremium: false,
    starters: [
      {
        title: "Extract URLs",
        description: "from https://www.hackerone.com/product/...",
        chatMessage:
          "Extract URLs from https://www.hackerone.com/product/overview"
      },
      {
        title: "GoLinkFinder Help",
        description: "How does the GoLinkFinder plugin work?",
        chatMessage: "/golinkfinder -help"
      }
    ]
  },
  {
    id: 6,
    name: "Nuclei",
    selectorName: "Nuclei: Website Vulnerability Scanner",
    value: PluginID.NUCLEI,
    icon: "https://avatars.githubusercontent.com/u/50994705",
    description: "Fast and customisable vulnerability scanner",
    categories: ["Popular"],
    githubRepoUrl: pluginUrls.Nuclei,
    isInstalled: false,
    isPremium: true,
    starters: [
      {
        title: "Start Vulnerability Scan",
        description: "for hackerone.com with a focus on cves and osint",
        chatMessage:
          "Start vulnerability scan for hackerone.com with a focus on cves and osint."
      },
      {
        title: "Initiate Web Tech Detection Scan",
        description: "on hackerone.com",
        chatMessage: "/nuclei -u hackerone.com -tags tech"
      },
      {
        title: "Perform Automatic Scan",
        description: "for hackerone.com",
        chatMessage: "/nuclei -target hackerone.com -automatic-scan"
      },
      {
        title: "Nuclei Help",
        description: "How does the Nuclei plugin work?",
        chatMessage: "/nuclei -help"
      }
    ]
  },
  {
    id: 7,
    name: "Katana",
    selectorName: "Katana: Web Crawling",
    value: PluginID.KATANA,
    icon: "https://avatars.githubusercontent.com/u/50994705",
    description:
      "Web crawling framework designed to navigate and parse for hidden details",
    categories: ["Popular"],
    githubRepoUrl: pluginUrls.Katana,
    isInstalled: false,
    isPremium: true,
    starters: [
      {
        title: "Crawl With JavaScript Parsing",
        description: "for dynamic content on hackerone.com",
        chatMessage: "/katana -u hackerone.com -js-crawl"
      },
      {
        title: "Perform Scope-Defined Crawling",
        description: "on hackerone.com",
        chatMessage: "/katana -u hackerone.com -crawl-scope '.*hackerone.com*'"
      },
      {
        title: "Filter Content by Extension",
        description: "on target.com, excluding CSS and PNG",
        chatMessage: "/katana -u hackerone.com -extension-filter png,css"
      },
      {
        title: "Katana Help",
        description: "How does the Katana plugin work?",
        chatMessage: "/katana -help"
      }
    ]
  },
  {
    id: 8,
    name: "HTTPX",
    selectorName: "HTTPX: Web Analysis",
    value: PluginID.HTTPX,
    icon: "https://avatars.githubusercontent.com/u/50994705",
    description:
      "Fast and multi-purpose HTTP toolkit that allows running multiple probes",
    categories: ["Popular"],
    githubRepoUrl: pluginUrls.Httpx,
    isInstalled: false,
    isPremium: true,
    starters: [
      {
        title: "Start HTTP Analysis",
        description: "on hackerone.com, revealing server details ...",
        chatMessage: "httpx -u hackerone.com"
      },
      {
        title: "Detect Web Technologies",
        description: "on hackerone.com, utilizing Wappalyzer dataset...",
        chatMessage: "httpx -u hackerone.com -tech-detect"
      },
      {
        title: "Security Headers Analysis",
        description: "on hackerone.com, inspecting for security-...",
        chatMessage: "httpx -u hackerone.com -include-response-header -json"
      },
      {
        title: "HTTPX Help",
        description: "How does the HTTPX plugin work?",
        chatMessage: "/httpx -help"
      }
    ]
  },
  {
    id: 9,
    name: "Naabu",
    selectorName: "Naabu: Port Scanner",
    value: PluginID.NAABU,
    icon: "https://avatars.githubusercontent.com/u/50994705",
    description:
      "Fast port scanner written in go with a focus on reliability and simplicity",
    categories: ["Popular"],
    githubRepoUrl: pluginUrls.Naabu,
    isInstalled: false,
    isPremium: true,
    starters: [
      {
        title: "Start Port Scanning",
        description: "for shopify.com",
        chatMessage: "Start port scanning for shopify.com"
      },
      {
        title: "Scan ports 80, 443, and 8080",
        description: "for hackerone.com and its subdomains: ...",
        chatMessage:
          "Scan ports 80, 443, and 8080 for hackerone.com and its subdomains: api.hackerone.com, docs.hackerone.com, resources.hackerone.com, gslink.hackerone.com"
      },
      {
        title: "Scan Top 1000 Ports",
        description: "on tesla.com, excluding ports 21 and 22",
        chatMessage:
          "Scan top 1000 ports on tesla.com, excluding ports 21 and 22."
      },
      {
        title: "Naabu Help",
        description: "How does the Naabu plugin work?",
        chatMessage: "/naabu -help"
      }
    ]
  },
  {
    id: 10,
    name: "GAU",
    selectorName: "GAU: URL Enumeration",
    value: PluginID.GAU,
    icon: "https://avatars.githubusercontent.com/u/19563282",
    description:
      "Fetch known URLs from AlienVault's Open Threat Exchange, the Wayback Machine, and Common Crawl",
    categories: ["Popular"],
    githubRepoUrl: pluginUrls.Gau,
    isInstalled: false,
    isPremium: true,
    starters: [
      {
        title: "Start URL Enumeration",
        description: "for tesla.com",
        chatMessage: "Enumerate URLs for tesla.com"
      },
      {
        title: "Enumerate URLs with Date Range",
        description: "for tesla.com, fetching from January to ...",
        chatMessage: "/gau tesla.com --from 202301 --to 202306"
      },
      {
        title: "Enumerate URLs Including Subdomains",
        description: "for tesla.com, capturing URLs across ...",
        chatMessage: "/gau tesla.com --subs"
      },
      {
        title: "GAU Help",
        description: "How does the GAU plugin work?",
        chatMessage: "/gau -help"
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
    githubRepoUrl: pluginUrls.Alterx,
    isInstalled: false,
    isPremium: false,
    starters: [
      {
        title: "Generate Subdomain Wordlist",
        description: "for hackerone.com",
        chatMessage: "Generate subdomain wordlist for hackerone.com"
      },
      {
        title: "Map Subdomains Covering",
        description: "hackerone.com and its related subdomains: ...",
        chatMessage:
          "Map subdomains covering hackerone.com and its related subdomains: hackerone.com, api.hackerone.com, docs.hackerone.com, resources.hackerone.com, gslink.hackerone.com"
      },
      {
        title: "Generate Custom Enriched Wordlist",
        description: "for tesla.com, enriching with '{{word}}-...",
        chatMessage: "/alterx -enrich -p '{{word}}-{{suffix}}' -list tesla.com"
      },
      {
        title: "AlterX Help",
        description: "How does the AlterX plugin work?",
        chatMessage: "/alterx -help"
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
