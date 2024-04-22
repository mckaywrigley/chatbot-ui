import { Message } from "@/types/chat"
import endent from "endent"

export const transformUserQueryToSubfinderCommand = (lastMessage: Message) => {
  const answerMessage = endent`
    Query: "${lastMessage.content}"
  
    Based on this query, generate a command for the 'subfinder' tool, focusing on subdomain discovery. The command should use only the most relevant flags, with '-domain' being essential. If the request involves discovering subdomains for a specific domain, embed the domain directly in the command rather than referencing an external file. The '-json' flag is optional and should be included only if specified in the user's request. Include the '-help' flag if a help guide or a full list of flags is requested. The command should follow this structured format for clarity and accuracy:
    
    ALWAYS USE THIS FORMAT:
    \`\`\`json
    { "command": "subfinder -domain [domain] [additional flags as needed]" }
    \`\`\`
    Replace '[domain]' with the actual domain name and directly include it in the command. Include any of the additional flags only if they align with the specifics of the request. Ensure the command is properly escaped to be valid JSON.
  
    Command Construction Guidelines:
    1. **Direct Domain Inclusion**: When discovering subdomains for a specific domain, directly embed the domain in the command instead of using file references.
      - -domain string[]: Identifies the target domain(s) for subdomain discovery directly in the command. (required)
    2. **Selective Flag Use**: Carefully select flags that are directly pertinent to the task. The available flags are:
      - -r string[]: Use specified resolvers. (e.g., 8.8.8.8) (optional)
      - -active: Display only active subdomains. (optional)
      - -exclude-ip: Exclude IPs from the domain list. (optional)
      - -match string[]: Match specific subdomains in comma-separated format. (optional)
      - -filter string[]: Exclude certain subdomains in comma-separated format. (optional)
      - -json: Output in JSON format. (optional)
      - -collect-sources: Include source information for each subdomain. (optional)
      - -ip: Include host IP in output (always should go with -active flag). (optional)
      - -timeout int: Set timeout limit (default 30 seconds). (optional)
      - -help: Display help and all available flags. (optional)
      Do not include any flags not listed here. Use these flags to align with the request's specific requirements or when '-help' is requested for help.
    3. **Relevance and Efficiency**: Ensure that the flags chosen for the command are relevant and contribute to an effective and efficient subdomain discovery process.
  
    Example Commands:
    For discovering subdomains for a specific domain directly:
    \`\`\`json
    { "command": "subfinder -domain example.com" }
    \`\`\`
  
    For a request for help or all flags or if the user asked about how the plugin works:
    \`\`\`json
    { "command": "subfinder -help" }
    \`\`\`
  
    Response:`

  return answerMessage
}

