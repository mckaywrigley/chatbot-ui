import { pluginUrls } from "@/types/plugins"
import endent from "endent"

export const displayHelpGuideForCvemap = () => {
  return endent`
    [CVEMap](${pluginUrls.CVEmap}) is an open-source command-line interface (CLI) tool that allows you to explore Common Vulnerabilities and Exposures (CVEs).
  
    ## Interaction Methods
  
    **Conversational AI Requests:**
    Engage conversationally by describing your CVE search needs in plain language. The AI will interpret your request and seamlessly execute the relevant command using CVEMap, making it user-friendly for those who prefer intuitive interactions.
    
    **Direct Commands:**
    Use direct commands by starting with "/" followed by the command and its specific flags. This method provides exact control, enabling detailed and targeted searches within the CVE database.
    
    \`\`\`
      Usage:
         /cvemap [flags]
    
      Flags:
      OPTIONS:
          -id string[]                    cve to list for given id
          -cwe, -cwe-id string[]          cve to list for given cwe id
          -v, -vendor string[]            cve to list for given vendor
          -p, -product string[]           cve to list for given product
          -eproduct string[]              cves to exclude based on products
          -s, -severity string[]          cve to list for given severity
          -cs, -cvss-score string[]       cve to list for given cvss score
          -c, -cpe string                 cve to list for given cpe
          -es, -epss-score string         cve to list for given epss score
          -ep, -epss-percentile string[]  cve to list for given epss percentile
          -age string                     cve to list published by given age in days
          -a, -assignee string[]          cve to list for given publisher assignee
          -vs, -vstatus value             cve to list for given vulnerability status in cli output. supported: new, confirmed, unconfirmed, modified, rejected, unknown
  
      FILTER:
          -q, -search string  search in cve data
          -k, -kev            display cves marked as exploitable vulnerabilities by cisa (default true)
          -t, -template       display cves that has public nuclei templates (default true)
          -poc                display cves that has public published poc (default true)
          -h1, -hackerone     display cves reported on hackerone (default true)
          -re, -remote        display remotely exploitable cves (AV:N & PR:N | PR:L) (default true)
  
      OUTPUT:
          -f, -field value     fields to display in cli output. supported: product, vendor, assignee, age, poc, cwe, epss, vstatus, kev, template
          -fe, -exclude value  fields to exclude from cli output. supported: product, vendor, assignee, age, poc, cwe, epss, vstatus, kev, template
          -lsi, -list-id       list only the cve ids in the output
          -l, -limit int       limit the number of results to display (default 50)
          -offset int          offset the results to display
          -j, -json            return output in json format
  
      DEBUG:
          -silent   Silent
          -verbose  Verbose
    \`\`\``
}

export const displayHelpGuideForKatana = () => {
  return endent`
    [Katana](${pluginUrls.Katana}) is a fast crawler focused on execution in automation pipelines offering both headless and non-headless crawling.
    ## Interaction Methods
  
    **Conversational AI Requests:**
    Interact with Katana conversationally by simply describing your web crawling needs in plain language. The AI will understand your requirements and automatically configure and execute the appropriate Katana command, facilitating an intuitive user experience.
      
    **Direct Commands:**
    Use direct commands to specifically control the crawling process. Begin your command with the program name followed by relevant flags to precisely define the crawling scope and parameters.

    \`\`\`
      Usage:
         /katana [flags]
    
      Flags:
      INPUT:
         -u, -list string[]  target url / list to crawl
  
      CONFIGURATION:
         -d, -depth int               maximum depth to crawl (default 3)
         -jc, -js-crawl               enable endpoint parsing / crawling in javascript file
         -timeout int                 time to wait for request in seconds (default 15)
         -iqp, -ignore-query-params   Ignore crawling same path with different query-param values
  
      HEADLESS:
         -xhr, -xhr-extraction   extract xhr request url,method in jsonl output
  
      SCOPE:
         -cs, -crawl-scope string[]        in scope url regex to be followed by crawler
         -cos, -crawl-out-scope string[]   out of scope url regex to be excluded by crawler
         -do, -display-out-scope           display external endpoint from scoped crawling
  
      FILTER:
         -mr, -match-regex string[]        regex or list of regex to match on output url (cli, file)
         -fr, -filter-regex string[]       regex or list of regex to filter on output url (cli, file)
         -em, -extension-match string[]    match output for given extension (eg, -em php,html,js)
         -ef, -extension-filter string[]   filter output for given extension (eg, -ef png,css)
         -mdc, -match-condition string     match response with dsl based condition
         -fdc, -filter-condition string    filter response with dsl based condition
    \`\`\``
}

