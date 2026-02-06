"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, XCircle, AlertTriangle, Database, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function DatabaseManagementPage() {
  const { toast } = useToast()
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<{ migratedRecords?: number; steps?: string[]; error?: string } | null>(null)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")

  const handleRunSetup = async () => {
    setIsRunning(true)
    setStatus("idle")
    setResult(null)

    try {
      const response = await fetch("/api/admin/emergency-setup", {
        method: "POST",
        credentials: "include",
      })

      const data = await response.json()

      if (data.success) {
        setStatus("success")
        setResult(data.data)
        toast({
          title: "Database setup completed",
          description: `Successfully migrated ${data.data.migratedRecords} records`,
        })
      } else {
        setStatus("error")
        setResult({ error: data.error })
        toast({
          title: "Setup failed",
          description: data.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      setStatus("error")
      setResult({ error: error instanceof Error ? error.message : "Unknown error" })
      toast({
        title: "Setup failed",
        description: "An error occurred while running database setup",
        variant: "destructive",
      })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Database Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage database schema and run maintenance tasks
        </p>
      </div>

      <div className="space-y-6">
        {/* Workspace Setup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Workspace Setup & Data Migration
            </CardTitle>
            <CardDescription>
              Create workspace tables and migrate existing data to workspace system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900">When to use this</p>
                  <ul className="text-sm text-amber-700 mt-1 space-y-1 list-disc list-inside">
                    <li>If users can't see their data (dashboard shows zeros)</li>
                    <li>After restoring from a database backup</li>
                    <li>If workspace tables are missing</li>
                    <li>To migrate legacy data to workspace system</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">What this does</p>
                  <ul className="text-sm text-blue-700 mt-1 space-y-1 list-disc list-inside">
                    <li>Creates workspace and workspace_members tables if missing</li>
                    <li>Adds workspace_id columns to data tables</li>
                    <li>Creates a default workspace for your organization</li>
                    <li>Migrates all existing data to the default workspace</li>
                    <li>Safe to run multiple times (idempotent)</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button
              onClick={handleRunSetup}
              disabled={isRunning}
              size="lg"
              className="w-full"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Running Setup...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Run Workspace Setup
                </>
              )}
            </Button>

            {status === "success" && result && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-green-900">Setup Completed Successfully</p>
                    <p className="text-sm text-green-700 mt-1">
                      Workspace created and {result.migratedRecords} records migrated
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 border rounded-lg p-4">
                  <p className="font-medium text-sm mb-2">Setup Steps:</p>
                  <div className="space-y-1">
                    {result.steps?.map((step: string, i: number) => (
                      <div key={i} className="text-xs font-mono text-slate-700">
                        {step}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900">Next Steps</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Refresh the dashboard to see your restored data. Your team can now submit EOD
                    reports and manage tasks normally.
                  </p>
                </div>
              </div>
            )}

            {status === "error" && result && (
              <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-red-900">Setup Failed</p>
                  <pre className="text-xs text-red-700 mt-2 whitespace-pre-wrap font-mono bg-red-100 p-2 rounded overflow-x-auto">
                    {result.error || "Unknown error occurred"}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Future: Add more database management tools here */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-muted-foreground">More Tools Coming Soon</CardTitle>
            <CardDescription>
              Additional database management and maintenance tools will be added here
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