export const transformUserQueryToNucleiCommand = (
  lastMessage: Message,
  fileContentIncluded?: boolean,
  joinedFileNames?: string
) => {
  const nucleiIntroduction = fileContentIncluded
    ? `Based on this query, generate a command for the 'nuclei' tool, focusing on network and application vulnerability scanning. The command should use the most relevant flags, with '-list' being essential for specifying hosts filename to use for scaning. If the request involves scaning from a list of hosts, embed the hosts filename directly in the command.  The '-jsonl' flag is optional and should be included only if specified in the user's request. Include the '-help' flag if a help guide or a full list of flags is requested. The command should follow this structured format for clarity and accuracy:`
    : `Based on this query, generate a command for the 'nuclei' tool, focusing on network and application vulnerability scanning. The command should utilize the most relevant flags, with '-target' being essential to specify the target host(s) to scan. The '-jsonl' flag is optional and should be included only if specified in the user's request. Include the '-help' flag if a help guide or a full list of flags is requested. The command should follow this structured format for clarity and accuracy:`

  const domainOrFilenameInclusionText = fileContentIncluded
    ? endent`**Filename Inclusion**: Use the -list string[] flag followed by the file name (e.g., -list targets.txt) containing the list of domains in the correct format. Nuclei supports direct file inclusion, making it convenient to use files like 'targets.txt' that already contain the necessary domains. (required)`
    : endent`**Direct Host Inclusion**: Directly embed target hosts in the command instead of using file references.
    - -target (string[]): Specify the target host(s) to scan. (required)`

  const nucleiExampleText = fileContentIncluded
    ? endent`For probing a list of hosts directly using a file named 'targets.txt':
        \`\`\`json
        { "command": "nuclei -list targets.txt" }
        \`\`\``
    : endent`For probing a list of hosts directly:
        \`\`\`json
        { "command": "nuclei -target host1.com,host2.com" }
        \`\`\``

  const answerMessage = endent`
    Query: "${lastMessage.content}"
  
    ${nucleiIntroduction}
  
    ALWAYS USE THIS FORMAT:
    \`\`\`json
    { "command": "nuclei [flags]" }
    \`\`\`
    In this context, replace '[flags]' with '-help' to generate the appropriate help command. The '-help' flag is crucial as it instructs the 'nuclei' tool to display its help guide, offering an overview of all available flags and their purposes. This format ensures the command is both valid JSON and specifically tailored to users' inquiries about help or flag functionalities. 
  
    Example Command for Requesting Help:
    \`\`\`json
    { "command": "nuclei -help" }
    \`\`\`
  
    This command will instruct the 'nuclei' tool to provide its help documentation, making it easier for users to understand how to use the tool and which flags are at their disposal for specific tasks. It's important to ensure that the command remains simple and directly addresses the user's request for help.
  
    Command Construction Guidelines:
    1. ${domainOrFilenameInclusionText}
    2. **Selective Flag Use**: Carefully choose flags that are pertinent to the task. The available flags for the 'nuclei' tool include:
      - **TARGET**:
        - -exclude-hosts (string[]): Hosts to exclude from the input list (ip, cidr, hostname).
        - -scan-all-ips: Scan all the IP's associated with a DNS record.
        - -ip-version (string[]): IP version to scan of hostname (4,6) - (default 4).
      - **TEMPLATES**:
        - -new-templates: Run only new templates added in the latest nuclei-templates release.
        - -new-templates-version (string[]): Run new templates added in a specific version.
        - -automatic-scan: Automatic web scan using Wappalyzer technology detection to tags mapping.
        - -templates (string[]): List of templates to run (comma-separated).
        - -template-url (string[]): Template URL to run (comma-separated).
        - -workflows (string[]): List of workflows to run (comma-separated).
        - -workflow-url (string[]): Workflow URL to run (comma-separated).
        - -template-display: Displays the template's content.
        - -list-templates: List all available templates.
        - -code: Enable loading code protocol-based templates.
      - **FILTERING**:
        - -author (string[]): Templates to run based on authors (comma-separated).
        - -tags (string[]): Templates to run based on tags (comma-separated).
        - -exclude-tags (string[]): Templates to exclude based on tags (comma-separated).
        - -include-tags (string[]): Tags to be executed even if they are excluded either by default or configuration.
        - -template-id (string[]): Templates to run based on template ids (comma-separated, allow-wildcard).
        - -exclude-id (string[]): Templates to exclude based on template ids (comma-separated).
        - -include-templates (string[]): Templates to be executed even if they are excluded either by default or configuration.
        - -exclude-templates (string[]): Template or template directory to exclude (comma-separated).
        - -exclude-matchers (string[]): Template matchers to exclude in result.
        - -severity (value[]): Templates to run based on severity. Possible values: info, low, medium, high, critical, unknown.
        - -exclude-severity (value[]): Templates to exclude based on severity.
        - -type (value[]): Templates to run based on protocol type.
        - -exclude-type (value[]): Templates to exclude based on protocol type.
        - -template-condition (string[]): Templates to run based on expression condition.
      - **OUTPUT**:
        - -jsonl: Write output in JSONL(ines) format. 
      - **CONFIGURATIONS**:
        - -follow-redirects: Enable following redirects for HTTP templates.
        - -follow-host-redirects: Follow redirects on the same host.
        - -max-redirects (int): Max number of redirects to follow for HTTP templates (default 10).
        - -disable-redirects: Disable redirects for HTTP templates.
        - -header (string[]): Custom header/cookie to include in all HTTP requests in header:value format (cli).
        - -var (value): Custom vars in key=value format.
        - -system-resolvers: Use system DNS resolving as error fallback.
        - -disable-clustering: Disable clustering of requests.
        - -passive: Enable passive HTTP response processing mode.
        - -force-http2: Force HTTP2 connection on requests.
        - -dialer-timeout (value): Timeout for network requests.
        - -dialer-keep-alive (value): Keep-alive duration for network requests.
        - -attack-type (string): Type of payload combinations to perform.
      - **OPTIMIZATIONS**:
        - -timeout (int): Time to wait in seconds before timeout (default 30).
        - -max-host-error (int): Max errors for a host before skipping from scan (default 30).
        - -no-max-host-error: Disable skipping host from scan based on errors.
        - -scan-strategy (value): Strategy to use while scanning.
        - -no-httpx: Disable HTTPX probing for non-URL input.
      Do not include any flags not listed here, this are only flags you can use. Use these flags to align with the request's specific requirements or when '-help' is requested for help. Only provide output flag '-jsonl' if the user asks for it.
    3. **Relevance and Efficiency**: Ensure that the selected flags are relevant and contribute to an effective and efficient scanning process.
  
    Example Commands:
    ${nucleiExampleText}
  
    For a request for help or all flags or if the user asked about how the plugin works:
    \`\`\`json
    { "command": "nuclei -help" }
    \`\`\`
  
    Response:`

  return answerMessage
}

