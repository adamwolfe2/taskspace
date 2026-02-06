"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Download, FileSpreadsheet, FileJson, Users } from "lucide-react"

export function DataExportTab() {
  return (
    <div className="space-y-6">
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
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Rocks Export */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium">Rocks (Goals)</h3>
                  <p className="text-sm text-muted-foreground">Export all quarterly goals</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open("/api/export?type=rocks&format=csv", "_blank")}
                >
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open("/api/export?type=rocks&format=json", "_blank")}
                >
                  <FileJson className="h-4 w-4 mr-1" />
                  JSON
                </Button>
              </div>
            </div>

            {/* Tasks Export */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium">Tasks</h3>
                  <p className="text-sm text-muted-foreground">Export all assigned tasks</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open("/api/export?type=tasks&format=csv", "_blank")}
                >
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open("/api/export?type=tasks&format=json", "_blank")}
                >
                  <FileJson className="h-4 w-4 mr-1" />
                  JSON
                </Button>
              </div>
            </div>

            {/* EOD Reports Export */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <FileSpreadsheet className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-medium">EOD Reports</h3>
                  <p className="text-sm text-muted-foreground">Export all end-of-day reports</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open("/api/export?type=eod-reports&format=csv", "_blank")}
                >
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open("/api/export?type=eod-reports&format=json", "_blank")}
                >
                  <FileJson className="h-4 w-4 mr-1" />
                  JSON
                </Button>
              </div>
            </div>

            {/* Team Export */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium">Team Members</h3>
                  <p className="text-sm text-muted-foreground">Export team directory</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open("/api/export?type=team&format=csv", "_blank")}
                >
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open("/api/export?type=team&format=json", "_blank")}
                >
                  <FileJson className="h-4 w-4 mr-1" />
                  JSON
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Calendar Export */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <Download className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-medium">Calendar Export (ICS)</h3>
                <p className="text-sm text-muted-foreground">
                  Export tasks and rocks to your calendar app (Google Calendar, Apple Calendar, Outlook)
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open("/api/export/calendar?type=all", "_blank")}
              >
                <Download className="h-4 w-4 mr-1" />
                All Items
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open("/api/export/calendar?type=tasks", "_blank")}
              >
                <Download className="h-4 w-4 mr-1" />
                Tasks Only
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open("/api/export/calendar?type=rocks", "_blank")}
              >
                <Download className="h-4 w-4 mr-1" />
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
    </div>
  )
}
