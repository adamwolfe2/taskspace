"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Newspaper, Plus, X, ChevronRight, Users, Building2 } from "lucide-react"
import type { MeetingSection } from "@/lib/db/meetings"

interface Headline {
  id: string
  text: string
  type: "customer" | "employee" | "other"
  addToIds?: boolean
}

interface HeadlinesSectionProps {
  section: MeetingSection
  onComplete: (data: Record<string, unknown>) => void
  onCreateIssue: (title: string, sourceType: string, sourceId?: string) => void
  isActive: boolean
}

export function HeadlinesSection({
  section,
  onComplete,
  onCreateIssue,
  isActive,
}: HeadlinesSectionProps) {
  const [headlines, setHeadlines] = useState<Headline[]>(
    (section.data?.headlines as Headline[]) || []
  )
  const [newHeadline, setNewHeadline] = useState("")
  const [headlineType, setHeadlineType] = useState<"customer" | "employee" | "other">("customer")

  const handleAddHeadline = () => {
    if (!newHeadline.trim()) return
    const headline: Headline = {
      id: `hl_${Date.now()}`,
      text: newHeadline.trim(),
      type: headlineType,
    }
    setHeadlines((prev) => [...prev, headline])
    setNewHeadline("")
  }

  const handleRemoveHeadline = (id: string) => {
    setHeadlines((prev) => prev.filter((h) => h.id !== id))
  }

  const handleAddToIds = (headline: Headline) => {
    onCreateIssue(`Headline: ${headline.text}`, "headline", headline.id)
    setHeadlines((prev) =>
      prev.map((h) => (h.id === headline.id ? { ...h, addToIds: true } : h))
    )
  }

  const handleComplete = () => {
    onComplete({
      headlines,
      count: headlines.length,
      customerCount: headlines.filter((h) => h.type === "customer").length,
      employeeCount: headlines.filter((h) => h.type === "employee").length,
    })
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "customer":
        return <Building2 className="h-3 w-3" />
      case "employee":
        return <Users className="h-3 w-3" />
      default:
        return <Newspaper className="h-3 w-3" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "customer":
        return "bg-blue-100 text-blue-700 border-blue-200"
      case "employee":
        return "bg-purple-100 text-purple-700 border-purple-200"
      default:
        return "bg-slate-100 text-slate-700 border-slate-200"
    }
  }

  if (!isActive && section.completed) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-lg">Headlines</CardTitle>
            </div>
            <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300">
              Completed
            </Badge>
          </div>
          <CardDescription>Customer & employee news shared</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-600">
            {headlines.length} headline{headlines.length !== 1 ? "s" : ""} captured
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isActive) {
    return (
      <Card className="opacity-60">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-slate-400" />
            <CardTitle className="text-lg text-slate-500">Headlines</CardTitle>
          </div>
          <CardDescription>Customer & employee news</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-primary/30 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-lg">Headlines</CardTitle>
          </div>
          {headlines.length > 0 && (
            <Badge variant="secondary">{headlines.length} captured</Badge>
          )}
        </div>
        <CardDescription>
          Share important customer and employee news. Good news, bad news, any news worth noting.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Headline Input */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex gap-1">
              <Button
                variant={headlineType === "customer" ? "default" : "outline"}
                size="sm"
                onClick={() => setHeadlineType("customer")}
                className="gap-1"
              >
                <Building2 className="h-3 w-3" />
                Customer
              </Button>
              <Button
                variant={headlineType === "employee" ? "default" : "outline"}
                size="sm"
                onClick={() => setHeadlineType("employee")}
                className="gap-1"
              >
                <Users className="h-3 w-3" />
                Employee
              </Button>
              <Button
                variant={headlineType === "other" ? "default" : "outline"}
                size="sm"
                onClick={() => setHeadlineType("other")}
              >
                Other
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Enter headline..."
              value={newHeadline}
              onChange={(e) => setNewHeadline(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddHeadline()
              }}
            />
            <Button onClick={handleAddHeadline} disabled={!newHeadline.trim()} aria-label="Add headline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Headlines List */}
        {headlines.length > 0 && (
          <div className="space-y-2">
            {headlines.map((headline) => (
              <div
                key={headline.id}
                className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Badge className={getTypeColor(headline.type)} variant="outline">
                    {getTypeIcon(headline.type)}
                    <span className="ml-1 capitalize">{headline.type}</span>
                  </Badge>
                  <span className="text-sm truncate">{headline.text}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!headline.addToIds && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddToIds(headline)}
                      className="text-xs"
                    >
                      Add to IDS
                    </Button>
                  )}
                  {headline.addToIds && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                      In IDS
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveHeadline(headline.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {headlines.length === 0 && (
          <div className="text-center py-6 text-slate-500">
            <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No headlines yet. Add important news from the week.</p>
          </div>
        )}

        <Button onClick={handleComplete} className="w-full">
          Complete Headlines
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  )
}