export const transformUserQueryToNaabuCommand = (
  lastMessage: Message,
  fileContentIncluded?: boolean,
  joinedFileNames?: string
) => {
  const naabuIntroduction = fileContentIncluded
    ? `Based on this query, generate a command for the 'naabu' tool, focusing on port scanning. The command should use only the most relevant flags, with '-list' being essential for specifying hosts filename to use for scaning. If the request involves scaning from a list of hosts, embed the hosts filename directly in the command.  The '-json' flag is optional and should be included only if specified in the user's request. Include the '-help' flag if a help guide or a full list of flags is requested. The command should follow this structured format for clarity and accuracy:`
    : `Based on this query, generate a command for the 'naabu' tool, focusing on port scanning. The command should use only the most relevant flags, with '-host' being essential. If the request involves scanning a list of hosts, embed the hosts directly in the command rather than referencing an external file. The '-json' flag is optional and should be included only if specified in the user's request. Include the '-help' flag if a help guide or a full list of flags is requested. The command should follow this structured format for clarity and accuracy:`

  const domainOrFilenameInclusionText = fileContentIncluded
    ? endent`**Filename Inclusion**: Use the -list string flag followed by the file name (e.g., -list targets.txt) containing the list of domains in the correct format. Naabu supports direct file inclusion, making it convenient to use files like 'targets.txt' that already contain the necessary domains. (required)`
    : endent`**Direct Host Inclusion**: When scanning a list of hosts, directly embed them in the command instead of using file references.
      - -host string[]: Identifies the target host(s) for port scanning directly in the command. (required)`

  const naabuExampleText = fileContentIncluded
    ? endent`For scaning a list of hosts directly using a file named 'targets.txt':
        \`\`\`json
        { "command": "naabu -list targets.txt -top-ports 100" }
        \`\`\``
    : endent`For scanning a list of hosts directly:
        \`\`\`json
        { "command": "naabu -host host1.com,host2.com,host3.com -top-ports 100" }
        \`\`\``

  const answerMessage = endent`
    Query: "${lastMessage.content}"
  
    ${naabuIntroduction}
  
    ALWAYS USE THIS FORMAT:
    \`\`\`json
    { "command": "naabu [flags]" }
    \`\`\`
    Replace '[flags]' with the actual flags and values, directly including the hosts if necessary. Include additional flags only if they are specifically relevant to the request.
    IMPORTANT: Ensure the command is properly escaped to be valid JSON. Ensure the command uses simpler regex patterns compatible with the 'naabu' tool's regex engine. Avoid advanced regex features like negative lookahead.
  
    Command Construction Guidelines for Naabu:
    1. ${domainOrFilenameInclusionText}
    2. **Selective Flag Use**: Include only the flags that are essential to the request. The available flags for Naabu are:
      - -port string: Specify ports to scan (e.g., 80,443, 100-200). (optional)
      - -top-ports string: Scan top N ports (e.g., 100, 1000). (optional)
      - -exclude-ports string: Exclude specific ports from the scan. (optional)
      - -port-threshold int: Set a port threshold to skip port scan for the host. (optional)
      - -exclude-cdn: Exclude full port scans for CDN/WAF. (optional)
      - -display-cdn: Display CDN in use. (optional)
      - -scan-all-ips: Scan all IPs associated with a DNS record. (optional)
      - -timeout int: Milliseconds to wait before timing out (default 1000). (optional)
      - -host-discovery: Perform only host discovery. (optional)
      - -skip-host-discovery: Skip host discovery. (optional)
      - -probe-icmp-echo: Use ICMP echo request ping. (optional)
      - -probe-icmp-timestamp: Use ICMP timestamp request ping. (optional)
      - -probe-icmp-address-mask: Use ICMP address mask request ping. (optional)
      - -arp-ping: Use ARP ping. (optional)
      - -nd-ping: Use IPv6 Neighbor Discovery ping. (optional)
      - -rev-ptr: Perform a reverse PTR lookup. (optional)
      - -json: Output results in JSON format. (optional)
      - -help: Display help and all available flags. (optional)
      Use these flags to align with the request's specific requirements or when '-help' is requested for help.
    3. **Relevance and Efficiency**: Ensure that the flags chosen for the command are relevant and contribute to an effective and efficient port discovery process.
  
    Example Commands:
    For scanning a list of hosts directly:
    ${naabuExampleText}
  
    For a request for help or all flags or if the user asked about how the plugin works:
    \`\`\`json
    { "command": "naabu -help" }
    \`\`\`
  
    Response:`

  return answerMessage
}

export const transformUserQueryToKatanaCommand = (
  lastMessage: Message,
  fileContentIncluded?: boolean,
  joinedFileNames?: string
) => {
  const katanaIntroduction = fileContentIncluded
    ? `Based on this query, generate a command for the 'katana' tool, focusing on URL crawling and filtering. The command should utilize the most relevant flags, with '-list' being essential for specifying hosts filename to use for scaning. If the request involves scanning a list of domains, embed the domains directly in the command rather than referencing an external file.  Include the '-help' flag if a help guide or a full list of flags is requested. The command should follow this structured format for clarity and accuracy:`
    : `Based on this query, generate a command for the 'katana' tool, focusing on URL crawling and filtering. The command should utilize the most relevant flags, with '-u' or '-list' being essential to specify the target URL or list. If the request involves scanning a list of domains, embed the domains directly in the command rather than referencing an external file. Include the '-help' flag if a help guide or a full list of flags is requested. The command should follow this structured format for clarity and accuracy:`

  const domainOrFilenameInclusionText = fileContentIncluded
    ? endent`**Filename Inclusion**: Use the -list string flag followed by the file name (e.g., -list targets.txt) containing the list of domains in the correct format. Katana supports direct file inclusion, making it convenient to use files like 'targets.txt' that already contain the necessary domains. (required)`
    : endent`**Direct Domain Inclusion**: When scanning a list of domains, directly embed them in the command instead of using file references.
      - -u, -list: Specify the target URL or list to crawl. (required)`

  const katanaExampleText = fileContentIncluded
    ? endent`For scanning a list of hosts directly using a file named 'targets.txt':
        \`\`\`json
        { "command": "katana -list targets.txt" }
        \`\`\``
    : endent`For scanning a list of domains directly:
        \`\`\`json
        { "command": "katana -list domain1.com,domain2.com,domain3.com" }
        \`\`\``

  const answerMessage = endent`
    Query: "${lastMessage.content}"
  
    ${katanaIntroduction}
  
    ALWAYS USE THIS FORMAT:
    \`\`\`json
    { "command": "katana [flags]" }
    \`\`\`
    In this context, replace '[flags]' with '-help' to generate the appropriate help command. The '-help' flag is crucial as it instructs the 'katana' tool to display its help guide, offering an overview of all available flags and their purposes. This format ensures the command is both valid JSON and specifically tailored to users' inquiries about help or flag functionalities. 
  
    Example Command for Requesting Help:
    \`\`\`json
    { "command": "katana -help" }
    \`\`\`
  
    This command will instruct the 'katana' tool to provide its help documentation, making it easier for users to understand how to use the tool and which flags are at their disposal for specific tasks. It's important to ensure that the command remains simple and directly addresses the user's request for help.
  
    Command Construction Guidelines:
    1. ${domainOrFilenameInclusionText}
    2. **Selective Flag Use**: Carefully choose flags that are pertinent to the task. The available flags for the 'katana' tool include:
      - -depth int: maximum depth to crawl (default 3) (optional)
      - -js-crawl: Enable crawling of JavaScript files. (optional)
      - -ignore-query-params: Ignore different query parameters in the same path. (optional)
      - -timeout: Set a time limit in seconds (default 15 seconds). (optional)
      - -xhr-extraction: Extract XHR request URL and method in JSONL format. (optional)
      - -crawl-scope: Define in-scope URL regex for crawling. (optional)
      - -crawl-out-scope: Define out-of-scope URL regex to exclude from crawling. (optional)
      - -display-out-scope: Show external endpoints from scoped crawling. (optional)
      - -match-regex: Match output URLs with specified regex patterns. (optional)
      - -filter-regex: Filter output URLs using regex patterns. (optional)
      - -extension-match: Match output for specified file extensions. (optional)
      - -extension-filter: Filter output for specified file extensions. (optional)
      - -match-condition: Apply DSL-based conditions for matching responses. (optional)
      - -filter-condition: Apply DSL-based conditions for filtering responses. (optional)
      - -help: Display help and all available flags. (optional)
      Use these flags to align with the request's specific requirements or when '-help' is requested for help.
    3. **Relevance and Efficiency**: Ensure that the selected flags are relevant and contribute to an effective and efficient URL crawling and filtering process.
  
    Example Commands:
    ${katanaExampleText}
  
    For a request for help or to see all flags:
    \`\`\`json
    { "command": "katana -help" }
    \`\`\`
  
    Response:`

  return answerMessage
}

