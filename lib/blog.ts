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
  let inList = false
  let inCode = false
  let codeBuffer: string[] = []

  const inline = (s: string): string =>
    s
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline">$1</a>')

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (!inCode) {
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

    const isList = line.startsWith("- ") || line.startsWith("* ")

    if (!isList && inList) {
      out.push("</ul>")
      inList = false
    }

    if (line.startsWith("# ")) {
      out.push(`<h1 class="text-3xl font-bold text-slate-900 mt-10 mb-4">${inline(line.slice(2))}</h1>`)
    } else if (line.startsWith("## ")) {
      out.push(`<h2 class="text-2xl font-bold text-slate-900 mt-8 mb-3">${inline(line.slice(3))}</h2>`)
    } else if (line.startsWith("### ")) {
      out.push(`<h3 class="text-xl font-semibold text-slate-900 mt-6 mb-2">${inline(line.slice(4))}</h3>`)
    } else if (isList) {
      if (!inList) {
        out.push('<ul class="list-disc list-inside space-y-1 my-4 text-slate-700">')
        inList = true
      }
      out.push(`<li>${inline(line.slice(2))}</li>`)
    } else if (line.trim() === "") {
      // paragraph break
    } else {
      out.push(`<p class="text-slate-700 leading-relaxed my-4">${inline(line)}</p>`)
    }
  }

  if (inList) out.push("</ul>")
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
