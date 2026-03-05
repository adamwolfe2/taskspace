import fs from "fs"
import path from "path"

export interface BlogPost {
  slug: string
  title: string
  date: string
  description: string
  tags: string[]
  image?: string
  readingTime: number
  content: string // HTML
}

const POSTS_DIR = path.join(process.cwd(), "content", "blog")

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { data: {}, body: raw }

  const data: Record<string, string> = {}
  for (const line of match[1].split("\n")) {
    const colon = line.indexOf(":")
    if (colon === -1) continue
    const key = line.slice(0, colon).trim()
    const value = line.slice(colon + 1).trim().replace(/^["']|["']$/g, "")
    data[key] = value
  }
  return { data, body: match[2] }
}

function markdownToHtml(md: string): string {
  const lines = md.split("\n")
  const out: string[] = []
  let inUl = false
  let inOl = false
  let inTable = false
  let inCode = false
  let codeBuffer: string[] = []

  const inline = (s: string): string =>
    s
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
        // Only allow http/https/relative URLs to prevent javascript: XSS
        const safeUrl = /^https?:\/\//i.test(url) || url.startsWith("/") ? url.replace(/"/g, "%22") : "#"
        return `<a href="${safeUrl}" class="text-primary underline">${text}</a>`
      })

  const closeOpenBlocks = () => {
    if (inUl) { out.push("</ul>"); inUl = false }
    if (inOl) { out.push("</ol>"); inOl = false }
    if (inTable) { out.push("</tbody></table>"); inTable = false }
  }

  const isTableRow = (l: string) => l.trim().startsWith("|") && l.trim().endsWith("|")
  const isTableSep = (l: string) => /^\|[-| :]+\|$/.test(l.trim())

  for (const line of lines) {
    // Code fences
    if (line.startsWith("```")) {
      if (!inCode) {
        closeOpenBlocks()
        inCode = true
        codeBuffer = []
      } else {
        inCode = false
        out.push(`<pre class="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto my-4 text-sm"><code>${codeBuffer.join("\n")}</code></pre>`)
      }
      continue
    }
    if (inCode) {
      codeBuffer.push(line.replace(/</g, "&lt;").replace(/>/g, "&gt;"))
      continue
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      closeOpenBlocks()
      out.push('<hr class="my-8 border-slate-200" />')
      continue
    }

    // Table rows
    if (isTableRow(line)) {
      if (isTableSep(line)) {
        // Separator row — skip (header is already emitted)
        continue
      }
      const cells = line.trim().slice(1, -1).split("|").map(c => c.trim())
      if (!inTable) {
        closeOpenBlocks()
        inTable = true
        out.push('<div class="overflow-x-auto my-6"><table class="w-full text-sm border-collapse border border-slate-200">')
        out.push("<thead><tr>")
        cells.forEach(c => out.push(`<th class="border border-slate-200 bg-slate-50 px-4 py-2 text-left font-semibold text-slate-900">${inline(c)}</th>`))
        out.push("</tr></thead><tbody>")
      } else {
        out.push('<tr class="even:bg-slate-50">')
        cells.forEach(c => out.push(`<td class="border border-slate-200 px-4 py-2 text-slate-700">${inline(c)}</td>`))
        out.push("</tr>")
      }
      continue
    }

    // Ordered list
    const olMatch = line.match(/^(\d+)\.\s(.*)/)
    if (olMatch) {
      if (inUl) { out.push("</ul>"); inUl = false }
      if (inTable) { out.push("</tbody></table></div>"); inTable = false }
      if (!inOl) {
        out.push('<ol class="list-decimal list-inside space-y-1 my-4 text-slate-700">')
        inOl = true
      }
      out.push(`<li>${inline(olMatch[2])}</li>`)
      continue
    }

    // Unordered list
    const isUl = line.startsWith("- ") || line.startsWith("* ")
    if (!isUl && inUl) { out.push("</ul>"); inUl = false }
    if (!olMatch && inOl) { out.push("</ol>"); inOl = false }
    if (!isTableRow(line) && inTable) { out.push("</tbody></table></div>"); inTable = false }

    if (line.startsWith("# ")) {
      closeOpenBlocks()
      out.push(`<h1 class="text-3xl font-bold text-slate-900 mt-10 mb-4">${inline(line.slice(2))}</h1>`)
    } else if (line.startsWith("## ")) {
      closeOpenBlocks()
      out.push(`<h2 class="text-2xl font-bold text-slate-900 mt-8 mb-3">${inline(line.slice(3))}</h2>`)
    } else if (line.startsWith("### ")) {
      closeOpenBlocks()
      out.push(`<h3 class="text-xl font-semibold text-slate-900 mt-6 mb-2">${inline(line.slice(4))}</h3>`)
    } else if (isUl) {
      if (!inUl) {
        out.push('<ul class="list-disc list-inside space-y-1 my-4 text-slate-700">')
        inUl = true
      }
      out.push(`<li>${inline(line.slice(2))}</li>`)
    } else if (line.trim() === "") {
      // paragraph break — blocks already closed above
    } else {
      out.push(`<p class="text-slate-700 leading-relaxed my-4">${inline(line)}</p>`)
    }
  }

  closeOpenBlocks()
  return out.join("\n")
}

function readingTime(text: string): number {
  return Math.max(1, Math.round(text.split(/\s+/).length / 200))
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(POSTS_DIR)) return []

  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith(".md"))

  const posts = files.map(file => {
    const slug = file.replace(/\.md$/, "")
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf-8")
    const { data, body } = parseFrontmatter(raw)
    const html = markdownToHtml(body)
    return {
      slug,
      title: data.title || slug,
      date: data.date || "",
      description: data.description || "",
      tags: data.tags ? data.tags.split(",").map(t => t.trim()) : [],
      image: data.image,
      readingTime: readingTime(body),
      content: html,
    } satisfies BlogPost
  })

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getPost(slug: string): BlogPost | null {
  const filePath = path.join(POSTS_DIR, `${slug}.md`)
  if (!fs.existsSync(filePath)) return null

  const raw = fs.readFileSync(filePath, "utf-8")
  const { data, body } = parseFrontmatter(raw)
  const html = markdownToHtml(body)

  return {
    slug,
    title: data.title || slug,
    date: data.date || "",
    description: data.description || "",
    tags: data.tags ? data.tags.split(",").map(t => t.trim()) : [],
    image: data.image,
    readingTime: readingTime(body),
    content: html,
  }
}