export const transformUserQueryToAlterxCommand = (
  lastMessage: Message,
  fileContentIncluded?: boolean,
  joinedFileNames?: string
) => {
  const alterxIntroduction = fileContentIncluded
    ? `Based on this query, generate a command for the 'alterx' tool, a customizable subdomain wordlist generator. The command should use the most relevant flags, with '-list' being essential for specifying subdomains filename to use when creating permutations. If the request involves generating a wordlist from a list of subdomains, embed the subdomains filename directly in the command.  Include the '-help' flag if a help guide or a full list of flags is requested. The command should follow this structured format for clarity and accuracy:`
    : `Based on this query, generate a command for the 'alterx' tool, a customizable subdomain wordlist generator. The command should use the most relevant flags, with '-list' being essential for specifying subdomains to use when creating permutations. If the request involves generating a wordlist from a list of subdomains, embed the subdomains directly in the command rather than referencing an external file. Include the '-help' flag if a help guide or a full list of flags is requested. The command should follow this structured format for clarity and accuracy:`

  const domainOrFilenameInclusionText = fileContentIncluded
    ? endent`**Filename Inclusion**: Use the -list string[] flag followed by the file name (e.g., -list domains.txt) containing the list of domains in the correct format. Alterx supports direct file inclusion, making it convenient to use files like 'domains.txt' that already contain the necessary domains. (required)`
    : endent`**Domain/Subdomain Inclusion**: Directly specify the main domain or subdomains using the -list string[] flag. For a single domain, format it as -list domain.com. For multiple subdomains, separate them with commas (e.g., -list subdomain1.domain.com,subdomain2.domain.com). (required)`

  const alterxExampleText = fileContentIncluded
    ? endent`For generating a wordlist using a file named 'domains.txt' containing list of domains:
        \`\`\`json
        { "command": "alterx -list domains.txt" }
        \`\`\``
    : endent`For generating a wordlist with a single subdomain:
        \`\`\`json
        { "command": "alterx -list subdomain1.com" }
        \`\`\`
  
        For generating a wordlist with multiple subdomains:
        \`\`\`json
        { "command": "alterx -list subdomain1.com,subdomain2.com" }
        \`\`\``

  const answerMessage = endent`
    Query: "${lastMessage.content}"
  
    ${alterxIntroduction}
    
    ALWAYS USE THIS FORMAT:
    \`\`\`json
    { "command": "alterx [flags]" }
    \`\`\`
    Replace '[flags]' with the actual flags and values. Include additional flags only if they are specifically relevant to the request. Ensure the command is properly escaped to be valid JSON.
  
    Command Construction Guidelines:
    1. ${domainOrFilenameInclusionText}
    2. **Selective Flag Use**: Carefully choose flags that are pertinent to the task. The available flags for the 'Alterx' tool include:
      - -pattern: Custom permutation patterns input to generate (optional).
      - -enrich: Enrich wordlist by extracting words from input (optional).
      - -limit: Limit the number of results to return, with the default being 0 (optional).
      - -help: Display help and all available flags. (optional)
      Use these flags to align with the request's specific requirements or when '-help' is requested for help.
    3. **Relevance and Efficiency**: Ensure that the selected flags are relevant and contribute to an effective and efficient wordlist generation process.
  
    Example Commands:
  
    ${alterxExampleText}
  
    For a request for help or all flags or if the user asked about how the plugin works:
    \`\`\`json
    { "command": "alterx -help" }
    \`\`\`
    
    Response:`

  return answerMessage
}

