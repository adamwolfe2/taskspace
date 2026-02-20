"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Brain, Sparkles } from "lucide-react"

interface BrainDumpInputProps {
  onSubmit: (content: string) => Promise<void>
  isProcessing: boolean
}

export function BrainDumpInput({ onSubmit, isProcessing }: BrainDumpInputProps) {
  const [content, setContent] = useState("")

  const handleSubmit = async () => {
    if (!content.trim() || isProcessing) return
    await onSubmit(content.trim())
    setContent("")
  }

  const placeholderText = `Just dump your thoughts here...

Examples:
- "Alex needs to finish the API integration by Friday, it's blocking the launch"
- "Have someone review the design mockups before the client call"
- "Need the marketing team to handle the presentation prep"
- "The onboarding bug has been open for 2 days, pair up to fix it"
- "Assign the dashboard redesign to whoever has the most capacity"`

  return (
    <Card className="border-primary/20 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Brain Dump
        </CardTitle>
        <CardDescription>
          Dump your thoughts and I'll turn them into actionable tasks for your team
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder={placeholderText}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[200px] resize-none"
          disabled={isProcessing}
          aria-label="Brain dump - enter your thoughts to generate tasks"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {content.length > 0 ? `${content.length} characters` : "Start typing..."}
          </p>
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || isProcessing}
            className="gap-2"
            aria-busy={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" role="status" aria-label="Processing" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Generate Tasks
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
