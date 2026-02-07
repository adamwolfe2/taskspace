/**
 * Shared URL validation utilities
 *
 * Provides SSRF-safe URL validation that blocks requests to private/internal
 * networks, link-local addresses, and other dangerous targets.
 */

// ============================================
// PRIVATE IP / HOSTNAME CHECKS
// ============================================

/**
 * Check if an IPv4 address string falls within private or reserved ranges.
 *
 * Blocked ranges:
 * - 0.0.0.0/8        (current network)
 * - 10.0.0.0/8       (private, RFC 1918)
 * - 127.0.0.0/8      (loopback)
 * - 169.254.0.0/16   (link-local, cloud metadata)
 * - 172.16.0.0/12    (private, RFC 1918: 172.16.x - 172.31.x)
 * - 192.168.0.0/16   (private, RFC 1918)
 */
function isPrivateIPv4(hostname: string): boolean {
  // Match dotted-quad IPv4 addresses
  const ipv4Match = hostname.match(
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  )
  if (!ipv4Match) return false

  const [, a, b] = ipv4Match.map(Number)

  if (a === 0) return true // 0.0.0.0/8
  if (a === 10) return true // 10.0.0.0/8
  if (a === 127) return true // 127.0.0.0/8
  if (a === 169 && b === 254) return true // 169.254.0.0/16
  if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12
  if (a === 192 && b === 168) return true // 192.168.0.0/16

  return false
}

/**
 * Check if a hostname resolves to a blocked internal target.
 */
function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase()

  if (lower === "localhost") return true
  if (lower === "[::1]") return true
  if (lower.endsWith(".local")) return true
  if (lower.endsWith(".internal")) return true
  if (lower.endsWith(".localhost")) return true

  return false
}

// ============================================
// PUBLIC API
// ============================================

export interface UrlValidationOptions {
  /** If true, allows http:// in addition to https:// (default: false) */
  allowHttp?: boolean
  /** If true, allows URLs without a dot in the hostname (default: false) */
  allowBareHostnames?: boolean
  /** Maximum URL length (default: 2048) */
  maxLength?: number
}

/**
 * Validate a URL string for SSRF safety.
 *
 * Returns the normalized URL string on success, or null if the URL is
 * invalid or points to a blocked target.
 *
 * By default, only HTTPS is allowed. Pass `allowHttp: true` to also
 * permit plain HTTP URLs (not recommended for webhook destinations).
 */
export function validateSafeUrl(
  input: string,
  options: UrlValidationOptions = {}
): string | null {
  const {
    allowHttp = false,
    allowBareHostnames = false,
    maxLength = 2048,
  } = options

  if (!input || typeof input !== "string") return null

  let url = input.trim()
  if (url.length < 4 || url.length > maxLength) return null

  // Add protocol if missing
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`
  }

  try {
    const parsed = new URL(url)

    // Protocol check
    if (parsed.protocol === "https:") {
      // always allowed
    } else if (parsed.protocol === "http:" && allowHttp) {
      // allowed only when explicitly opted in
    } else {
      return null
    }

    const hostname = parsed.hostname.toLowerCase()

    // Must have a valid hostname with at least one dot (prevents localhost, bare names)
    if (!allowBareHostnames && !hostname.includes(".")) {
      return null
    }

    // Block private/internal IPs
    if (isPrivateIPv4(hostname)) {
      return null
    }

    // Block known internal hostnames
    if (isBlockedHostname(hostname)) {
      return null
    }

    return parsed.href
  } catch {
    return null
  }
}

/**
 * Validate a webhook destination URL.
 *
 * Enforces HTTPS-only and blocks all private/internal targets.
 */
export function validateWebhookUrl(url: string): string | null {
  return validateSafeUrl(url, { allowHttp: false })
}
