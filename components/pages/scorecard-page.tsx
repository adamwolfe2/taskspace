"use client"

import { WorkspaceScorecardPage } from "@/components/scorecard/workspace-scorecard-page"
import { ErrorBoundary } from "@/components/shared/error-boundary"

export function ScorecardPage() {
  return (
    <ErrorBoundary>
      <WorkspaceScorecardPage />
    </ErrorBoundary>
  )
}
