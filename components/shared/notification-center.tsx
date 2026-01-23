"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Check, CheckCheck, Trash2, AlertTriangle, UserPlus, Target, FileText, Clock, Loader2 } from "lucide-react"
import {
 Popover,
 PopoverContent,
 PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Notification } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"

export function NotificationCenter() {
 const [notifications, setNotifications] = useState<Notification[]>([])
 const [unreadCount, setUnreadCount] = useState(0)
 const [isLoading, setIsLoading] = useState(false)
 const [isOpen, setIsOpen] = useState(false)

 const fetchNotifications = useCallback(async () => {
 try {
 const response = await fetch("/api/notifications")
 if (response.ok) {
 const data = await response.json()
 if (data.success) {
 setNotifications(data.data || [])
 setUnreadCount(data.data?.filter((n: Notification) => !n.read).length || 0)
 }
 }
 } catch (err) {
 console.error("Failed to fetch notifications:", err)
 }
 }, [])

 const fetchUnreadCount = useCallback(async () => {
 try {
 const response = await fetch("/api/notifications?count=true")
 if (response.ok) {
 const data = await response.json()
 if (data.success) {
 setUnreadCount(data.data?.count || 0)
 }
 }
 } catch (err) {
 console.error("Failed to fetch unread count:", err)
 }
 }, [])

 // Fetch unread count on mount and periodically
 // Uses visibility API to pause polling when tab is not visible
 useEffect(() => {
 fetchUnreadCount()

 let interval: ReturnType<typeof setInterval> | null = null

 const startPolling = () => {
 if (!interval) {
 interval = setInterval(fetchUnreadCount, 300000) // Check every 5 minutes (reduced from 30s to save bandwidth)
 }
 }

 const stopPolling = () => {
 if (interval) {
 clearInterval(interval)
 interval = null
 }
 }

 const handleVisibilityChange = () => {
 if (document.visibilityState === "visible") {
 fetchUnreadCount() // Immediate fetch when tab becomes visible
 startPolling()
 } else {
 stopPolling()
 }
 }

 // Start polling if document is visible
 if (document.visibilityState === "visible") {
 startPolling()
 }

 document.addEventListener("visibilitychange", handleVisibilityChange)

 // Also fetch when window regains focus
 const handleFocus = () => {
 fetchUnreadCount()
 }
 window.addEventListener("focus", handleFocus)

 return () => {
 stopPolling()
 document.removeEventListener("visibilitychange", handleVisibilityChange)
 window.removeEventListener("focus", handleFocus)
 }
 }, [fetchUnreadCount])

 // Fetch full list when popover opens
 useEffect(() => {
 if (isOpen) {
 fetchNotifications()
 }
 }, [isOpen, fetchNotifications])

 const markAsRead = async (id: string) => {
 try {
 const response = await fetch("/api/notifications", {
 method: "PATCH",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ id }),
 })
 if (response.ok) {
 setNotifications(prev =>
 prev.map(n => (n.id === id ? { ...n, read: true } : n))
 )
 setUnreadCount(prev => Math.max(0, prev - 1))
 }
 } catch (err) {
 console.error("Failed to mark notification as read:", err)
 }
 }

 const markAllAsRead = async () => {
 setIsLoading(true)
 try {
 const response = await fetch("/api/notifications", {
 method: "PATCH",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ markAllRead: true }),
 })
 if (response.ok) {
 setNotifications(prev => prev.map(n => ({ ...n, read: true })))
 setUnreadCount(0)
 }
 } catch (err) {
 console.error("Failed to mark all as read:", err)
 } finally {
 setIsLoading(false)
 }
 }

 const deleteNotification = async (id: string) => {
 try {
 const response = await fetch(`/api/notifications?id=${id}`, {
 method: "DELETE",
 })
 if (response.ok) {
 const notification = notifications.find(n => n.id === id)
 setNotifications(prev => prev.filter(n => n.id !== id))
 if (notification && !notification.read) {
 setUnreadCount(prev => Math.max(0, prev - 1))
 }
 }
 } catch (err) {
 console.error("Failed to delete notification:", err)
 }
 }

 const getNotificationIcon = (type: Notification["type"]) => {
 switch (type) {
 case "task_assigned":
 return <Target className="h-4 w-4 text-blue-500" />
 case "rock_updated":
 return <Target className="h-4 w-4 text-green-500" />
 case "eod_reminder":
 return <Clock className="h-4 w-4 text-amber-500" />
 case "escalation":
 return <AlertTriangle className="h-4 w-4 text-red-500" />
 case "invitation":
 return <UserPlus className="h-4 w-4 text-purple-500" />
 case "system":
 default:
 return <FileText className="h-4 w-4 text-gray-500" />
 }
 }

 const formatTime = (dateString: string) => {
 try {
 return formatDistanceToNow(new Date(dateString), { addSuffix: true })
 } catch {
 return "recently"
 }
 }

 return (
 <Popover open={isOpen} onOpenChange={setIsOpen}>
 <PopoverTrigger asChild>
 <Button variant="ghost" size="icon" className="relative" aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}>
 <Bell className="h-5 w-5" aria-hidden="true" />
 {unreadCount > 0 && (
 <Badge
 className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 hover:bg-red-500"
 aria-hidden="true"
 >
 {unreadCount > 9 ? "9+" : unreadCount}
 </Badge>
 )}
 </Button>
 </PopoverTrigger>
 <PopoverContent align="end" className="w-80 p-0">
 <div className="flex items-center justify-between px-4 py-3 border-b">
 <h3 className="font-semibold">Notifications</h3>
 {unreadCount > 0 && (
 <Button
 variant="ghost"
 size="sm"
 onClick={markAllAsRead}
 disabled={isLoading}
 className="text-xs h-7"
 >
 {isLoading ? (
 <Loader2 className="h-3 w-3 animate-spin" role="status" aria-label="Marking all as read" />
 ) : (
 <>
 <CheckCheck className="h-3 w-3 mr-1" aria-hidden="true" />
 Mark all read
 </>
 )}
 </Button>
 )}
 </div>
 <ScrollArea className="h-[400px]">
 {notifications.length === 0 ? (
 <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
 <Bell className="h-8 w-8 mb-2 opacity-30" />
 <p className="text-sm">No notifications</p>
 </div>
 ) : (
 <div className="divide-y">
 {notifications.map((notification) => (
 <div
 key={notification.id}
 className={`p-3 hover:bg-muted/50 transition-colors ${
 !notification.read ? "bg-blue-50 " : ""
 }`}
 >
 <div className="flex gap-3">
 <div className="flex-shrink-0 mt-0.5">
 {getNotificationIcon(notification.type)}
 </div>
 <div className="flex-1 min-w-0">
 <p className={`text-sm ${!notification.read ? "font-medium" : ""}`}>
 {notification.title}
 </p>
 {notification.message && (
 <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
 {notification.message}
 </p>
 )}
 <p className="text-xs text-muted-foreground mt-1">
 {formatTime(notification.createdAt)}
 </p>
 </div>
 <div className="flex flex-col gap-1">
 {!notification.read && (
 <Button
 variant="ghost"
 size="icon"
 className="h-6 w-6"
 onClick={() => markAsRead(notification.id)}
 aria-label="Mark as read"
 >
 <Check className="h-3 w-3" />
 </Button>
 )}
 <Button
 variant="ghost"
 size="icon"
 className="h-6 w-6 text-muted-foreground hover:text-destructive"
 onClick={() => deleteNotification(notification.id)}
 aria-label="Delete notification"
 >
 <Trash2 className="h-3 w-3" />
 </Button>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </ScrollArea>
 </PopoverContent>
 </Popover>
 )
}