export const transformUserQueryToHttpxCommand = (
  lastMessage: Message,
  fileContentIncluded?: boolean,
  joinedFileNames?: string
) => {
  const httpxIntroduction = fileContentIncluded
    ? `Based on this query, generate a command for the 'httpx' tool, focusing on HTTP probing and analysis. The command should utilize the most relevant flags, with '-list' being essential for specifying hosts filename to use for scaning. If the request involves scaning from a list of hosts, embed the hosts filename directly in the command.  The '-json' flag is optional and should be included only if specified in the user's request. Include the '-help' flag if a help guide or a full list of flags is requested. The command should follow this structured format for clarity and accuracy:`
    : `Based on this query, generate a command for the 'httpx' tool, focusing on HTTP probing and analysis. The command should utilize the most relevant flags, with '-u' or '-target' being essential to specify the target host(s) to probe. The '-json' flag is optional and should be included only if specified in the user's request. Include the '-help' flag if a help guide or a full list of flags is requested. The command should follow this structured format for clarity and accuracy:`

  const domainOrFilenameInclusionText = fileContentIncluded
    ? endent`**Filename Inclusion**: Use the -list string flag followed by the file name (e.g., -list targets.txt) containing the list of domains in the correct format. Httpx supports direct file inclusion, making it convenient to use files like 'targets.txt' that already contain the necessary domains. (required)`
    : endent`**Direct Host Inclusion**: Directly embed target hosts in the command instead of using file references.
      - -u, -target (string[]): Specify the target host(s) to probe. (required)`

  const httpxExampleText = fileContentIncluded
    ? endent`For probing a list of hosts directly using a file named 'targets.txt':
        \`\`\`json
        { "command": "httpx -list targets.txt" }
        \`\`\``
    : endent`For probing a list of hosts directly:
        \`\`\`json
        { "command": "httpx -u host1.com,host2.com" }
        \`\`\``

  const answerMessage = endent`
    Query: "${lastMessage.content}"
  
    ${httpxIntroduction}
    
    ALWAYS USE THIS FORMAT:
    \`\`\`json
    { "command": "httpx [flags]" }
    \`\`\`
    Replace '[flags]' with the actual flags and values. Include additional flags only if they are specifically relevant to the request. 
    IMPORTANT: Ensure the command is properly escaped to be valid JSON. Ensure the command uses simpler regex patterns compatible with the 'httpx' tool's regex engine. Avoid advanced regex features like negative lookahead.
  
    Command Construction Guidelines:
    1. ${domainOrFilenameInclusionText}
    2. **Selective Flag Use**: Carefully choose flags that are pertinent to the task. The available flags for the 'httpx' tool include:
      - **Probes**: Include specific probes for detailed HTTP response information. Available probes:
        - -status-code (boolean): Display response status code.
        - -content-length (boolean): Display response content length.
        - -content-type (boolean): Display response content type.
        - -location (boolean): Display response redirect location.
        - -favicon (boolean): Display mmh3 hash for '/favicon.ico' file.
        - -hash (string): Display response body hash (supports md5, mmh3, simhash, sha1, sha256, sha512).
        - -jarm (boolean): Display JARM fingerprint hash.
        - -response-time (boolean): Display response time.
        - -line-count (boolean): Display response body line count.
        - -word-count (boolean): Display response body word count.
        - -title (boolean): Display page title.
        - -body-preview (number): Display first N characters of the response body.
        - -web-server (boolean): Display server name.
        - -tech-detect (boolean): Display technology in use based on Wappalyzer dataset.
        - -method (boolean): Display HTTP request method.
        - -websocket (boolean): Display server using WebSocket.
        - -ip (boolean): Display host IP.
        - -cname (boolean): Display host CNAME.
        - -asn (boolean): Display host ASN information.
        - -cdn (boolean): Display CDN/WAF in use.
        - -probe (boolean): Display probe status.
      - **Matchers**: Utilize matchers to filter responses based on specific criteria:
        - -match-code (string): Match response with specified status code (e.g., '-match-code 200,302').
        - -match-length (string): Match response with specified content length (e.g., '-match-length 100,102').
        - -match-line-count (string): Match response body with specified line count (e.g., '-match-line-count 423,532').
        - -match-word-count (string): Match response body with specified word count (e.g., '-match-word-count 43,55').
        - -match-favicon (string[]): Match response with specified favicon hash (e.g., '-match-favicon 1494302000').
        - -match-string (string): Match response with specified string (e.g., '-match-string admin').
        - -match-regex (string): Match response with specified regex (e.g., '-match-regex admin').
        - -match-cdn (string[]): Match host with specified CDN provider (e.g., '-match-cdn cloudfront,fastly,google,leaseweb,stackpath').
        - -match-response-time (string): Match response with specified response time in seconds (e.g., '-match-response-time <1').
        - -match-condition (string): Match response with DSL expression condition.
      - **Extractor**: Extract specific information from the response:
        - -extract-regex (string[]): Display response content with matched regex.
        - -extract-preset (string[]): Display response content matched by a pre-defined regex (e.g., '-extract-preset ipv4,mail').
      - **Filters**: Apply filters to refine the results. Available filters include:
        - -filter-code (string): Filter response with specified status code (e.g., '-filter-code 403,401').
        - -filter-error-page (boolean): Filter response with ML-based error page detection.
        - -filter-length (string): Filter response with specified content length (e.g., '-filter-length 23,33').
        - -filter-line-count (string): Filter response body with specified line count (e.g., '-filter-line-count 423,532').
        - -filter-word-count (string): Filter response body with specified word count (e.g., '-filter-word-count 423,532').
        - -filter-favicon (string[]): Filter response with specified favicon hash (e.g., '-filter-favicon 1494302000').
        - -filter-string (string): Filter response with specified string (e.g., '-filter-string admin').
        - -filter-regex (string): Filter response with specified regex (e.g., '-filter-regex admin').
        - -filter-cdn (string[]): Filter host with specified CDN provider (e.g., '-filter-cdn cloudfront,fastly,google,leaseweb,stackpath').
        - -filter-response-time (string): Filter response with specified response time (e.g., '-filter-response-time '>1'').
        - -filter-condition (string): Filter response with DSL expression condition.
        - -strip (string): Strips all tags in response (e.g., '-strip html'). supported formats: html,xml (default html)
      - **Output Options**: Customize the output format with these flags:
        - -json (boolean): Write output in JSONL(ines) format.
        - -include-response-header (boolean): Include HTTP response headers in JSON output. (-json only)
        - -include-response (boolean): Include HTTP request/response in JSON output. (-json only)
        - -include-response-base64 (boolean): Include base64 encoded request/response in JSON output. (-json only)
        - -include-chain (boolean): Include redirect HTTP chain in JSON output. (-json only)
      - **Optimizations**: Enhance the probing efficiency with:
        - -timeout (number): Set a timeout in seconds. (default is 15).
      Do not include any flags not listed here. Use these flags to align with the request's specific requirements or when '-help' is requested for help.
    3. **Relevance and Efficiency**: Ensure that the selected flags are relevant and contribute to an effective and efficient HTTP probing process.
  
    Example Commands:
    ${httpxExampleText}
  
    For a request for help or all flags:
    \`\`\`json
    { "command": "httpx -help" }
    \`\`\`
  
    Response:`

  return answerMessage
}

