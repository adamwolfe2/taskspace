"use client"

import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react"
import type { ImportJob } from "@/lib/migrations/types"

interface ImportSummaryProps {
  job: ImportJob
  onReset: () => void
}

export function ImportSummary({ job, onReset }: ImportSummaryProps) {
  const stats = job.stats
  const hasErrors = job.errors.length > 0
  const hasWarnings = job.warnings.length > 0

  // Calculate duration
  const duration = job.completedAt
    ? Math.round(
        (new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 1000
      )
    : 0

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            hasErrors ? "bg-red-100" : "bg-green-100"
          }`}
        >
          {hasErrors ? (
            <XCircle className="h-10 w-10 text-red-600" />
          ) : (
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          )}
        </div>
        <h2 className="mt-4 text-2xl font-semibold text-slate-900">
          {hasErrors ? "Import Completed with Errors" : "Import Successful!"}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Completed in {duration} seconds
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Workspaces Created */}
        {stats.workspacesCreated !== undefined && stats.workspacesCreated > 0 && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-700">Workspaces</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {stats.workspacesCreated}
            </p>
            <p className="mt-1 text-xs text-slate-500">Created</p>
          </div>
        )}

        {/* Projects Created */}
        {stats.projectsCreated !== undefined && stats.projectsCreated > 0 && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-700">Projects</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {stats.projectsCreated}
            </p>
            <p className="mt-1 text-xs text-slate-500">Created</p>
          </div>
        )}

        {/* Tasks Created */}
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-700">Tasks</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {stats.tasksCreated || 0}
          </p>
          <p className="mt-1 text-xs text-slate-500">Created</p>
        </div>

        {/* Tasks Failed */}
        {stats.tasksFailed !== undefined && stats.tasksFailed > 0 && (
          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-sm font-medium text-red-900">Failed</p>
            <p className="mt-2 text-3xl font-bold text-red-600">
              {stats.tasksFailed}
            </p>
            <p className="mt-1 text-xs text-red-700">Tasks</p>
          </div>
        )}

        {/* Users Invited */}
        {stats.usersInvited !== undefined && stats.usersInvited > 0 && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-700">Users</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {stats.usersInvited}
            </p>
            <p className="mt-1 text-xs text-slate-500">Invited</p>
          </div>
        )}

        {/* Tags Created */}
        {stats.tagsCreated !== undefined && stats.tagsCreated > 0 && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-700">Tags</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {stats.tagsCreated}
            </p>
            <p className="mt-1 text-xs text-slate-500">Created</p>
          </div>
        )}
      </div>

      {/* Errors Section */}
      {hasErrors && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-900">
                {job.errors.length} Error{job.errors.length !== 1 ? "s" : ""}
              </h3>
              <div className="mt-3 space-y-2">
                {job.errors.slice(0, 5).map((error, index) => (
                  <div key={index} className="text-sm text-red-800">
                    <span className="font-medium">{error.code}:</span> {error.message}
                  </div>
                ))}
                {job.errors.length > 5 && (
                  <p className="text-sm text-red-700 italic">
                    ... and {job.errors.length - 5} more errors
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warnings Section */}
      {hasWarnings && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-900">
                {job.warnings.length} Warning{job.warnings.length !== 1 ? "s" : ""}
              </h3>
              <div className="mt-3 space-y-2">
                {job.warnings.slice(0, 3).map((warning, index) => (
                  <div key={index} className="text-sm text-yellow-800">
                    <span className="font-medium">{warning.code}:</span> {warning.message}
                  </div>
                ))}
                {job.warnings.length > 3 && (
                  <p className="text-sm text-yellow-700 italic">
                    ... and {job.warnings.length - 3} more warnings
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Details */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
        <h3 className="text-sm font-medium text-slate-900 mb-4">Import Details</h3>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">Import ID</dt>
            <dd className="mt-1 font-mono text-xs text-slate-900">{job.id}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Provider</dt>
            <dd className="mt-1 text-slate-900 capitalize">{job.provider}</dd>
          </div>
          <div>
            <dt className="text-slate-500">File Name</dt>
            <dd className="mt-1 text-slate-900">{job.fileName}</dd>
          </div>
          <div>
            <dt className="text-slate-500">File Size</dt>
            <dd className="mt-1 text-slate-900">
              {(job.fileSize / 1024 / 1024).toFixed(2)} MB
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Started</dt>
            <dd className="mt-1 text-slate-900">
              {new Date(job.startedAt).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Completed</dt>
            <dd className="mt-1 text-slate-900">
              {job.completedAt
                ? new Date(job.completedAt).toLocaleString()
                : "N/A"}
            </dd>
          </div>
        </dl>
      </div>

      {/* Actions */}
      <div className="flex justify-between gap-3">
        <button
          onClick={onReset}
          className="rounded-md border border-slate-300 px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Import More Data
        </button>
        <button
          onClick={() => {
            window.location.href = job.workspaceId
              ? `/app?workspace=${job.workspaceId}&tab=tasks`
              : "/app"
          }}
          className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          View Imported Data
        </button>
      </div>

      {/* Download Report */}
      <div className="text-center">
        <button
          onClick={() => {
            // Generate and download report
            const report = {
              job,
              summary: {
                duration,
                stats,
                errors: job.errors,
                warnings: job.warnings,
              },
            }
            const blob = new Blob([JSON.stringify(report, null, 2)], {
              type: "application/json",
            })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `import-report-${job.id}.json`
            a.click()
            URL.revokeObjectURL(url)
          }}
          className="text-sm text-slate-600 hover:text-slate-900 underline"
        >
          Download Full Report
        </button>
      </div>
    </div>
  )
}