export const displayHelpGuideForAlterx = () => {
  return endent`
    [Alterx](${pluginUrls.Alterx}) is a fast and customizable subdomain wordlist generator using DSL.
  
    ## Interaction Methods
  
    **Conversational AI Requests:**
    Interact with AlterX using plain language to describe your requirements for generating subdomain wordlists. The AI understands your input and performs the necessary operations, offering a user-friendly and intuitive experience.
  
    **Direct Commands:**
    For precise control, use direct commands. Begin with "/" followed by the command and specific flags to accurately configure your subdomain wordlist generation tasks.
    
    \`\`\`
      Usage:
         /alterx [flags]
  
      Flags:
      INPUT:
         -l, -list string[]      subdomains to use when creating permutations (stdin, comma-separated, file)
         -p, -pattern string[]   custom permutation patterns input to generate (comma-seperated, file)
  
      CONFIGURATION:
         -en, -enrich   enrich wordlist by extracting words from input
         -limit int     limit the number of results to return (default 0)
    \`\`\``
}

export const displayHelpGuideForHttpx = () => {
  return endent`
    [HTTPX](${pluginUrls.Httpx}) is a fast and multi-purpose HTTP toolkit built to support running multiple probes using a public library. Probes are specific tests or checks to gather information about web servers, URLs, or other HTTP elements. HTTPX is designed to maintain result reliability with an increased number of threads. 
  
    ## Interaction Methods
  
    **Conversational AI Requests:**
    Engage with HttpX by describing your web server analysis needs in plain language. The AI will interpret your request and automatically configure and execute the appropriate command using HTTPX, making it user-friendly for intuitive use.
    
    **Direct Commands:**
    Use direct commands to exert granular control over the probing process. Start your command with "/" followed by the necessary flags to specifically tailor your HTTP investigations.
    
    \`\`\`
      Usage:
         /httpx [flags]
    
      Flags:
      INPUT:
         -u, -target string[]  input target host(s) to probe
         -l, -list string      input file containing list of hosts to process
  
      PROBES:
         -sc, -status-code     display response status-code
         -cl, -content-length  display response content-length
         -ct, -content-type    display response content-type
         -location             display response redirect location
         -favicon              display mmh3 hash for '/favicon.ico' file
         -hash string          display response body hash (supported: md5,mmh3,simhash,sha1,sha256,sha512)
         -jarm                 display jarm fingerprint hash
         -rt, -response-time   display response time
         -lc, -line-count      display response body line count
         -wc, -word-count      display response body word count
         -title                display page title
         -bp, -body-preview    display first N characters of response body (default 100)
         -server, -web-server  display server name
         -td, -tech-detect     display technology in use based on wappalyzer dataset
         -method               display http request method
         -websocket            display server using websocket
         -ip                   display host ip
         -cname                display host cname
         -asn                  display host asn information
         -cdn                  display cdn/waf in use
         -probe                display probe status
  
      MATCHERS:
         -mc, -match-code string            match response with specified status code (-mc 200,302)
         -ml, -match-length string          match response with specified content length (-ml 100,102)
         -mlc, -match-line-count string     match response body with specified line count (-mlc 423,532)
         -mwc, -match-word-count string     match response body with specified word count (-mwc 43,55)
         -mfc, -match-favicon string[]      match response with specified favicon hash (-mfc 1494302000)
         -ms, -match-string string          match response with specified string (-ms admin)
         -mr, -match-regex string           match response with specified regex (-mr admin)
         -mcdn, -match-cdn string[]         match host with specified cdn provider (cloudfront, fastly, google, leaseweb, stackpath)
         -mrt, -match-response-time string  match response with specified response time in seconds (-mrt '< 1')
         -mdc, -match-condition string      match response with dsl expression condition
  
      EXTRACTOR:
         -er, -extract-regex string[]   display response content with matched regex
         -ep, -extract-preset string[]  display response content matched by a pre-defined regex (ipv4,mail,url)
  
      FILTERS:
         -fc, -filter-code string            filter response with specified status code (-fc 403,401)
         -fep, -filter-error-page            filter response with ML based error page detection
         -fl, -filter-length string          filter response with specified content length (-fl 23,33)
         -flc, -filter-line-count string     filter response body with specified line count (-flc 423,532)
         -fwc, -filter-word-count string     filter response body with specified word count (-fwc 423,532)
         -ffc, -filter-favicon string[]      filter response with specified favicon hash (-ffc 1494302000)
         -fs, -filter-string string          filter response with specified string (-fs admin)
         -fe, -filter-regex string           filter response with specified regex (-fe admin)
         -fcdn, -filter-cdn string[]         filter host with specified cdn provider (cloudfront, fastly, google, leaseweb, stackpath)
         -frt, -filter-response-time string  filter response with specified response time in seconds (-frt '> 1')
         -fdc, -filter-condition string      filter response with dsl expression condition
         -strip                              strips all tags in response. supported formats: html,xml (default html)
      
      OUTPUT:
         -j, -json                         write output in JSONL(ines) format
         -irh, -include-response-header    include http response (headers) in JSON output (-json only)
         -irr, -include-response           include http request/response (headers + body) in JSON output (-json only)
         -irrb, -include-response-base64   include base64 encoded http request/response in JSON output (-json only)
         -include-chain                    include redirect http chain in JSON output (-json only)
         
      OPTIMIZATIONS:
         -timeout int   timeout in seconds (default 15)
    \`\`\``
}