export const transformUserQueryToGoLinkFinderCommand = (
  lastMessage: Message
) => {
  const answerMessage = endent`
    Query: "${lastMessage.content}"
  
    Based on this query, generate a command for the 'GoLinkFinder' tool, tailored to efficiently extract URLs from HTML content. Ensure to utilize the most pertinent flag, '--domain', to specify the target website. Include the '-help' flag if a help guide or a full list of flags is requested. The command should follow this structured format for clarity and accuracy:
  
    ALWAYS USE THIS FORMAT:
    \`\`\`json
    { "command": "golinkfinder --domain [target-domain]" }
    \`\`\`
    Substitute '[target-domain]' with the actual domain you intend to investigate. It's crucial to directly incorporate the target domain within the command, bypassing the need for external file references.
  
    **Command Construction Guidelines for GoLinkFinder**:
    1. **Single Domain Focus**: Direct inclusion of the target domain in the command is mandatory. 
        - --domain (string): Specify the target website URL. (required)
  
    Note: **Selective Flag Application**: Choose flags that directly contribute to the scope of your query. The key flags include:
        - --help: Display a help guide or a full list of available commands and flags.
    Note: **Limitation on Command and Domain Quantity**: 'GoLinkFinder' is designed to process a single command and a single domain at a time. Should there be attempts to include multiple domains or generate multiple commands by user query, respond back with tool's functionality restricts such operations.  
  
    **Example Commands**:
    - For extracting URLs from a specific domain:
    \`\`\`json
    { "command": "golinkfinder --domain example.com" }
    \`\`\`
  
    - For a request for help or all flags or if the user asked about how the plugin works:
    \`\`\`json
    { "command": "golinkfinder --help" }
    \`\`\`
  
    Please adjust the command based on your specific requirements or inquire further if assistance with additional flags is needed.
    
    Response:`

  return answerMessage
}

export const transformUserQueryToGAUCommand = (lastMessage: Message) => {
  const answerMessage = endent`
    Query: "${lastMessage.content}"
  
    Based on this query, generate a command for the 'GAU' tool, designed for fetching URLs from various sources. The command should use the most relevant flags, tailored to the specifics of the target and the user's requirements. If the request involves fetching URLs for a specific target, embed the target directly in the command rather than referencing an external file. The command should follow this structured format for clarity and accuracy:
  
    ALWAYS USE THIS FORMAT:
    \`\`\`json
    { "command": "gau [target] [flags]" }
    \`\`\`
    Replace '[target]' with the actual target directly included in the command, and '[flags]' with the actual flags and values. Include additional flags only if they are specifically relevant to the request.
  
    Command Construction Guidelines for Gau:
    1. **Direct Target Inclusion**: When fetching URLs for a specific target, directly embed the target in the command instead of using file references.
    2. **Configuration Flags**:
      - --from: Fetch URLs from date (format: YYYYMM). (optional)
      - --to: Fetch URLs to date (format: YYYYMM). (optional)
      - --providers: List of providers to use (wayback, commoncrawl, otx, urlscan). (optional)
      - --subs: Include subdomains of target domain. Use it if user asks for it. (optional)
    3. **Filter Flags**:
      - --blacklist: List of extensions to skip. (optional)
      - --fc: List of status codes to filter. (optional)
      - --ft: List of mime-types to filter. (optional)
      - --mc: List of status codes to match. (optional)
      - --mt: List of mime-types to match. (optional)
      - --fp: Remove different parameters of the same endpoint. (optional)
    4. **Relevance and Efficiency**:
      Ensure that the selected flags are relevant and contribute to an effective and efficient URL fetching process.
  
    Example Commands:
    For fetching URLs for a specific target with certain filters directly:
    \`\`\`json
    { "command": "gau example.com --from 202401 --to 202403 --blacklist js,css --fc 404" }
    \`\`\`
  
    For a request for help or to see all flags:
    \`\`\`json
    { "command": "gau -help" }
    \`\`\`
  
    Response:`

  return answerMessage
}

