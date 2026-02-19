"use client"

import { useState, useRef, useEffect, KeyboardEvent } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Pencil, Check, X } from "lucide-react"

interface InlineEditableProps {
 value: string
 onSave: (newValue: string) => Promise<void>
 placeholder?: string
 className?: string
 inputClassName?: string
 multiline?: boolean
 maxLength?: number
 disabled?: boolean
 showEditIcon?: boolean
}

export function InlineEditable({
 value,
 onSave,
 placeholder = "Click to edit...",
 className,
 inputClassName,
 multiline = false,
 maxLength,
 disabled = false,
 showEditIcon = false,
}: InlineEditableProps) {
 const [isEditing, setIsEditing] = useState(false)
 const [editValue, setEditValue] = useState(value)
 const [isSaving, setIsSaving] = useState(false)
 const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

 useEffect(() => {
 setEditValue(value)
 }, [value])

 useEffect(() => {
 if (isEditing && inputRef.current) {
 inputRef.current.focus()
 inputRef.current.select()
 }
 }, [isEditing])

 const handleSave = async () => {
 if (editValue.trim() === value || isSaving) {
 setIsEditing(false)
 setEditValue(value)
 return
 }

 if (!editValue.trim()) {
 setEditValue(value)
 setIsEditing(false)
 return
 }

 setIsSaving(true)
 try {
 await onSave(editValue.trim())
 setIsEditing(false)
 } catch (error) {
 setEditValue(value)
 } finally {
 setIsSaving(false)
 }
 }

 const handleCancel = () => {
 setEditValue(value)
 setIsEditing(false)
 }

 const handleKeyDown = (e: KeyboardEvent) => {
 if (e.key === "Enter" && !multiline) {
 e.preventDefault()
 handleSave()
 } else if (e.key === "Enter" && e.metaKey && multiline) {
 e.preventDefault()
 handleSave()
 } else if (e.key === "Escape") {
 handleCancel()
 }
 }

 if (isEditing) {
 const InputComponent = multiline ? Textarea : Input

 return (
 <div className={cn("flex items-start gap-1", className)}>
 <InputComponent
 ref={inputRef as React.RefObject<HTMLInputElement & HTMLTextAreaElement>}
 value={editValue}
 onChange={(e) => setEditValue(e.target.value)}
 onKeyDown={handleKeyDown}
 onBlur={handleSave}
 maxLength={maxLength}
 disabled={isSaving}
 className={cn(
 "flex-1 min-w-0",
 multiline ? "min-h-[80px]" : "h-auto py-1",
 inputClassName
 )}
 placeholder={placeholder}
 />
 <div className="flex items-center gap-0.5 shrink-0">
 <button
 onClick={handleSave}
 disabled={isSaving}
 className="p-1 text-green-600 hover:bg-green-50  rounded transition-colors"
 >
 <Check className="h-4 w-4" />
 </button>
 <button
 onClick={handleCancel}
 disabled={isSaving}
 className="p-1 text-slate-400 hover:bg-slate-100  rounded transition-colors"
 >
 <X className="h-4 w-4" />
 </button>
 </div>
 </div>
 )
 }

 return (
 <button
 onClick={() => !disabled && setIsEditing(true)}
 disabled={disabled}
 className={cn(
 "group text-left w-full",
 !disabled && "hover:bg-slate-50  cursor-text",
 disabled && "cursor-default",
 className
 )}
 >
 <span className={cn(!value && "text-slate-400  italic")}>
 {value || placeholder}
 </span>
 {showEditIcon && !disabled && (
 <Pencil className="inline ml-2 h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
 )}
 </button>
 )
}

// Inline editable title with larger text
export function InlineEditableTitle({
 value,
 onSave,
 className,
 disabled = false,
}: {
 value: string
 onSave: (newValue: string) => Promise<void>
 className?: string
 disabled?: boolean
}) {
 return (
 <InlineEditable
 value={value}
 onSave={onSave}
 disabled={disabled}
 className={cn(
 "font-semibold text-lg text-slate-900  px-1 -mx-1 rounded",
 className
 )}
 inputClassName="font-semibold text-lg"
 placeholder="Untitled"
 />
 )
}

// Inline editable description
export function InlineEditableDescription({
 value,
 onSave,
 className,
 disabled = false,
}: {
 value: string
 onSave: (newValue: string) => Promise<void>
 className?: string
 disabled?: boolean
}) {
 return (
 <InlineEditable
 value={value}
 onSave={onSave}
 disabled={disabled}
 multiline
 className={cn(
 "text-sm text-slate-600  px-1 -mx-1 rounded",
 className
 )}
 inputClassName="text-sm"
 placeholder="Add a description..."
 />
 )
}
