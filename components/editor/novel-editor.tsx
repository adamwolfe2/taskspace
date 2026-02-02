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
import { useEffect, useState } from "react"
import { useDebouncedCallback } from "use-debounce"
import { defaultExtensions } from "./extensions"
import { Separator } from "@/components/ui/separator"
import { slashCommand, suggestionItems } from "./slash-command"

const extensions = [...defaultExtensions, slashCommand]

const defaultContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Start writing..." }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "This is a Notion-style editor. Try typing '/' for commands.",
        },
      ],
    },
  ],
}

export function NovelEditor() {
  const [initialContent, setInitialContent] = useState<null | JSONContent>(null)
  const [saveStatus, setSaveStatus] = useState("Saved")
  const [charsCount, setCharsCount] = useState<number>()

  const debouncedUpdates = useDebouncedCallback(async (editor: EditorInstance) => {
    const json = editor.getJSON()
    setCharsCount(editor.storage.characterCount.words())
    window.localStorage.setItem("novel-content", JSON.stringify(json))
    setSaveStatus("Saved")
  }, 500)

  useEffect(() => {
    const content = window.localStorage.getItem("novel-content")
    if (content) setInitialContent(JSON.parse(content))
    else setInitialContent(defaultContent)
  }, [])

  if (!initialContent) return null

  return (
    <div className="relative w-full max-w-screen-lg mx-auto">
      <div className="flex absolute right-5 top-5 z-10 mb-5 gap-2">
        <div className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-600">
          {saveStatus}
        </div>
        {charsCount && (
          <div className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-600">
            {charsCount} Words
          </div>
        )}
      </div>
      <EditorRoot>
        <EditorContent
          initialContent={initialContent}
          extensions={extensions}
          className="relative min-h-[500px] w-full max-w-screen-lg border border-slate-200 bg-white sm:mb-[calc(20vh)] sm:rounded-lg sm:shadow-lg"
          editorProps={{
            attributes: {
              class:
                "prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full p-8",
            },
          }}
          onUpdate={({ editor }) => {
            debouncedUpdates(editor)
            setSaveStatus("Unsaved")
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
