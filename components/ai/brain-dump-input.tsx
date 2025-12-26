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
- "Kumar needs to finish the API integration by Friday, it's blocking Marco"
- "Sabbir should review the design mockups Sheenam sent"
- "Need someone to handle the client presentation prep - probably Ailyn"
- "Ivan's been stuck on that bug for 2 days, have him pair with Saad"
- "Lujan mentioned wanting more frontend work, assign him the dashboard redesign"`

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
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
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {content.length > 0 ? `${content.length} characters` : "Start typing..."}
          </p>
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || isProcessing}
            className="gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Tasks
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
