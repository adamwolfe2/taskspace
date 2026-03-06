"use client"

import { useEffect, useState } from "react"
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface ShortcutGroup {
 title: string
 shortcuts: {
 keys: string[]
 description: string
 }[]
}

const shortcutGroups: ShortcutGroup[] = [
 {
 title: "Navigation",
 shortcuts: [
 { keys: ["⌘", "K"], description: "Open command palette" },
 { keys: ["⌘", "⇧", "D"], description: "Go to Dashboard" },
 { keys: ["⌘", "⇧", "T"], description: "Go to Tasks" },
 { keys: ["⌘", "⇧", "G"], description: "Go to Rocks" },
 { keys: ["⌘", "⇧", "H"], description: "Go to History" },
 { keys: ["⌘", "⇧", "S"], description: "Go to Settings" },
 { keys: ["⌘", "⇧", "M"], description: "Go to Calendar" },
 { keys: ["⌘", "⇧", "I"], description: "Go to IDS Board" },
 ],
 },
 {
 title: "Actions",
 shortcuts: [
 { keys: ["⌘", "N"], description: "New task" },
 { keys: ["⌘", "E"], description: "Scroll to EOD section" },
 { keys: ["Esc"], description: "Close modal / Cancel" },
 ],
 },
 {
 title: "General",
 shortcuts: [
 { keys: ["?"], description: "Show keyboard shortcuts" },
 ],
 },
]

interface KeyboardShortcutsDialogProps {
 open?: boolean
 onOpenChange?: (open: boolean) => void
}

export function KeyboardShortcutsDialog({
 open: controlledOpen,
 onOpenChange,
}: KeyboardShortcutsDialogProps) {
 const [internalOpen, setInternalOpen] = useState(false)

 const open = controlledOpen ?? internalOpen
 const setOpen = onOpenChange ?? setInternalOpen

 useEffect(() => {
 const handleKeyDown = (e: KeyboardEvent) => {
 // Open with ? key (shift + /)
 if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
 // Don't trigger if typing in an input
 if (
 document.activeElement?.tagName === "INPUT" ||
 document.activeElement?.tagName === "TEXTAREA" ||
 (document.activeElement as HTMLElement)?.isContentEditable
 ) {
 return
 }
 e.preventDefault()
 setOpen(true)
 }

 // Close with Escape
 if (e.key === "Escape" && open) {
 setOpen(false)
 }
 }

 document.addEventListener("keydown", handleKeyDown)
 return () => document.removeEventListener("keydown", handleKeyDown)
 }, [open, setOpen])

 return (
 <Dialog open={open} onOpenChange={setOpen}>
 <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>Keyboard Shortcuts</DialogTitle>
 <DialogDescription>
 Use these shortcuts to navigate and take actions quickly.
 </DialogDescription>
 </DialogHeader>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
 {shortcutGroups.map((group, groupIndex) => (
 <div key={groupIndex}>
 <h3 className="text-sm font-semibold text-slate-700  mb-3">
 {group.title}
 </h3>
 <div className="space-y-2">
 {group.shortcuts.map((shortcut, shortcutIndex) => (
 <div
 key={shortcutIndex}
 className="flex items-center justify-between py-1.5"
 >
 <span className="text-sm text-slate-600 ">
 {shortcut.description}
 </span>
 <div className="flex items-center gap-1">
 {shortcut.keys.map((key, keyIndex) => (
 <kbd
 key={keyIndex}
 className="px-2 py-1 text-xs font-medium bg-slate-100  text-slate-700  rounded border border-slate-200  min-w-[24px] text-center"
 >
 {key}
 </kbd>
 ))}
 </div>
 </div>
 ))}
 </div>
 {groupIndex < shortcutGroups.length - 1 && (
 <Separator className="my-4 md:hidden" />
 )}
 </div>
 ))}
 </div>
 <Separator className="my-4" />
 <div className="flex items-center justify-between text-sm text-slate-500">
 <span>Press <kbd className="px-1.5 py-0.5 bg-slate-100  rounded text-xs">?</kbd> anytime to show this dialog</span>
 <Badge variant="secondary" className="text-xs">
 {typeof navigator !== "undefined" && navigator.platform?.includes("Mac") ? "⌘ = Command" : "⌘ = Ctrl"}
 </Badge>
 </div>
 </DialogContent>
 </Dialog>
 )
}

// Hook to register global keyboard shortcuts
export function useKeyboardShortcuts(shortcuts: { key: string; handler: () => void; meta?: boolean; shift?: boolean }[]) {
 useEffect(() => {
 const handleKeyDown = (e: KeyboardEvent) => {
 // Don't trigger if typing in an input
 if (
 document.activeElement?.tagName === "INPUT" ||
 document.activeElement?.tagName === "TEXTAREA" ||
 (document.activeElement as HTMLElement)?.isContentEditable
 ) {
 return
 }

 for (const shortcut of shortcuts) {
 const metaMatch = shortcut.meta ? (e.metaKey || e.ctrlKey) : !(e.metaKey || e.ctrlKey)
 const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey
 const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()

 if (metaMatch && shiftMatch && keyMatch) {
 e.preventDefault()
 shortcut.handler()
 return
 }
 }
 }

 document.addEventListener("keydown", handleKeyDown)
 return () => document.removeEventListener("keydown", handleKeyDown)
 }, [shortcuts])
}
