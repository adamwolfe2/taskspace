"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, XCircle } from "lucide-react"

export default function FixWorkspacePage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleFix = async () => {
    setStatus("loading")
    setMessage("")

    try {
      const response = await fetch("/api/workspaces/ensure-default", {
        method: "POST",
        credentials: "include",
      })

      const data = await response.json()

      if (data.success) {
        setStatus("success")
        setMessage(data.message || "Workspace created successfully!")
      } else {
        setStatus("error")
        setMessage(data.error || "Failed to create workspace")
      }
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "Unknown error occurred")
    }
  }

  return (
    <div className="container mx-auto py-12 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Fix Workspace</CardTitle>
          <CardDescription>
            Manually create a default workspace and migrate your existing data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            If you're seeing zeros on your dashboard and your data isn't appearing, click the button
            below to create a default workspace and migrate all your existing data to it.
          </p>

          <Button onClick={handleFix} disabled={status === "loading"} className="w-full">
            {status === "loading" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {status === "loading" ? "Creating Workspace..." : "Create Default Workspace"}
          </Button>

          {status === "success" && (
            <div className="flex items-start gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">Success!</p>
                <p className="text-sm text-green-700">{message}</p>
                <p className="text-sm text-green-700 mt-2">
                  Please refresh the page or navigate back to the dashboard to see your data.
                </p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700">{message}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
