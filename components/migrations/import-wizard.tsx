"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import Image from "next/image"
import { Upload, CheckCircle2, XCircle, Loader2, ArrowLeft } from "lucide-react"
import type { ImportProvider, ImportJob } from "@/lib/migrations/types"
import { ImportSummary } from "./import-summary"

type WizardStep =
  | "source-selection"
  | "file-upload"
  | "processing"
  | "summary"

const PROVIDERS: Array<{
  id: ImportProvider
  name: string
  description: string
  formats: string
  available: boolean
  icon: string
}> = [
  {
    id: "trello",
    name: "Trello",
    description: "Import boards, lists, and cards from Trello JSON exports",
    formats: ".json",
    available: true,
    icon: "/integrations/trello_logo_icon_167765.png",
  },
  {
    id: "asana",
    name: "Asana",
    description: "Import projects and tasks from Asana JSON exports",
    formats: ".json",
    available: true,
    icon: "/integrations/asana.svg",
  },
  {
    id: "generic_csv",
    name: "Generic CSV",
    description: "Import from any tool using a CSV file",
    formats: ".csv",
    available: true,
    icon: "/integrations/icons8-microsoft-outlook-2019.svg", // Placeholder for CSV
  },
]

export function ImportWizard() {
  const [step, setStep] = useState<WizardStep>("source-selection")
  const [selectedProvider, setSelectedProvider] = useState<ImportProvider | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importJob, setImportJob] = useState<ImportJob | null>(null)
  const [progress, setProgress] = useState(0)
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear polling timeout on unmount
  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current)
      }
    }
  }, [])

  // File upload dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
      setError(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: selectedProvider === "trello" || selectedProvider === "asana" ? { "application/json": [".json"] } : { "text/csv": [".csv"] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
  })

  // Start import process
  const handleImport = async () => {
    if (!file || !selectedProvider) return

    setImporting(true)
    setError(null)
    setStep("processing")

    try {
      // Create FormData with file
      const formData = new FormData()
      formData.append("file", file)
      formData.append("provider", selectedProvider)

      // Upload and create import job
      const response = await fetch("/api/migrations/import", {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        body: formData,
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Failed to create import job")
      }

      const jobId = result.data.jobId

      // Poll job status
      await pollJobStatus(jobId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed")
      setImporting(false)
    }
  }

  // Poll import job status
  const pollJobStatus = async (jobId: string) => {
    const maxAttempts = 60 // 5 minutes max (5s intervals)
    let attempts = 0

    const poll = async () => {
      try {
        const response = await fetch(`/api/migrations/import/${jobId}`)
        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || "Failed to get job status")
        }

        const job: ImportJob = result.data.job
        setImportJob(job)
        setProgress(job.progress)

        if (job.status === "completed") {
          setImporting(false)
          setStep("summary")
          return
        }

        if (job.status === "failed") {
          throw new Error(job.errors[0]?.message || "Import failed")
        }

        // Continue polling if still validating
        if (job.status === "validating") {
          attempts++
          if (attempts < maxAttempts) {
            pollTimeoutRef.current = setTimeout(poll, 5000) // Poll every 5 seconds
          } else {
            throw new Error("Import timed out")
          }
          return
        }

        // If status is mapping, start processing chunks
        if (job.status === "mapping") {
          await processChunks(jobId)
          return
        }

        // If status is importing, chunks are being processed
        if (job.status === "importing") {
          attempts++
          if (attempts < maxAttempts) {
            pollTimeoutRef.current = setTimeout(poll, 5000)
          } else {
            throw new Error("Import timed out")
          }
          return
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Polling failed")
        setImporting(false)
      }
    }

    poll()
  }

  // Process import in chunks
  const processChunks = async (jobId: string) => {
    let offset = 0
    const limit = 100
    let hasMore = true

    while (hasMore) {
      try {
        const response = await fetch(`/api/migrations/import/${jobId}/process`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
          body: JSON.stringify({ offset, limit }),
        })

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || "Failed to process chunk")
        }

        setProgress(result.data.progress)
        hasMore = result.data.hasMore
        offset = result.data.nextOffset

        // Small delay between chunks
        if (hasMore) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      } catch (err) {
        throw new Error(
          `Chunk processing failed: ${err instanceof Error ? err.message : "Unknown error"}`
        )
      }
    }

    // Finalize import
    await finalizeImport(jobId)
  }

  // Finalize import
  const finalizeImport = async (jobId: string) => {
    try {
      const response = await fetch(`/api/migrations/import/${jobId}/finalize`, {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Failed to finalize import")
      }

      // Fetch final job state
      const finalResponse = await fetch(`/api/migrations/import/${jobId}`)
      const finalResult = await finalResponse.json()

      if (finalResult.success) {
        setImportJob(finalResult.data.job)
        setProgress(100)
        setStep("summary")
      }

      setImporting(false)
    } catch (err) {
      throw new Error(
        `Finalization failed: ${err instanceof Error ? err.message : "Unknown error"}`
      )
    }
  }

  // Reset wizard
  const handleReset = () => {
    setStep("source-selection")
    setSelectedProvider(null)
    setFile(null)
    setImporting(false)
    setError(null)
    setImportJob(null)
    setProgress(0)
  }

  // Render current step
  return (
    <div className="space-y-6">
      {/* Step 1: Source Selection */}
      {step === "source-selection" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Choose Import Source
            </h2>
            <p className="text-sm text-slate-600">
              Select where you want to import data from
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => {
                  if (provider.available) {
                    setSelectedProvider(provider.id)
                    setStep("file-upload")
                  }
                }}
                disabled={!provider.available}
                className={`relative rounded-lg border-2 p-6 text-left transition-all ${
                  provider.available
                    ? "border-slate-200 hover:border-blue-500 hover:shadow-md cursor-pointer"
                    : "border-slate-100 bg-slate-50 cursor-not-allowed opacity-60"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <Image
                      src={provider.icon}
                      alt={`${provider.name} logo`}
                      width={48}
                      height={48}
                      className="rounded-lg"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900">{provider.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{provider.description}</p>
                    <p className="mt-2 text-xs text-slate-400">Supports: {provider.formats}</p>
                  </div>
                </div>
                {!provider.available && (
                  <span className="absolute top-4 right-4 rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                    Coming Soon
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: File Upload */}
      {step === "file-upload" && (
        <div className="space-y-6">
          <div>
            <button
              onClick={() => setStep("source-selection")}
              className="text-sm text-slate-500 hover:text-slate-800 mb-4 underline"
            >
              <><ArrowLeft className="inline h-4 w-4 mr-1" />Back to source selection</>
            </button>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Upload {PROVIDERS.find((p) => p.id === selectedProvider)?.name} File
            </h2>
            <p className="text-sm text-slate-600">
              Upload your export file (max 50MB)
            </p>
          </div>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-blue-500 bg-blue-50"
                : "border-slate-300 hover:border-slate-400"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-2 text-sm text-slate-600">
              {isDragActive
                ? "Drop the file here"
                : "Drag and drop your file here, or click to browse"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Supports {PROVIDERS.find((p) => p.id === selectedProvider)?.formats}
            </p>
          </div>

          {/* Selected file */}
          {file && (
            <div className="rounded-lg bg-green-50 p-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-900">{file.name}</p>
                <p className="text-xs text-green-700 mt-1">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={() => setFile(null)}
                className="text-green-700 hover:text-green-900"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="rounded-lg bg-red-50 p-4 flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setFile(null)
                setStep("source-selection")
              }}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!file || importing}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Import
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Processing */}
      {step === "processing" && (
        <div className="space-y-6">
          <div className="text-center py-12">
            <Loader2 className="mx-auto h-16 w-16 animate-spin text-slate-600" role="status" aria-label="Importing data" />
            <h2 className="mt-4 text-xl font-semibold text-slate-900">
              Importing Your Data
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Please wait while we import your data...
            </p>

            {/* Progress bar */}
            <div className="mt-8 max-w-md mx-auto">
              <div className="flex justify-between text-sm text-slate-600 mb-2">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {importJob && (
              <div className="mt-6 text-sm text-slate-600">
                Status: {importJob.status}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-4 flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Import Failed</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Summary */}
      {step === "summary" && importJob && (
        <ImportSummary job={importJob} onReset={handleReset} />
      )}
    </div>
  )
}
