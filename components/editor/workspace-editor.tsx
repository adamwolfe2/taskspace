"use client"

import {
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  type EditorInstance,
  EditorRoot,
  type JSONContent,
} from "novel"
import { useEffect, useState, useRef } from "react"
import { defaultExtensions } from "./extensions"
import { slashCommand, suggestionItems } from "./slash-command"
import { Loader2 } from "lucide-react"

const extensions = [...defaultExtensions, slashCommand]

const emptyContent: JSONContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
    },
  ],
}

interface WorkspaceEditorProps {
  initialContent: string | null
  onSave: (content: string) => void
  isSaving: boolean
}

export function WorkspaceEditor({ initialContent, onSave, isSaving }: WorkspaceEditorProps) {
  const [parsedContent, setParsedContent] = useState<JSONContent | null>(null)
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved" | "saving">("saved")
  const [wordCount, setWordCount] = useState<number>(0)
  const editorRef = useRef<EditorInstance | null>(null)

  // Parse initial content once
  useEffect(() => {
    if (initialContent) {
      try {
        setParsedContent(JSON.parse(initialContent))
      } catch {
        setParsedContent(emptyContent)
      }
    } else {
      setParsedContent(emptyContent)
    }
  }, [initialContent])

  // Update save status based on isSaving prop
  useEffect(() => {
    if (isSaving) {
      setSaveStatus("saving")
    } else if (saveStatus === "saving") {
      setSaveStatus("saved")
    }
  }, [isSaving, saveStatus])

  if (!parsedContent) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" role="status" aria-label="Loading" />
      </div>
    )
  }

  return (
    <div className="relative w-full">
      <div className="flex items-center justify-end gap-2 mb-2">
        <div className="text-xs text-slate-400">
          {saveStatus === "saving" ? "Saving..." : saveStatus === "unsaved" ? "Unsaved" : "Saved"}
        </div>
        {wordCount > 0 && (
          <div className="text-xs text-slate-400">
            {wordCount} words
          </div>
        )}
      </div>
      <EditorRoot>
        <EditorContent
          initialContent={parsedContent}
          extensions={extensions}
          className="relative min-h-[300px] w-full"
          editorProps={{
            attributes: {
              class:
                "prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full px-1 pt-10",
            },
          }}
          onCreate={({ editor }) => {
            editorRef.current = editor
          }}
          onUpdate={({ editor }) => {
            editorRef.current = editor
            const json = editor.getJSON()
            setWordCount(editor.storage.characterCount.words())
            setSaveStatus("unsaved")
            onSave(JSON.stringify(json))
          }}
        >
          <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-slate-200 bg-white px-1 py-2 shadow-md transition-all">
            <EditorCommandEmpty className="px-2 text-slate-500">No results</EditorCommandEmpty>
            <EditorCommandList>
              {suggestionItems.map((item) => (
                <EditorCommandItem
                  value={item.title}
                  onCommand={(val) => item.command?.(val)}
                  className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-slate-50 aria-selected:bg-slate-50"
                  key={item.title}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.description}</p>
                  </div>
                </EditorCommandItem>
              ))}
            </EditorCommandList>
          </EditorCommand>
        </EditorContent>
      </EditorRoot>
    </div>
  )
}
