"use client"

import { NovelEditor } from "@/components/editor/novel-editor"

export default function EditorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center py-8 px-4">
      <div className="w-full max-w-screen-lg mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Document Editor</h1>
        <p className="text-slate-600">Create and edit documents with our Notion-style editor</p>
      </div>
      <NovelEditor />
    </div>
  )
}