export const transformUserQueryToCvemapCommand = (lastMessage: Message) => {
  const answerMessage = endent`
    Query: "${lastMessage.content}"
  
    Based on this query, generate a command for the 'cvemap' tool, focusing on CVE (Common Vulnerabilities and Exposures) discovery. The command should prioritize the most relevant flags for CVE identification and filtering, ensuring the inclusion of flags that specify the criteria such as CVE ID, vendor, or product. The '-json' flag is required by defualt, do not included only if user asked for it. The command should follow this structured format for clarity and accuracy:
    
    ALWAYS USE THIS FORMAT:
    \`\`\`json
    { "command": "cvemap [flags]" }
    \`\`\`
    Include any of the additional flags only if they align with the specifics of the request. Ensure the command is properly escaped to be valid JSON.
  
    Command Construction Guidelines:
    1. **Selective Flag Use**: Carefully select flags that are directly pertinent to the task. The available flags are:
      - -id string[]: Specify CVE ID(s) for targeted searching. (e.g., "CVE-2023-0001")
      - -cwe-id string[]: Filter CVEs by CWE ID(s) for category-specific searching. (e.g., ""CWE-79"")
      - -vendor string[]: List CVEs associated with specific vendor(s). (e.g., ""microsoft"")
      - -product string[]: Specify product(s) to filter CVEs accordingly. (e.g., ""windows 10"")
      - -eproduct string[]: Exclude CVEs based on specified product(s). (e.g., ""linux kernel"")
      - -severity string[]: Filter CVEs by given severity level(s). Options: "low", "medium", "high", "critical"
      - -cvss-score string[]: Filter CVEs by given CVSS score range. (e.g., ""> 7"")
      - -cpe string: Specify a CPE URI to filter CVEs related to a particular product and version. (e.g., "cpe:/a:microsoft:windows_10")
      - -epss-score string: Filter CVEs by EPSS score. (e.g., ">=0.01")
      - -epss-percentile string[]: Filter CVEs by given EPSS percentile. (e.g., "">= 90"")
      - -age string: Filter CVEs published within a specified age in days. (e.g., ""> 365"", "360")
      - -assignee string[]: List CVEs for a given publisher assignee. (e.g., "cve@mitre.org")
      - -vstatus value: Filter CVEs by given vulnerability status in CLI output. Supported values: new, confirmed, unconfirmed, modified, rejected, unknown (e.g., "confirmed")
      - -search string: Search within CVE data for specific terms. (e.g., "xss")
      - -kev: Display CVEs marked as exploitable vulnerabilities by CISA (default true).
      - -template: Display CVEs that have public Nuclei templates (default true).
      - -poc: Display CVEs that have a publicly published PoC (default true).
      - -hackerone: Display CVEs reported on HackerOne (default true).
      - -remote: Display remotely exploitable CVEs (AV:N & PR:N | PR:L) (default true).
      - -field value: Specify fields to display in CLI output. Supported fields: product, vendor, assignee, age, poc, cwe, epss, vstatus, kev, template (e.g., "vendor,product,severity")
      - -exclude value: Fields to exclude from CLI output. Supported fields mirror those available for inclusion. (e.g., "epss,kev")
      - -list-id: List only the CVE IDs in the output (no additional parameters required).
      - -limit int: Limit the number of results to display (default 50, specify a different number as needed).
      - -offset int: Offset the results to display (use in pagination, starts from 0).
      - -json: Return output in JSON format (use for structured data needs).
      - -help: Provide all flags avaiable and information about tool. Use this flag if user asked for help or if user asked for all flags or if user asked about plugin.
      - -json: Return output in json format. 
      Do not include any flags not listed here. Use these flags to align with the request's specific requirements. All flags are optional.
    2. **Quotes around flag content**: If flag content has space between like "windows 10," use "'windows 10'" for any flag. Or another example like "> 15" use "'> 15'" for any flag. Their should always be space between sign like ">", "<", "=", ... and the number. 
    3. **Relevance and Efficiency**: Ensure that the flags chosen for the command are relevant and contribute to an effective and efficient CVEs discovery process.
  
    Example Commands:
    For listing recent critical CVEs with publicly available PoCs:
    \`\`\`json
    { "command": "cvemap -severity critical -poc true -limit 10 -json" }
    \`\`\`
  
    For a request for help or all flags or if the user asked about how the plugin works:
    \`\`\`json
    { "command": "cvemap -help" }
    \`\`\`
  
    Response:`

  return answerMessage
}

export const transformUserQueryToCyberChefCommand = (lastMessage: Message) => {
  const answerMessage = `
      Query: "${lastMessage.content}"
    
      DON'T USE DOUBLE QUOTES ("") for any variable.
    
      Based on this query, generate a command for the 'CyberChef' tool using the specified operations ('op') and recipe structures, or use CyberChef Magic if the format is not provided. Ensure that the command follows the required JSON format and only includes the provided operations.
  
      IMPORTANT: The AI response must strictly adhere to the JSON format specified below for CyberChef Bake. For CyberChef Magic, no specific format is required. If user asks for help or explanation related to plugin than help them to understand the plugin and its usage in short form.
    
      FORMAT FOR AI RESPONSE (CyberChef Bake):
      \`\`\`json
      { 
          "input": "[input data]",
          "recipe": "[recipe instructions]",
          "outputType": "[output type]"
      }
      \`\`\`
      Replace '[input data]', '[recipe instructions]', and '[output type]' with the actual data and values. The recipe should be constructed using only the specified operations and their corresponding structures. The 'outputType' should be one of 'string', 'number', or 'byteArray'.
    
      FORMAT FOR AI RESPONSE (CyberChef Magic):
      If no specific format is provided in the query, use CyberChef Magic which automatically determines the best operation to apply:
      \`\`\`json
      {
          "input": "[input data]"
      }
      \`\`\`
    
      CyberChef Operations for Bake:
      - To Hex, To Base64, From Hex, From Base64, To Morse Code, From Morse Code, MD5, SHA1, To Upper case, To Lower case, Entropy, AES Encrypt, AES Decrypt, To Hexdump, To Braille, From Braille, URL Decode
    
      Recipe Construction Guidelines for Bake:
      - The recipe should be an object for a single operation or an array of objects for multiple operations.
      - Each operation object must include 'op' (operation name) and may include 'args' (arguments) if required.
    
      Example Commands (CyberChef Bake):
      For a simple conversion to Base64:
      \`\`\`json
      { "input": "sample text", "recipe": {"op": "To Base64"}, "outputType": "string" }
      \`\`\`
    
      For a combination of operations:
      \`\`\`json
      { 
          "input": "sample text", 
          "recipe": [
              {"op": "To Hex", "args": {"delimiter": "Space"}},
              {"op": "MD5"}
          ],
          "outputType": "string"
      }
      \`\`\`
    
      For an AES encryption followed by a conversion to Hex:
      \`\`\`json
      { 
          "input": "example", 
          "recipe": [
              {"op": "AES Encrypt", "args": {"key": "mysecretkey", "iv": "initialvector"}},
              {"op": "To Hex"}
          ],
          "outputType": "string"
      }
      \`\`\`
      
      Response:`

  return answerMessage
}

