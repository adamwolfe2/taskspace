"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { OrgChartEmployee, OrgChartChatMessage } from "@/lib/org-chart/types"
import { MessageCircle, Send, X, ChevronUp, Loader2 } from "lucide-react"

interface ChatInterfaceProps {
  employees: OrgChartEmployee[]
  onMentionClick?: (employeeName: string) => void
}

export function ChatInterface({ employees, onMentionClick }: ChatInterfaceProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<OrgChartChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setIsLoading(true)
    setIsExpanded(true)

    try {
      const response = await fetch("/api/org-chart/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ message: userMessage, employees }),
      })

      const data = await response.json()

      if (data.success) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response },
        ])

        // If there are mentioned employees and a callback, trigger zoom
        if (data.mentionedEmployees?.length > 0 && onMentionClick) {
          // Slight delay to let the user see the response
          setTimeout(() => {
            onMentionClick(data.mentionedEmployees[0])
          }, 1000)
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
          },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't connect to the server. Please try again.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const renderMessageContent = (content: string) => {
    // Replace **Name** with clickable spans
    const parts = content.split(/(\*\*[^*]+\*\*)/g)

    return parts.map((part, idx) => {
      const match = part.match(/^\*\*([^*]+)\*\*$/)
      if (match) {
        const name = match[1]
        const isEmployee = employees.some(
          (e) => e.fullName.toLowerCase() === name.toLowerCase()
        )
        if (isEmployee) {
          return (
            <button
              key={idx}
              onClick={() => onMentionClick?.(name)}
              className="font-semibold text-blue-600 hover:underline"
            >
              {name}
            </button>
          )
        }
        return <strong key={idx}>{name}</strong>
      }
      return <span key={idx}>{part}</span>
    })
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full shadow-lg hover:bg-slate-800 transition-colors z-50"
      >
        <MessageCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Ask about the team</span>
      </button>
    )
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300",
        isExpanded ? "w-full max-w-[480px]" : "w-full max-w-[400px]"
      )}
    >
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        {/* Expanded chat history */}
        {isExpanded && messages.length > 0 && (
          <div className="border-b border-slate-100">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50">
              <span className="text-xs font-medium text-slate-500">
                Conversation
              </span>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>
            <ScrollArea className="h-64 px-4 py-2" ref={scrollRef}>
              <div className="space-y-3">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "text-sm",
                      msg.role === "user" ? "text-right" : "text-left"
                    )}
                  >
                    <div
                      className={cn(
                        "inline-block px-3 py-2 rounded-lg max-w-[85%]",
                        msg.role === "user"
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-700"
                      )}
                    >
                      {msg.role === "assistant"
                        ? renderMessageContent(msg.content)
                        : msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="text-left">
                    <div className="inline-block px-3 py-2 rounded-lg bg-slate-100">
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" role="status" aria-label="Loading response" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Input bar */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the team..."
            className="flex-1 border-none focus-visible:ring-0 text-sm"
            disabled={isLoading}
            aria-label="Ask a question about the team"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="h-8 w-8 rounded-full"
            aria-label={isLoading ? "Sending message" : "Send message"}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" role="status" aria-label="Loading" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
