import { Loader2 } from "lucide-react"

export default function SettingsLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Loading settings...</p>
      </div>
    </div>
  )
}