export const transformUserQueryToDnsxCommand = (
  lastMessage: Message,
  fileContentIncluded?: boolean,
  joinedFileNames?: string
) => {
  const dnsxIntroduction = fileContentIncluded
    ? `Based on this query, generate a command for the 'dnsx' tool, focusing on DNS resolution and enumeration. The command should utilize the most relevant flags, with '-list', '-domain', or '-wordlist' being essential for specifying the filename containing the list of subdomains, hosts, domains, or words to resolve or bruteforce. If the request involves resolving a list of domains directly, embed the domains in the command using the '-d' flag. Include the '-help' flag if a help guide or a full list of flags is requested. The command should follow this structured format for clarity and accuracy:`
    : `Based on this query, generate a command for the 'dnsx' tool, focusing on DNS resolution and enumeration. The command should utilize the most relevant flags, with '-d' being used to specify the target domain(s) to resolve or '-l' to specify a file containing the list of subdomains or hosts. If the request involves resolving a list of domains, embed the domains directly in the command using the '-d' flag. Include the '-help' flag if a help guide or a full list of flags is requested. The command should follow this structured format for clarity and accuracy:`

  const domainOrFilenameInclusionText = fileContentIncluded
    ? endent`
    **Filename Inclusion/Domain Inclusion**: 
    Utilize the following flags as directed by the user. Ensure the exact filenames provided by the user are used. Do not assume or substitute filenames.
    - -list string: Use this flag with a file name to specify a list of subdomains or hosts for resolution. This flag always requires a file.
    - -domain string: list of domain to bruteforce. Use this flag in conjunction with the -wordlist flag. This can be used with a file name or as a comma-separated list directly in the command.
    - -wordlist string: list of words to bruteforce. Use this flag in conjunction with the -domain flag. It can also be used with a file name or as a comma-separated list directly in the command.
    dnsx supports the flexibility of direct file inclusion or direct value input in the command. Always use the exact file names or values as specified by the user.
    IMPORTANT: Always use only the this file names: ${joinedFileNames}. Do not create or assume filenames not specified by the user.
  `
    : endent`
    **Direct Domain Inclusion**: When resolving a list of domains or words, directly embed them in the command using the -d or -w flags. These flags can accept comma-separated values directly in the command, providing a quick way to input multiple domains or words without the need for a file.
    - -domain string: Specify the target domain(s) to bruteforce (comma-separated). (required with -wordlist)
    - -wordlist string: Specify the list of words to bruteforce (comma-separated). (required with -domain)
  `

  const dnsxExampleText = fileContentIncluded
    ? endent`For resolving a list of subdomains/hosts using a file named 'targets.txt':
        \`\`\`json
        { "command": "dnsx -list targets.txt -recon" }
        \`\`\`

        For bruteforcing a file of domains with words blog, api, beta:
        \`\`\`json
        { "command": "dnsx -domain domains.txt -wordlist blog,api,beta -a -resp" }
        \`\`\`

        For bruteforcing a file of domains with a wordlist file named 'wordlist.txt':
        \`\`\`json
        { "command": "dnsx -list domains.txt -wordlist wordlist.txt -a -resp" }
        \`\`\``
    : endent`For resolving a list of domains directly:
        \`\`\`json
        { "command": "dnsx -domain domain1.com,domain2.com,domain3.com -wordlist api,blog,help -a -resp" }
        \`\`\``

  const answerMessage = endent`
    Query: "${lastMessage.content}"
  
    ${dnsxIntroduction}
  
    ALWAYS USE THIS FORMAT:
    \`\`\`json
    { "command": "dnsx [flags]" }
    \`\`\`
    Replace '[flags]' with the actual flags and values based on the user's request. Include additional flags only if they are specifically relevant to the query. Ensure the command is properly formatted as valid JSON.
  
    Command Construction Guidelines:
    1. ${domainOrFilenameInclusionText}
    2. **DNS Query Types**: Specify the desired DNS record types to query using the corresponding flags:
      - -a: Query A records (default).
      - -aaaa: Query AAAA records.
      - -cname: Query CNAME records.
      - -ns: Query NS records.
      - -txt: Query TXT records.
      - -srv: Query SRV records.
      - -ptr: Query PTR records.
      - -mx: Query MX records.
      - -soa: Query SOA records.
      - -any: Query ANY records.
      - -axfr: Query AXFR.
      - -caa: Query CAA records.
      - -recon: Query all DNS record types (a, aaaa, cname, ns, txt, srv, ptr, mx, soa, axfr, caa).
    3. **Filters and Probes**: Apply filters and enable additional probes as needed:
      - -re, -resp: Display DNS response.
      - -ro, -resp-only: Display DNS response only.
      - -rc, -rcode string: Filter results by DNS status code (e.g., -rcode noerror,servfail,refused).
      - -cdn: Display CDN name.
      - -asn: Display host ASN information.
    4. **Configurations**: Customize the behavior of dnsx using configuration flags:
      - -r, -resolver string: Specify the list of resolvers to use (comma-separated).
      - -wt, -wildcard-threshold int: Set the wildcard filter threshold (default 5).
      - -wd, -wildcard-domain string: Specify the domain name for wildcard filtering (other flags will be ignored - only JSON output is supported).
    5. **Help Flag**: If the user requests help or a list of available flags, include the '-help' flag in the command.
  
    Example Commands:
    ${dnsxExampleText}
  
    For a request for help or to see all flags:
    \`\`\`json
    { "command": "dnsx -help" }
    \`\`\`
  
    Response:`

  return answerMessage
}