export const displayHelpGuideForNuclei = () => {
  return endent`
    [Nuclei](${pluginUrls.Nuclei}) is a fast exploitable vulnerability scanner designed to probe modern applications, infrastructure, cloud platforms, and networks, aiding in the identification and mitigation of vulnerabilities. 
  
    ## Interaction Methods
  
    **Conversational AI Requests:**
    Engage with Nuclei by describing your vulnerability scanning needs in plain language. The AI will interpret your request and automatically configure and execute the appropriate command using Nuclei, simplifying the user experience.
    
    **Direct Commands:**
    Utilize direct commands to precisely control the scanning process. Begin your command with "/" followed by the necessary flags to tailor your scans to specific targets and conditions.
    
    \`\`\`
      Usage:
         /nuclei [flags]
    
      Flags:
      TARGET:
         -u, -target string[]          target URLs/hosts to scan
         -l, -list string              path to file containing a list of target URLs/hosts to scan (one per line)
         -eh, -exclude-hosts string[]  hosts to exclude to scan from the input list (ip, cidr, hostname)
         -sa, -scan-all-ips            scan all the IP's associated with dns record
         -iv, -ip-version string[]     IP version to scan of hostname (4,6) - (default 4)
  
      TEMPLATES:
         -nt, -new-templates                    run only new templates added in latest nuclei-templates release
         -ntv, -new-templates-version string[]  run new templates added in specific version
         -as, -automatic-scan                   automatic web scan using wappalyzer technology detection to tags mapping
         -t, -templates string[]                list of template to run (comma-separated)
         -turl, -template-url string[]          template url to run (comma-separated)
         -w, -workflows string[]                list of workflow to run (comma-separated)
         -wurl, -workflow-url string[]          workflow url to run (comma-separated)
         -td, -template-display                 displays the templates content
         -tl                                    list all available templates
         -code                                  enable loading code protocol-based templates
        
      FILTERING:
         -a, -author string[]               templates to run based on authors (comma-separated)
         -tags string[]                     templates to run based on tags (comma-separated) Possible values: cves, osint, tech ...)
         -etags, -exclude-tags string[]     templates to exclude based on tags (comma-separated)
         -itags, -include-tags string[]     tags to be executed even if they are excluded either by default or configuration
         -id, -template-id string[]         templates to run based on template ids (comma-separated, allow-wildcard)
         -eid, -exclude-id string[]         templates to exclude based on template ids (comma-separated)
         -it, -include-templates string[]   templates to be executed even if they are excluded either by default or configuration
         -et, -exclude-templates string[]   template or template directory to exclude (comma-separated)
         -em, -exclude-matchers string[]    template matchers to exclude in result
         -s, -severity value[]              templates to run based on severity. Possible values: info, low, medium, high, critical, unknown
         -es, -exclude-severity value[]     templates to exclude based on severity. Possible values: info, low, medium, high, critical, unknown
         -pt, -type value[]                 templates to run based on protocol type. Possible values: dns, file, http, headless, tcp, workflow, ssl, websocket, whois, code, javascript
         -ept, -exclude-type value[]        templates to exclude based on protocol type. Possible values: dns, file, http, headless, tcp, workflow, ssl, websocket, whois, code, javascript
         -tc, -template-condition string[]  templates to run based on expression condition
  
      OUTPUT:
         -j, -jsonl  write output in JSONL(ines) format
  
      CONFIGURATIONS:
         -fr, -follow-redirects          enable following redirects for http templates
         -fhr, -follow-host-redirects    follow redirects on the same host
         -mr, -max-redirects int         max number of redirects to follow for http templates (default 10)
         -dr, -disable-redirects         disable redirects for http templates
         -H, -header string[]            custom header/cookie to include in all http request in header:value format (cli)
         -V, -var value                  custom vars in key=value format
         -sr, -system-resolvers          use system DNS resolving as error fallback
         -dc, -disable-clustering        disable clustering of requests
         -passive                        enable passive HTTP response processing mode
         -fh2, -force-http2              force http2 connection on requests
         -dt, -dialer-timeout value      timeout for network requests.
         -dka, -dialer-keep-alive value  keep-alive duration for network requests.
         -at, -attack-type string        type of payload combinations to perform (batteringram,pitchfork,clusterbomb)
  
      OPTIMIZATIONS:
         -timeout int               time to wait in seconds before timeout (default 30)
         -mhe, -max-host-error int  max errors for a host before skipping from scan (default 30)
         -nmhe, -no-mhe             disable skipping host from scan based on errors
         -ss, -scan-strategy value  strategy to use while scanning(auto/host-spray/template-spray) (default auto)
         -nh, -no-httpx             disable httpx probing for non-url input
    \`\`\``
}

