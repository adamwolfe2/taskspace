"use client"

import { useState, useCallback, useRef } from "react"
import { Upload, X, File, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface FileAttachment {
  id: string
  name: string
  url: string
  type: string
  size: number
  uploadedAt: string
}

interface FileTrayProps {
  attachments: FileAttachment[]
  onAttachmentsChange: (attachments: FileAttachment[]) => void
  maxFiles?: number
  maxSizeMB?: number
  acceptedTypes?: string[]
  disabled?: boolean
  className?: string
}

const DEFAULT_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
]

const FILE_TYPE_ICONS: Record<string, "image" | "file"> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toUpperCase() || "FILE"
}

export function FileTray({
  attachments,
  onAttachmentsChange,
  maxFiles = 5,
  maxSizeMB = 10,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  disabled = false,
  className,
}: FileTrayProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `File type "${file.type || "unknown"}" is not supported`
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File size exceeds ${maxSizeMB}MB limit`
    }
    return null
  }

  const uploadFile = async (file: File): Promise<FileAttachment | null> => {
    const formData = new FormData()
    formData.append("file", file)

    const response = await fetch("/api/upload", {
      method: "POST",
      headers: { "X-Requested-With": "XMLHttpRequest" },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Upload failed")
    }

    const data = await response.json()
    return data.data
  }

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    if (disabled) return

    setUploadError(null)
    const fileArray = Array.from(files)

    // Check max files limit
    if (attachments.length + fileArray.length > maxFiles) {
      setUploadError(`Maximum ${maxFiles} files allowed`)
      return
    }

    // Validate all files first
    for (const file of fileArray) {
      const error = validateFile(file)
      if (error) {
        setUploadError(error)
        return
      }
    }

    setIsUploading(true)

    try {
      const uploadedFiles: FileAttachment[] = []

      for (const file of fileArray) {
        const uploaded = await uploadFile(file)
        if (uploaded) {
          uploadedFiles.push(uploaded)
        }
      }

      onAttachmentsChange([...attachments, ...uploadedFiles])
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload files")
    } finally {
      setIsUploading(false)
    }
  }, [attachments, disabled, maxFiles, onAttachmentsChange, acceptedTypes, maxSizeMB])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled) return

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFiles(files)
    }
  }, [disabled, handleFiles])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFiles(files)
    }
    // Reset input so same file can be selected again
    e.target.value = ""
  }

  const handleRemove = (id: string) => {
    onAttachmentsChange(attachments.filter((a) => a.id !== id))
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  const isImage = (type: string) => FILE_TYPE_ICONS[type] === "image"

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer",
          "flex flex-col items-center justify-center gap-2 text-center",
          isDragging
            ? "border-red-400 bg-red-50"
            : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100/50",
          disabled && "opacity-50 cursor-not-allowed",
          isUploading && "pointer-events-none"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(",")}
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled || isUploading}
        />

        {isUploading ? (
          <>
            <Loader2 className="h-8 w-8 text-slate-400 animate-spin" role="status" aria-label="Uploading" />
            <p className="text-sm text-slate-500">Uploading...</p>
          </>
        ) : (
          <>
            <div className="p-3 rounded-full bg-slate-100">
              <Upload className="h-6 w-6 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">
                {isDragging ? "Drop files here" : "Drag and drop files here"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                or click to browse
              </p>
            </div>
            <p className="text-xs text-slate-400">
              Images, PDFs, documents up to {maxSizeMB}MB ({attachments.length}/{maxFiles})
            </p>
          </>
        )}
      </div>

      {/* Error Message */}
      {uploadError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{uploadError}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
            onClick={() => setUploadError(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Attached Files List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Attachments ({attachments.length})
          </p>
          <div className="grid gap-2">
            {attachments.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg group hover:border-slate-300 transition-colors"
              >
                {/* Thumbnail or Icon */}
                {isImage(file.type) ? (
                  <div className="h-10 w-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                    <img
                      src={file.url}
                      alt={file.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <File className="h-5 w-5 text-slate-400" />
                  </div>
                )}

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {getFileExtension(file.name)} · {formatFileSize(file.size)}
                  </p>
                </div>

                {/* Remove Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemove(file.id)}
                  disabled={disabled}
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
