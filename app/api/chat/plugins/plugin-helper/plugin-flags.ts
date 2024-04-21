export interface FlagDefinitions<T> {
  [key: string]: keyof T
}

export interface CvemapParams {
  ids?: string[]
  cwes?: string[]
  vendors?: string
  products?: string
  excludeProducts?: string
  severity?: string
  cvssScores?: string
  cpe?: string
  epssScores?: string
  epssPercentiles?: string
  age?: string
  assignees?: string
  vulnerabilityStatus?: string
  search?: string
  kev?: boolean | undefined
  template?: boolean | undefined
  poc?: boolean | undefined
  hackerone?: boolean | undefined
  remote?: boolean | undefined
  fieldsToDisplay?: string
  excludeFields?: string
  listIdsOnly?: boolean | undefined
  limit?: number
  offset?: number
  json?: boolean | undefined
  error?: string | null
}

export const cvemapFlagDefinitions: FlagDefinitions<CvemapParams> = {
  "-id": "ids",
  "-cwe": "cwes",
  "-cwe-id": "cwes",
  "-v": "vendors",
  "-vendor": "vendors",
  "-p": "products",
  "-product": "products",
  "-eproduct": "excludeProducts",
  "-s": "severity",
  "-severity": "severity",
  "-cs": "cvssScores",
  "-cvss-score": "cvssScores",
  "-c": "cpe",
  "-cpe": "cpe",
  "-es": "epssScores",
  "-epss-score": "epssScores",
  "-ep": "epssPercentiles",
  "-epss-percentile": "epssPercentiles",
  "-age": "age",
  "-a": "assignees",
  "-assignee": "assignees",
  "-vs": "vulnerabilityStatus",
  "-vstatus": "vulnerabilityStatus",
  "-q": "search",
  "-search": "search",
  "-f": "fieldsToDisplay",
  "-fields": "fieldsToDisplay",
  "-fe": "excludeFields",
  "-exclude": "excludeFields",
  "-l": "limit",
  "-limit": "limit",
  "-offset": "offset"
}

export const cvemapBooleanFlagDefinitions: FlagDefinitions<CvemapParams> = {
  "-k": "kev",
  "-kev": "kev",
  "-t": "template",
  "-template": "template",
  "-poc": "poc",
  "-h1": "hackerone",
  "-hackerone": "hackerone",
  "-re": "remote",
  "-remote": "remote",
  "-lsi": "listIdsOnly",
  "-list-id": "listIdsOnly",
  "-j": "json",
  "-json": "json"
}

export const cvemapRepeatableFlags: Set<string> = new Set([
  "-id",
  "-cwe",
  "-cwe-id"
])

export const validRcodes = [
  "noerror",
  "formerr",
  "servfail",
  "nxdomain",
  "notimp",
  "refused",
  "yxdomain",
  "yxrrset",
  "nxrrset",
  "notauth",
  "notzone",
  "badsig",
  "badvers",
  "badkey",
  "badtime",
  "badmode",
  "badname",
  "badalg",
  "badtrunc",
  "badcookie"
]

export interface DnsxParams {
  list?: string
  listFile?: string
  domain?: string[]
  domainFile?: string
  wordlist?: string[]
  wordlistFile?: string
  a?: boolean
  aaaa?: boolean
  cname?: boolean
  ns?: boolean
  txt?: boolean
  srv?: boolean
  ptr?: boolean
  mx?: boolean
  soa?: boolean
  axfr?: boolean
  caa?: boolean
  any?: boolean
  recon?: boolean
  resp?: boolean
  respOnly?: boolean
  rcode?: string[]
  cdn?: boolean
  asn?: boolean
  json?: boolean
  error?: string | null
}

export const dnsxFlagDefinitions: FlagDefinitions<DnsxParams> = {
  "-l": "list",
  "-list": "list",
  "-d": "domain",
  "-domain": "domain",
  "-w": "wordlist",
  "-wordlist": "wordlist",
  "-rc": "rcode",
  "-rcode": "rcode"
}

export const dnsxBooleanFlagDefinitions: FlagDefinitions<DnsxParams> = {
  "-a": "a",
  "-aaaa": "aaaa",
  "-cname": "cname",
  "-ns": "ns",
  "-txt": "txt",
  "-srv": "srv",
  "-ptr": "ptr",
  "-mx": "mx",
  "-soa": "soa",
  "-axfr": "axfr",
  "-caa": "caa",
  "-recon": "recon",
  "-any": "any",
  "-re": "resp",
  "-resp": "resp",
  "-ro": "respOnly",
  "-resp-only": "respOnly",
  "-cdn": "cdn",
  "-asn": "asn",
  "-j": "json",
  "-json": "json"
}

export const dnsxRepeatableFlags: Set<string> = new Set([
  "-d",
  "-domain",
  "-w",
  "-wordlist",
  "-rc",
  "-rcode"
])
