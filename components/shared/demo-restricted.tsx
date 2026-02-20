"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lock } from "lucide-react"
import { useApp } from "@/lib/contexts/app-context"
import type { PageType } from "@/lib/types"

interface DemoRestrictedProps {
  featureName: string
}

export function DemoRestricted({ featureName }: DemoRestrictedProps) {
  const { setCurrentPage } = useApp()

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Demo Mode</h2>
          <p className="text-sm text-muted-foreground mb-1">
            <span className="font-medium">{featureName}</span> is not available in demo mode.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Create a free account to access this feature and manage your team.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCurrentPage("dashboard" as PageType)}>
              Back to Dashboard
            </Button>
            <Button asChild>
              <a href="/?page=register">Sign Up Free</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
