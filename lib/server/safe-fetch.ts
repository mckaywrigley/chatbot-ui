import { lookup } from "dns/promises"
import net from "net"

function isBlockedIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number)
  if (parts.length !== 4 || parts.some(p => Number.isNaN(p))) return true
  const [a, b] = parts
  if (a === 0) return true
  if (a === 10) return true
  if (a === 127) return true
  if (a === 169 && b === 254) return true // link-local incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 192 && b === 0 && parts[2] === 0) return true // 192.0.0/24
  if (a === 192 && b === 0 && parts[2] === 2) return true // TEST-NET
  if (a === 198 && (b === 18 || b === 19)) return true // benchmarking
  if (a === 198 && b === 51 && parts[2] === 100) return true // TEST-NET-2
  if (a === 203 && b === 0 && parts[2] === 113) return true // TEST-NET-3
  if (a >= 224) return true // multicast + reserved
  return false
}

function isBlockedIPv6(ip: string): boolean {
  const lower = ip.toLowerCase()
  if (lower === "::1" || lower === "::") return true
  if (lower.startsWith("fe80:") || lower.startsWith("fe80::")) return true
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true // unique local
  if (lower.startsWith("ff")) return true // multicast
  if (lower.startsWith("::ffff:")) return isBlockedIPv4(lower.slice(7))
  if (lower.startsWith("64:ff9b::")) return true // IPv4/IPv6 translation
  return false
}

function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) return isBlockedIPv4(ip)
  if (net.isIPv6(ip)) return isBlockedIPv6(ip)
  return true
}

export class SafeFetchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SafeFetchError"
  }
}

export async function assertSafeUrl(url: string): Promise<URL> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new SafeFetchError("Invalid URL")
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new SafeFetchError(`Blocked protocol: ${parsed.protocol}`)
  }

  const hostname = parsed.hostname
  if (!hostname) throw new SafeFetchError("Missing hostname")

  // If the hostname is already a literal IP, check it directly.
  if (net.isIP(hostname) !== 0) {
    if (isBlockedIp(hostname)) {
      throw new SafeFetchError(`Blocked target IP: ${hostname}`)
    }
    return parsed
  }

  // Reject common internal hostnames outright.
  const lowerHost = hostname.toLowerCase()
  if (
    lowerHost === "localhost" ||
    lowerHost.endsWith(".localhost") ||
    lowerHost.endsWith(".internal") ||
    lowerHost.endsWith(".local")
  ) {
    throw new SafeFetchError(`Blocked hostname: ${hostname}`)
  }

  let addrs: { address: string; family: number }[]
  try {
    addrs = await lookup(hostname, { all: true })
  } catch {
    throw new SafeFetchError(`DNS resolution failed for ${hostname}`)
  }

  for (const a of addrs) {
    if (isBlockedIp(a.address)) {
      throw new SafeFetchError(
        `Blocked target: ${hostname} resolves to ${a.address}`
      )
    }
  }

  return parsed
}

export async function safeFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  await assertSafeUrl(url)
  return fetch(url, init)
}
