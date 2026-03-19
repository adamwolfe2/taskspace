/**
 * HTML Sanitization Utilities
 *
 * Defense-in-depth sanitization for user-provided content.
 * Uses sanitize-html (pure JS, no jsdom dependency) to strip dangerous HTML
 * tags and attributes before data reaches the database.
 */

import sanitize from "sanitize-html"

/**
 * Sanitizes HTML content, preserving safe formatting tags.
 * Use for rich text fields (e.g., workspace notes) that support formatting.
 */
export function sanitizeHtml(input: string): string {
  if (!input) return input
  return sanitize(input, {
    allowedTags: [
      "b", "i", "em", "strong", "p", "br",
      "ul", "ol", "li", "a",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "blockquote", "code", "pre", "span", "div",
      "table", "thead", "tbody", "tr", "th", "td",
      "hr", "sub", "sup", "s", "u",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      "*": ["class"],
    },
    allowedSchemes: ["https", "http", "mailto"],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          rel: "noopener noreferrer",
        },
      }),
    },
  })
}

/**
 * Strips ALL HTML tags, returning plain text only.
 * Use for fields displayed as plain text in the UI.
 */
export function sanitizeText(input: string): string {
  if (!input) return input
  return sanitize(input, {
    allowedTags: [],
    allowedAttributes: {},
  })
}

/**
 * Recursively sanitizes specified string fields in an object using sanitizeText.
 * Non-string fields and fields not in the list are left unchanged.
 * Returns a shallow copy with sanitized values.
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  fields: string[]
): T {
  if (!obj || typeof obj !== "object") return obj

  const result = { ...obj }
  for (const field of fields) {
    const value = result[field]
    if (typeof value === "string") {
      (result as Record<string, unknown>)[field] = sanitizeText(value)
    }
  }
  return result
}

/**
 * Deep sanitizes all string values in a JSON-serializable structure.
 * Used for JSONB fields like VTO sections where the structure is dynamic.
 */
export function sanitizeDeep(value: unknown): unknown {
  if (typeof value === "string") {
    return sanitizeText(value)
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeDeep)
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = sanitizeDeep(val)
    }
    return result
  }
  return value
}
