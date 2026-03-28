"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, XCircle, AlertTriangle, Database, RefreshCw, Search, Zap } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function AdminDatabasePage() {
  const { toast } = useToast()
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<{ migratedRecords?: number; steps?: string[]; error?: string } | null>(null)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")

  // Diagnose state
  const [isDiagnosing, setIsDiagnosing] = useState(false)
  const [diagnoseResult, setDiagnoseResult] = useState<Record<string, unknown> | null>(null)

  // Force migrate state
  const [isForceMigrating, setIsForceMigrating] = useState(false)
  const [forceResult, setForceResult] = useState<{ total?: number; results?: Record<string, number>; error?: string } | null>(null)
  const [forceStatus, setForceStatus] = useState<"idle" | "success" | "error">("idle")

  const handleRunSetup = async () => {
    setIsRunning(true)
    setStatus("idle")
    setResult(null)

    try {
      const response = await fetch("/api/admin/emergency-setup", {
        method: "POST",
        credentials: "include",
        headers: { "X-Requested-With": "XMLHttpRequest" },
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

  const handleDiagnose = async () => {
    setIsDiagnosing(true)
    setDiagnoseResult(null)
    try {
      const response = await fetch("/api/admin/diagnose-data", {
        method: "POST",
        credentials: "include",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })
      const data = await response.json()
      setDiagnoseResult(data.data || data)
    } catch (error) {
      setDiagnoseResult({ error: error instanceof Error ? error.message : "Unknown error" })
    } finally {
      setIsDiagnosing(false)
    }
  }

  const handleForceMigrate = async () => {
    setIsForceMigrating(true)
    setForceStatus("idle")
    setForceResult(null)

    try {
      const response = await fetch("/api/admin/force-migrate", {
        method: "POST",
        credentials: "include",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })
      const data = await response.json()

      if (data.success) {
        setForceStatus("success")
        setForceResult(data.data)
        toast({
          title: "Force migration completed",
          description: `Migrated ${data.data.total} records to default workspace`,
        })
      } else {
        setForceStatus("error")
        setForceResult({ error: data.error })
        toast({
          title: "Force migration failed",
          description: data.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      setForceStatus("error")
      setForceResult({ error: error instanceof Error ? error.message : "Unknown error" })
    } finally {
      setIsForceMigrating(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Database Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage database schema and run maintenance tasks
        </p>
      </div>

      <div className="space-y-6">
        {/* Diagnose Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Diagnose Data Visibility
            </CardTitle>
            <CardDescription>
              Check why data might not be showing on the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleDiagnose}
              disabled={isDiagnosing}
              variant="outline"
              size="lg"
              className="w-full"
            >
              {isDiagnosing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-5 w-5" />
                  Run Diagnostic
                </>
              )}
            </Button>

            {diagnoseResult && (
              <div className="bg-slate-50 border rounded-lg p-4">
                <p className="font-medium text-sm mb-2">Diagnostic Results:</p>
                <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap overflow-x-auto max-h-96">
                  {JSON.stringify(diagnoseResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Force Migrate */}
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-600" />
              Force Migrate All Data
            </CardTitle>
            <CardDescription>
              Force ALL data to the default workspace, even if it already has a workspace_id
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900">Use this if dashboard still shows zeros after running Workspace Setup</p>
                  <p className="text-sm text-amber-700 mt-1">
                    This moves ALL data to your default workspace regardless of its current workspace assignment. Safe to run multiple times.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleForceMigrate}
              disabled={isForceMigrating}
              size="lg"
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              {isForceMigrating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Force Migrating...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-5 w-5" />
                  Force Migrate All Data
                </>
              )}
            </Button>

            {forceStatus === "success" && forceResult && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-green-900">Force Migration Complete</p>
                    <p className="text-sm text-green-700 mt-1">
                      Migrated {forceResult.total} records to default workspace
                    </p>
                  </div>
                </div>
                <div className="bg-slate-50 border rounded-lg p-4">
                  <p className="font-medium text-sm mb-2">Details:</p>
                  <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap">
                    {JSON.stringify(forceResult.results, null, 2)}
                  </pre>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900">Refresh your dashboard now to see your data.</p>
                </div>
              </div>
            )}

            {forceStatus === "error" && forceResult && (
              <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-red-900">Force Migration Failed</p>
                  <pre className="text-xs text-red-700 mt-2 whitespace-pre-wrap font-mono">
                    {forceResult.error}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">What this does</p>
                  <ul className="text-sm text-blue-700 mt-1 space-y-1 list-disc list-inside">
                    <li>Creates workspace and workspace_members tables if missing</li>
                    <li>Adds workspace_id columns to data tables</li>
                    <li>Creates a default workspace for your organization</li>
                    <li>Migrates data with missing workspace assignment</li>
                    <li>Safe to run multiple times (idempotent)</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button
              onClick={handleRunSetup}
              disabled={isRunning}
              size="lg"
              variant="outline"
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
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {result.steps?.map((step: string, i: number) => (
                      <div key={i} className="text-xs font-mono text-slate-700">
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {status === "error" && result && (
              <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-red-900">Setup Failed</p>
                  <pre className="text-xs text-red-700 mt-2 whitespace-pre-wrap font-mono bg-red-100 p-2 rounded overflow-x-auto max-h-64">
                    {result.error || "Unknown error occurred"}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
