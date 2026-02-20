"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, FileSpreadsheet, FileJson, Users, Upload, Loader2 } from "lucide-react"
import { ImportWizard } from "@/components/migrations/import-wizard"
import { useToast } from "@/hooks/use-toast"

export function DataExportTab() {
  const [activeSubTab, setActiveSubTab] = useState("export")
  const [exportingType, setExportingType] = useState<string | null>(null)
  const { toast } = useToast()

  const handleExport = (type: string, format: string) => {
    const key = `${type}-${format}`
    setExportingType(key)
    window.open(`/api/export?type=${type}&format=${format}`, "_blank")
    toast({ title: "Export started", description: "Check your downloads folder" })
    setTimeout(() => setExportingType(null), 2000)
  }

  const handleCalendarExport = (type: string) => {
    setExportingType(`cal-${type}`)
    window.open(`/api/export/calendar?type=${type}`, "_blank")
    toast({ title: "Calendar export started", description: "Import the .ics file into your calendar app" })
    setTimeout(() => setExportingType(null), 2000)
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="export" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-2">
            <Upload className="h-4 w-4" />
            Import
          </TabsTrigger>
        </TabsList>

        {/* Export Tab */}
        <TabsContent value="export">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                <CardTitle>Export Data</CardTitle>
              </div>
              <CardDescription>
                Download your organization's data in CSV or JSON format. Exports include all historical data for the current workspace. Use CSV for spreadsheet applications or JSON for data migration and programmatic access.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Rocks Export */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <FileSpreadsheet className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-medium">Rocks (Goals)</h3>
                  <p className="text-sm text-muted-foreground">Export all quarterly goals</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExport("rocks", "csv")} disabled={exportingType === "rocks-csv"}>
                  {exportingType === "rocks-csv" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport("rocks", "json")} disabled={exportingType === "rocks-json"}>
                  {exportingType === "rocks-json" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileJson className="h-4 w-4 mr-1" />}
                  JSON
                </Button>
              </div>
            </div>

            {/* Tasks Export */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <FileSpreadsheet className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-medium">Tasks</h3>
                  <p className="text-sm text-muted-foreground">Export all assigned tasks</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExport("tasks", "csv")} disabled={exportingType === "tasks-csv"}>
                  {exportingType === "tasks-csv" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport("tasks", "json")} disabled={exportingType === "tasks-json"}>
                  {exportingType === "tasks-json" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileJson className="h-4 w-4 mr-1" />}
                  JSON
                </Button>
              </div>
            </div>

            {/* EOD Reports Export */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <FileSpreadsheet className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-medium">EOD Reports</h3>
                  <p className="text-sm text-muted-foreground">Export all end-of-day reports</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExport("eod-reports", "csv")} disabled={exportingType === "eod-reports-csv"}>
                  {exportingType === "eod-reports-csv" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport("eod-reports", "json")} disabled={exportingType === "eod-reports-json"}>
                  {exportingType === "eod-reports-json" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileJson className="h-4 w-4 mr-1" />}
                  JSON
                </Button>
              </div>
            </div>

            {/* Team Export */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-medium">Team Members</h3>
                  <p className="text-sm text-muted-foreground">Export team directory</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExport("team", "csv")} disabled={exportingType === "team-csv"}>
                  {exportingType === "team-csv" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport("team", "json")} disabled={exportingType === "team-json"}>
                  {exportingType === "team-json" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileJson className="h-4 w-4 mr-1" />}
                  JSON
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Calendar Export */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                <Download className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <h3 className="font-medium">Calendar Export (ICS)</h3>
                <p className="text-sm text-muted-foreground">
                  Export tasks and rocks to your calendar app (Google Calendar, Apple Calendar, Outlook)
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => handleCalendarExport("all")} disabled={exportingType === "cal-all"}>
                {exportingType === "cal-all" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                All Items
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleCalendarExport("tasks")} disabled={exportingType === "cal-tasks"}>
                {exportingType === "cal-tasks" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                Tasks Only
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleCalendarExport("rocks")} disabled={exportingType === "cal-rocks"}>
                {exportingType === "cal-rocks" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                Rocks Only
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Download the ICS file and import it into your calendar application.
            </p>
          </div>

          <Separator />

          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">Export Notes:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>CSV files can be opened in Excel, Google Sheets, or any spreadsheet application</li>
              <li>JSON format is useful for data migration or integration with other systems</li>
              <li>Large exports may take a moment to generate</li>
              <li>Exports include all historical data - use date filters in API for specific ranges</li>
            </ul>
          </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                <CardTitle>Import Data</CardTitle>
              </div>
              <CardDescription>
                Import your data from other project management tools like Trello, Asana, or CSV files. This will create tasks, projects, and workspaces in TaskSpace while preserving your existing data structure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImportWizard />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