export const displayHelpGuideForGoLinkFinder = () => {
  return endent`
    [GoLinkFinder](${pluginUrls.GoLinkFinder}) is a minimalistic JavaScript endpoint extractor that efficiently pulls endpoints from HTML and embedded JavaScript files. 
  
    ## Interaction Methods
  
    **Conversational AI Requests:**
    Interact with GoLinkFinder using plain language to describe your endpoint extraction needs. The AI will understand your input and automatically execute the corresponding command with GoLinkFinder, simplifying the process for intuitive use.
    
    **Direct Commands:**
    For precise and specific tasks, use direct commands. Begin your command with "/" and include necessary flags to control the extraction process effectively.
    
    \`\`\`
      Usage:
         /golinkfinder --domain [domain]
  
      Flags:
      CONFIGURATION:
         -d --domain string   Input a URL.
    \`\`\``
}

export const displayHelpGuideForGau = () => {
  return endent`
    [GAU](${pluginUrls.Gau}) is a powerful web scraping tool that fetches known URLs from multiple sources, including AlienVault&apos;s Open Threat Exchange, the Wayback Machine, and Common Crawl. 
  
    ## Interaction Methods
  
    **Conversational AI Requests:**
    Engage with GAU conversationally by simply describing your URL fetching needs in plain language. The AI will interpret your input and carry out the necessary operations automatically, providing an intuitive and user-friendly experience.
    
    **Direct Commands:**
    Use direct commands for meticulous control. Start with "/" followed by the command and applicable flags to perform specific URL fetching tasks tailored to your requirements.
    
    \`\`\`
      Usage:
         /gau [target] [flags]
  
      Flags:
      CONFIGURATION:
         --from string         fetch URLs from date (format: YYYYMM)
         --to string           fetch URLs to date (format: YYYYMM)
         --providers strings   list of providers to use (wayback, commoncrawl, otx, urlscan)
         --subs                include subdomains of target domain
  
      FILTER:
         --blacklist strings   list of extensions to skip
         --fc strings          list of status codes to filter
         --ft strings          list of mime-types to filter
         --mc strings          list of status codes to match
         --mt strings          list of mime-types to match
         --fp                  remove different parameters of the same endpoint
    \`\`\``
}

