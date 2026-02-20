import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getPost, getAllPosts } from "@/lib/blog"
import { Calendar, Clock, ArrowLeft, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllPosts().map(post => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return {}
  return {
    title: `${post.title} — Taskspace Blog`,
    description: post.description,
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ""
  const d = new Date(dateStr + "T12:00:00Z")
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-6"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to blog
          </Link>

          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 leading-tight">
            {post.title}
          </h1>

          <p className="text-lg text-slate-600 mb-6 leading-relaxed">{post.description}</p>

          <div className="flex items-center gap-4 text-sm text-slate-400">
            {post.date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(post.date)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {post.readingTime} min read
            </span>
          </div>
        </div>
      </div>

      {/* Article body */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article
          className="prose-custom"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Divider */}
        <hr className="my-12 border-slate-200" />

        {/* CTA */}
        <div className="p-8 bg-slate-900 rounded-lg text-center text-white">
          <h3 className="text-2xl font-bold mb-2">Ready to put this into practice?</h3>
          <p className="text-slate-300 mb-6">
            Taskspace brings EOS to life — rocks, EOD reports, scorecards, and team accountability tools built for remote teams.
          </p>
          <Link
            href="/app?page=register"
            className="inline-flex items-center gap-2 bg-white text-slate-900 font-semibold px-6 py-3 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Get started free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Back link */}
        <div className="mt-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to all posts
          </Link>
        </div>
      </div>
    </div>
  )
}
