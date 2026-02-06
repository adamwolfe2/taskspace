"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

export default function RunMigrationsPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [results, setResults] = useState<{ migrations?: { status: string; file: string; error?: string }[]; succeeded?: number; failed?: number; steps?: string[] } | null>(null)

  const handleRunMigrations = async () => {
    setStatus("loading")
    setMessage("Creating workspace tables and migrating data...")
    setResults(null)

    try {
      const response = await fetch("/api/admin/emergency-setup", {
        method: "POST",
        credentials: "include",
      })

      const data = await response.json()

      if (data.success) {
        setStatus("success")
        setMessage(data.message || "Setup completed successfully!")
        setResults(data.data)
      } else {
        setStatus("error")
        setMessage(data.error || "Setup failed")
        setResults(data.data)
      }
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "Unknown error occurred")
    }
  }

  return (
    <div className="container mx-auto py-12 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            Run Database Migrations
          </CardTitle>
          <CardDescription>
            ⚠️ CRITICAL: Your database is missing required tables. Run migrations to create them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm font-medium text-amber-900">⚠️ Important</p>
            <p className="text-sm text-amber-700 mt-1">
              This will create the workspace tables and migrate your existing data. This is safe to run
              and will NOT delete any existing data. Your EOD reports, tasks, and rocks will be restored.
            </p>
          </div>

          <Button
            onClick={handleRunMigrations}
            disabled={status === "loading"}
            className="w-full"
            size="lg"
          >
            {status === "loading" && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {status === "loading" ? "Setting up database..." : "🚀 FIX DATABASE NOW"}
          </Button>

          {status === "success" && results && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-green-900">Success!</p>
                  <p className="text-sm text-green-700">{message}</p>
                  <p className="text-sm text-green-700 mt-2">
                    ✓ {results.succeeded} migrations succeeded
                    {(results.failed ?? 0) > 0 && ` · ${results.failed} failed`}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border rounded-lg p-4">
                <p className="font-medium text-sm mb-2">Setup Steps:</p>
                <div className="space-y-1">
                  {results.steps?.map((step: string, i: number) => (
                    <div key={i} className="text-xs font-mono text-slate-700">
                      {step}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-medium text-blue-900">✅ DONE! Your data is restored.</p>
                <p className="text-sm text-blue-700 mt-2">
                  Go back to the dashboard and refresh. All your data should now be visible.
                  Your team can submit EOD reports again.
                </p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-900">Error</p>
                <pre className="text-xs text-red-700 mt-2 whitespace-pre-wrap font-mono bg-red-100 p-2 rounded overflow-x-auto">
                  {message}
                </pre>
                {results && (
                  <div className="mt-3 space-y-1">
                    {results.migrations?.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs font-mono">
                        {m.status === "success" ? (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-600" />
                        )}
                        <span>{m.file}</span>
                        {m.error && <span className="text-red-600">- {m.error}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
