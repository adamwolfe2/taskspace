"use client"

import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react"

interface ZoomControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}

export function ZoomControls({ onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  return (
    <div className="fixed bottom-24 right-6 flex flex-col gap-2 z-50">
      <Button
        variant="outline"
        size="icon"
        onClick={onZoomIn}
        className="h-10 w-10 rounded-full bg-white shadow-lg hover:bg-slate-50 border-slate-200"
        title="Zoom In"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={onZoomOut}
        className="h-10 w-10 rounded-full bg-white shadow-lg hover:bg-slate-50 border-slate-200"
        title="Zoom Out"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={onReset}
        className="h-10 w-10 rounded-full bg-white shadow-lg hover:bg-slate-50 border-slate-200"
        title="Reset View"
      >
        <Maximize2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
