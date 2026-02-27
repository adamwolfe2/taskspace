"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { USE_CASE_TEMPLATES, type UseCaseTemplate } from "@/lib/types/use-case-templates"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Users, FileBarChart, Building2, SlidersHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

interface UseCaseSelectorProps {
  open: boolean
  workspaceId: string
  onComplete: (templateId: UseCaseTemplate["id"]) => void
}

const TEMPLATE_ICONS: Record<UseCaseTemplate["id"], React.ElementType> = {
  team: Users,
  "client-reporting": FileBarChart,
  "multi-company": Building2,
  custom: SlidersHorizontal,
}

export function UseCaseSelectorModal({ open, workspaceId, onComplete }: UseCaseSelectorProps) {
  const [saving, setSaving] = useState<string | null>(null)
  const { toast } = useToast()

  const handleSelect = async (template: UseCaseTemplate) => {
    setSaving(template.id)
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/features`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
        body: JSON.stringify({ features: template.features }),
      })
      if (!res.ok) throw new Error("Failed to update features")
      toast({
        title: `Workspace set up for "${template.title}"`,
        description: "You can change features anytime in Settings.",
      })
      onComplete(template.id)
    } catch {
      toast({ title: "Couldn't save selection", description: "Please try again.", variant: "destructive" })
      setSaving(null)
    }
  }

  return (
    <Dialog open={open} modal onOpenChange={open => { if (!open) onComplete("custom") }}>
      <DialogContent className="max-w-2xl w-full">
        <div className="text-center mb-6">
          <DialogTitle className="text-2xl font-bold">What are you using Taskspace for?</DialogTitle>
          <DialogDescription className="text-gray-500 mt-2">
            We&apos;ll set up the right features for you. You can always change this later.
          </DialogDescription>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {USE_CASE_TEMPLATES.map(template => {
            const Icon = TEMPLATE_ICONS[template.id]
            return (
              <button
                key={template.id}
                onClick={() => handleSelect(template)}
                disabled={!!saving}
                className={cn(
                  "text-left rounded-xl border border-gray-200 p-5 hover:border-black hover:shadow-sm transition-all disabled:cursor-not-allowed",
                  saving === template.id && "opacity-50"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {saving === template.id ? (
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    ) : (
                      <Icon className="h-5 w-5 text-black" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-black text-sm">{template.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{template.subtitle}</div>
                    <p className="text-sm text-gray-600 mt-2 leading-snug">{template.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {template.highlightedFeatures.map(f => (
                        <span key={f} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{f}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
