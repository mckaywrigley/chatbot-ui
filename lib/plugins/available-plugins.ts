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
        title: "Explain how to",
        description: "identify and exploit XSS vulnerabilities",
        chatMessage: "Explain how to identify and exploit XSS vulnerabilities."
      },
      {
        title: "Explain how to",
        description: "identify information disclosure vulnerabilities",
        chatMessage:
          "Explain how to identify information disclosure vulnerabilities."
      },
      {
        title: "Can you recommend",
        description: "some CLI tools for Network hacking?",
        chatMessage: "Can you some CLI tools for Network hacking?"
      },
      {
        title: "Provide techniques",
        description: "to bypass two-factor authentication",
        chatMessage: "Provide techniques to bypass two-factor authentication"
      }
    ]
  },
  {
    id: 1,
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
      // {
      //   title: "Start Subdomain Discovery",
      //   description: "Initiate a search for subdomains.",
      //   chatMessage: "/start-subdomain-discovery"
      // },
      // {
      //   title: "Subfinder Help",
      //   description: "Learn how to use Subfinder effectively.",
      //   chatMessage: "/subfinder-help"
      // },
      // {
      //   title: "Subfinder Settings",
      //   description: "Configure Subfinder settings for customized use.",
      //   chatMessage: "/subfinder-settings"
      // },
      // {
      //   title: "Report Issue",
      //   description: "Report an issue or suggest improvements for Subfinder.",
      //   chatMessage: "/report-issue"
      // }
    ]
  },
  {
    id: 2,
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
      // {
      //   title: "CVE Lookup",
      //   description: "Search for CVEs to understand their impact.",
      //   chatMessage: "/cve-lookup"
      // },
      // {
      //   title: "CVEMap Guide",
      //   description: "Get guidance on navigating and using CVEMap.",
      //   chatMessage: "/cvemap-guide"
      // },
      // {
      //   title: "Update CVE Database",
      //   description: "Check for updates in the CVE database.",
      //   chatMessage: "/update-cve-database"
      // },
      // {
      //   title: "CVE Feedback",
      //   description: "Provide feedback or report issues with CVEMap.",
      //   chatMessage: "/cve-feedback"
      // }
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
      // {
      //   title: "CyberChef Recipes",
      //   description: "Explore and use pre-made or custom CyberChef recipes.",
      //   chatMessage: "/cyberchef-recipes"
      // },
      // {
      //   title: "CyberChef Help",
      //   description: "Learn how to use CyberChef with tutorials and guides.",
      //   chatMessage: "/cyberchef-help"
      // },
      // {
      //   title: "Submit Recipe",
      //   description: "Share your own CyberChef recipes with the community.",
      //   chatMessage: "/submit-recipe"
      // }
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
      // {
      //   title: "Feedback on GoLinkFinder",
      //   description: "Provide feedback or report issues with GoLinkFinder.",
      //   chatMessage: "/feedback-on-golinkfinder"
      // }
    ]
  },
  {
    id: 5,
    name: "Web Scraper",
    selectorName: "Web Scraper: Extract Data from Websites",
    value: PluginID.WEB_SCRAPER,
    icon: "https://avatars.githubusercontent.com/u/50994705",
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
      // {
      //   title: "Report Scraping Issue",
      //   description:
      //     "Report any issues encountered while using the Web Scraper.",
      //   chatMessage: "/report-scraping-issue"
      // }
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
      // {
      //   title: "Feedback on Nuclei",
      //   description: "Provide feedback or report issues with Nuclei.",
      //   chatMessage: "/feedback-on-nuclei"
      // }
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
      // {
      //   title: "Report Katana Issue",
      //   description: "Report any issues or suggest improvements for Katana.",
      //   chatMessage: "/report-katana-issue"
      // }
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
      // {
      //   title: "Feedback on HttpX",
      //   description: "Provide feedback or report issues with HttpX.",
      //   chatMessage: "/feedback-on-httpx"
      // }
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
      // {
      //   title: "Start Port Scanning",
      //   description: "Scan for open ports across networks.",
      //   chatMessage: "/start-port-scanning"
      // },
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
      // {
      //   title: "Report Naabu Issue",
      //   description: "Report any issues or suggest improvements for Naabu.",
      //   chatMessage: "/report-naabu-issue"
      // }
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
      // {
      //   title: "Start URL Enumeration",
      //   description: "Enumerate URLs from various sources.",
      //   chatMessage: "/start-url-enumeration"
      // },
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
      // {
      //   title: "Feedback on GAU",
      //   description: "Provide feedback or report issues with GAU.",
      //   chatMessage: "/feedback-on-gau"
      // }
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
      // {
      //   title: "Generate Wordlist",
      //   description: "Generate custom wordlists for subdomain enumeration.",
      //   chatMessage: "/generate-wordlist"
      // },
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
      // {
      //   title: "Report AlterX Issue",
      //   description: "Report any issues or suggest improvements for AlterX.",
      //   chatMessage: "/report-alterx-issue"
      // }
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
