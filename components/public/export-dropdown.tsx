"use client"

import { useState, useRef, useEffect } from "react"
import { Download, Printer, Copy, Check, Link2, Share2, Mail } from "lucide-react"
import { copyToClipboard, printReport } from "@/lib/utils/report-export"

interface ExportDropdownProps {
  markdownText: string
}

export function ExportDropdown({ markdownText }: ExportDropdownProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick)
      return () => document.removeEventListener("mousedown", handleClick)
    }
  }, [open])

  const handleCopy = async () => {
    const success = await copyToClipboard(markdownText)
    if (success) {
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
        setOpen(false)
      }, 1500)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setLinkCopied(true)
      setTimeout(() => {
        setLinkCopied(false)
        setOpen(false)
      }, 1500)
    } catch {
      // Fallback
      const textarea = document.createElement("textarea")
      textarea.value = window.location.href
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setLinkCopied(true)
      setTimeout(() => { setLinkCopied(false); setOpen(false) }, 1500)
    }
  }

  const handleEmailShare = () => {
    const subject = encodeURIComponent("Team EOD Report")
    const body = encodeURIComponent(`Check out today's team EOD report: ${window.location.href}`)
    window.open(`mailto:?subject=${subject}&body=${body}`)
    setOpen(false)
  }

  const handlePrint = () => {
    setOpen(false)
    printReport()
  }

  return (
    <div className="relative print:hidden" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <Download className="h-4 w-4" />
        Export
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-52 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {linkCopied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Link2 className="h-4 w-4 text-slate-400" />
            )}
            {linkCopied ? "Link Copied!" : "Copy Link"}
          </button>
          <button
            onClick={handleEmailShare}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Mail className="h-4 w-4 text-slate-400" />
            Share via Email
          </button>
          <div className="border-t border-slate-100 my-1" />
          <button
            onClick={handlePrint}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Printer className="h-4 w-4 text-slate-400" />
            Print / Save as PDF
          </button>
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4 text-slate-400" />
            )}
            {copied ? "Copied!" : "Copy as Text"}
          </button>
        </div>
      )}
    </div>
  )
}
