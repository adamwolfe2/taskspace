"use client"

import { FeatureGate } from "@/components/shared/feature-gate"
import { WorkspaceEditor } from "@/components/editor/workspace-editor"
import { useWorkspaceNotes } from "@/lib/hooks/use-workspace-notes"
import { Skeleton } from "@/components/ui/skeleton"
import { FileText, AlertCircle } from "lucide-react"

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
          <FileText className="h-5 w-5 text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notes</h1>
          <p className="text-sm text-slate-500">
            Shared workspace notes — auto-saves as you type
          </p>
        </div>
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
