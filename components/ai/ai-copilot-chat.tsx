"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Send, Bot, User, Sparkles, HelpCircle } from "lucide-react"
import type { AIConversation, AIQueryResponse } from "@/lib/types"

interface AICopilotChatProps {
  onQuery: (query: string) => Promise<AIQueryResponse & { conversationId: string }>
  conversationHistory: AIConversation[]
  isLoading: boolean
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  suggestedFollowUps?: string[]
  timestamp: string
}

const SUGGESTED_QUERIES = [
  "What did Kumar work on this week?",
  "Who's blocked and needs help?",
  "Which rocks are at risk?",
  "Summarize yesterday's team updates",
  "Who has capacity for new work?",
  "What patterns do you see in our EOD reports?",
]

export function AICopilotChat({
  onQuery,
  conversationHistory,
  isLoading,
}: AICopilotChatProps) {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Convert conversation history to messages on mount
  useEffect(() => {
    const converted = conversationHistory.flatMap((conv) => {
      const msgs: Message[] = [
        {
          id: `${conv.id}-user`,
          role: "user",
          content: conv.query,
          timestamp: conv.createdAt,
        },
      ]
      if (conv.response) {
        msgs.push({
          id: `${conv.id}-assistant`,
          role: "assistant",
          content: conv.response,
          timestamp: conv.createdAt,
        })
      }
      return msgs
    })
    setMessages(converted.reverse())
  }, [conversationHistory])

  // Auto-scroll to bottom when messages change or loading state changes
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const handleSubmit = async (query: string = input) => {
    if (!query.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")

    try {
      const result = await onQuery(query.trim())

      const assistantMessage: Message = {
        id: result.conversationId,
        role: "assistant",
        content: result.response,
        suggestedFollowUps: result.suggestedFollowUps,
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <Card className="flex flex-col h-[500px]">
      <CardHeader className="flex-shrink-0 pb-2">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          AI Copilot
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 pt-0">
        <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <Sparkles className="h-12 w-12 text-primary/40 mb-4" />
              <h3 className="font-medium mb-2">Ask me anything about your team</h3>
              <p className="text-sm text-muted-foreground mb-4">
                I have context on EOD reports, tasks, rocks, and team performance
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTED_QUERIES.slice(0, 3).map((query) => (
                  <Button
                    key={query}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSubmit(query)}
                    className="text-xs"
                    disabled={isLoading}
                  >
                    <HelpCircle className="h-3 w-3 mr-1" />
                    {query}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.suggestedFollowUps && message.suggestedFollowUps.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-1">
                        <p className="text-xs text-muted-foreground mb-2">Follow-up questions:</p>
                        {message.suggestedFollowUps.map((followUp, i) => (
                          <Button
                            key={i}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs h-auto py-1 px-2"
                            onClick={() => handleSubmit(followUp)}
                            disabled={isLoading}
                          >
                            {followUp}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3" role="status" aria-label="AI is thinking">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" aria-hidden="true" />
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  </div>
                </div>
              )}
              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <div className="flex-shrink-0 pt-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your team..."
              disabled={isLoading}
              className="flex-1"
              aria-label="Ask AI Copilot a question"
            />
            <Button
              onClick={() => handleSubmit()}
              disabled={!input.trim() || isLoading}
              size="icon"
              aria-label={isLoading ? "Sending message" : "Send message"}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" role="status" aria-label="Loading" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
