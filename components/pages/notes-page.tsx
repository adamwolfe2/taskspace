"use client"

import { FeatureGate } from "@/components/shared/feature-gate"
import { WorkspaceEditor } from "@/components/editor/workspace-editor"
import { useWorkspaceNotes } from "@/lib/hooks/use-workspace-notes"
import { Skeleton } from "@/components/ui/skeleton"
import { FileText, AlertCircle, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

function NotesContent() {
  const { note, isLoading, error, isSaving, saveNote } = useWorkspaceNotes()

  if (isLoading) {
    return (
      <div className="space-y-6 min-h-[400px]">
        {/* Title area */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        {/* Note card skeletons */}
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <AlertCircle className="h-8 w-8 mb-2 text-destructive" />
        <p className="text-sm">Failed to load workspace notes</p>
      </div>
    )
  }

  // Extract plain text from Tiptap/Novel JSON content
  const extractText = (content: string | null): string => {
    if (!content) return ""
    try {
      const doc = JSON.parse(content) as { type: string; content?: unknown[] }
      const lines: string[] = []
      const visit = (node: unknown) => {
        if (!node || typeof node !== "object") return
        const n = node as { type?: string; text?: string; content?: unknown[] }
        if (n.type === "text" && n.text) lines.push(n.text)
        else if (n.type === "hardBreak") lines.push("\n")
        else if (n.content) {
          n.content.forEach(visit)
          if (["paragraph", "heading", "bulletList", "orderedList", "listItem", "blockquote"].includes(n.type || "")) {
            lines.push("\n")
          }
        }
      }
      if (doc.content) doc.content.forEach(visit)
      return lines.join("").replace(/\n{3,}/g, "\n\n").trim()
    } catch {
      return content
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Notes</h1>
            <p className="text-sm text-slate-500">
              Shared workspace notes — auto-saves as you type
            </p>
          </div>
        </div>
        {note?.content && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              const text = extractText(note.content)
              const blob = new Blob([text], { type: "text/plain;charset=utf-8;" })
              const url = URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = url
              a.download = `workspace-notes-${new Date().toISOString().split("T")[0]}.txt`
              a.click()
              URL.revokeObjectURL(url)
            }}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
        )}
      </div>

      <WorkspaceEditor
        initialContent={note?.content || null}
        onSave={saveNote}
        isSaving={isSaving}
      />
    </div>
  )
}

export function NotesPage() {
  return (
    <FeatureGate feature="core.notes">
      <NotesContent />
    </FeatureGate>
  )
}