export const displayHelpGuideForNaabu = () => {
  return endent`
    [Naabu](${pluginUrls.Naabu}) is a port scanning tool written in Go that allows you to enumerate valid ports for hosts in a fast and reliable manner. It is a really simple tool that does fast SYN/CONNECT/UDP scans on the host/list of hosts and lists all ports that return a reply. 
  
    ## Interaction Methods
  
    **Conversational AI Requests:**
    Engage with Naabu by describing your port scanning needs in plain language. The AI will understand your requirements and automatically execute the appropriate command with Naabu, facilitating an intuitive and streamlined user experience.
    
    **Direct Commands:**
    Utilize direct commands for detailed control over the scanning process. Commands start with "/" and are followed by relevant options and flags to specifically tailor your port scans.
    
    \`\`\`
   Usage:
      /naabu [flags]
  
   Flags:
   INPUT:
      -host string[]     hosts to scan ports for (comma-separated)
      -list, -l string   list of hosts to scan ports (file)
  
   PORT:
      -port, -p string             ports to scan (80,443, 100-200)
      -top-ports, -tp string       top ports to scan (default 100) [100,1000]
      -exclude-ports, -ep string   ports to exclude from scan (comma-separated)
      -port-threshold, -pts int    port threshold to skip port scan for the host
      -exclude-cdn, -ec            skip full port scans for CDN/WAF (only scan for port 80,443)
      -display-cdn, -cdn           display cdn in use    
  
   CONFIGURATION:
      -scan-all-ips, -sa   scan all the IP's associated with DNS record
      -timeout int         milliseconds to wait before timing out (default 1000)
      
   HOST-DISCOVERY:
      -sn, -host-discovery            Perform Only Host Discovery
      -Pn, -skip-host-discovery       Skip Host discovery
      -pe, -probe-icmp-echo           ICMP echo request Ping (host discovery needs to be enabled)
      -pp, -probe-icmp-timestamp      ICMP timestamp request Ping (host discovery needs to be enabled)
      -pm, -probe-icmp-address-mask   ICMP address mask request Ping (host discovery needs to be enabled)
      -arp, -arp-ping                 ARP ping (host discovery needs to be enabled)
      -nd, -nd-ping                   IPv6 Neighbor Discovery (host discovery needs to be enabled)
      -rev-ptr                        Reverse PTR lookup for input ips
  
   OUTPUT:
      -j, -json   write output in JSON lines format
    \`\`\``
}

export const displayHelpGuideForSubfinder = () => {
  return endent`
   [Subfinder](${pluginUrls.Subfinder}) is a powerful subdomain discovery tool designed to enumerate and uncover valid subdomains of websites efficiently through passive online sources. 
 
   ## Interaction Methods
 
   **Conversational AI Requests:**
   Engage with Subfinder by describing your subdomain discovery needs in plain language. The AI will interpret your request and automatically execute the relevant command with Subfinder, offering a user-friendly interface for those who prefer intuitive interactions.
   
   **Direct Commands:**
   Utilize direct commands for granular control over subdomain discovery. Start your command with "/" followed by the necessary flags to specify detailed parameters for the scan.
   
   \`\`\`
   Usage:
      /subfinder [flags]
   
   Flags:
   INPUT:
      -d, -domain string[]   domains to find subdomains for
 
   CONFIGURATION:
     -r string[]        comma separated list of resolvers to use
     -nW, -active       display active subdomains only
     -ei, -exclude-ip   exclude IPs from the list of domains
 
   FILTER:
     -m, -match string[]    subdomain or list of subdomain to match (comma separated)
     -f, -filter string[]   subdomain or list of subdomain to filter (comma separated)
 
   OUTPUT:
     -oJ, -json              write output in JSONL(ines) format
     -cs, -collect-sources   include all sources in the output
     -oI, -ip                include host IP in output (-active only)
        
   OPTIMIZATIONS:
     -timeout int   seconds to wait before timing out (default 30)
   \`\`\``
}
