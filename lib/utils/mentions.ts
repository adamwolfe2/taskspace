/**
 * @Mention Utilities
 *
 * Parse @username from text, resolve to user IDs, render as styled links.
 */

export interface ParsedMention {
  username: string
  startIndex: number
  endIndex: number
}

/**
 * Parse @mentions from text content
 * Matches @username patterns (alphanumeric + dots + hyphens + underscores)
 */
export function parseMentions(text: string): ParsedMention[] {
  const mentionRegex = /@([a-zA-Z0-9._-]+)/g
  const mentions: ParsedMention[] = []
  let match

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push({
      username: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    })
  }

  return mentions
}

/**
 * Resolve @mentions to user IDs given a team member list
 */
export function resolveMentions(
  text: string,
  teamMembers: Array<{ id: string; name: string; email?: string }>
): Array<{ userId: string; username: string }> {
  const parsed = parseMentions(text)

  return parsed
    .map((mention) => {
      const member = teamMembers.find(
        (m) =>
          m.name.toLowerCase().replace(/\s+/g, ".") === mention.username.toLowerCase() ||
          m.name.toLowerCase().replace(/\s+/g, "") === mention.username.toLowerCase() ||
          m.name.toLowerCase() === mention.username.toLowerCase() ||
          m.email?.split("@")[0].toLowerCase() === mention.username.toLowerCase()
      )

      if (member) {
        return { userId: member.id, username: mention.username }
      }
      return null
    })
    .filter((m): m is { userId: string; username: string } => m !== null)
}

/**
 * Replace @mentions in text with styled HTML spans
 */
export function renderMentionsHTML(text: string): string {
  return text.replace(
    /@([a-zA-Z0-9._-]+)/g,
    '<span class="mention text-blue-600 font-medium bg-blue-50 px-1 rounded">@$1</span>'
  )
}

/**
 * Get unique usernames from text
 */
export function getUniqueMentionedUsernames(text: string): string[] {
  const parsed = parseMentions(text)
  return [...new Set(parsed.map((m) => m.username))]
}
