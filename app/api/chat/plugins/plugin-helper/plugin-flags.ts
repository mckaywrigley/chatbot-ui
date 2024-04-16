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
