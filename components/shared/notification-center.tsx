"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  AlertTriangle,
  UserPlus,
  Target,
  FileText,
  Clock,
  Loader2,
  CheckCircle2,
  AtSign,
  Video,
  CirclePlus,
} from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Notification } from "@/lib/types"
import { formatDistanceToNow } from "date-fns"
import { CONFIG } from "@/lib/config"

export function NotificationCenter() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

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
    } catch {
      // Error fetching notifications
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
    } catch {
      // Error fetching unread count
    }
  }, [])

  // Fetch unread count on mount and periodically
  // Uses visibility API to pause polling when tab is not visible
  useEffect(() => {
    fetchUnreadCount()

    let interval: ReturnType<typeof setInterval> | null = null

    const startPolling = () => {
      if (!interval) {
        interval = setInterval(fetchUnreadCount, CONFIG.polling.slow)
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
    setProcessingIds(prev => new Set(prev).add(id))
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ id }),
      })
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, read: true } : n))
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch {
      // Error marking notification as read
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const markAllAsRead = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ markAllRead: true }),
      })
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
        // Re-fetch count from server to reconcile any in-flight polling requests
        fetchUnreadCount()
      }
    } catch {
      // Error marking all as read
    } finally {
      setIsLoading(false)
    }
  }

  const deleteNotification = async (id: string) => {
    setProcessingIds(prev => new Set(prev).add(id))
    try {
      const response = await fetch(`/api/notifications?id=${id}`, {
        method: "DELETE",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })
      if (response.ok) {
        const notification = notifications.find(n => n.id === id)
        setNotifications(prev => prev.filter(n => n.id !== id))
        if (notification && !notification.read) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
      }
    } catch {
      // Error deleting notification
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    const link = notification.link || notification.actionUrl
    if (!notification.read) {
      await markAsRead(notification.id)
    }
    if (link) {
      setIsOpen(false)
      router.push(link)
    }
  }

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "task_assigned":
        return <Target className="h-4 w-4 text-blue-500" />
      case "task_completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "rock_updated":
        return <Target className="h-4 w-4 text-green-500" />
      case "eod_reminder":
        return <Clock className="h-4 w-4 text-amber-500" />
      case "escalation":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "invitation":
        return <UserPlus className="h-4 w-4 text-purple-500" />
      case "mention":
        return <AtSign className="h-4 w-4 text-slate-500" />
      case "meeting_starting":
        return <Video className="h-4 w-4 text-teal-500" />
      case "issue_created":
        return <CirclePlus className="h-4 w-4 text-orange-500" />
      case "system":
      default:
        return <FileText className="h-4 w-4 text-slate-500" />
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
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 min-h-[44px] min-w-[44px]"
          aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        >
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
              {notifications.map((notification) => {
                const hasLink = !!(notification.link || notification.actionUrl)
                return (
                  <div
                    key={notification.id}
                    className={`p-3 hover:bg-muted/50 transition-colors ${
                      !notification.read ? "bg-blue-50 " : ""
                    } ${hasLink ? "cursor-pointer" : ""}`}
                    onClick={hasLink ? () => handleNotificationClick(notification) : undefined}
                    role={hasLink ? "link" : undefined}
                    tabIndex={hasLink ? 0 : undefined}
                    onKeyDown={hasLink ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        handleNotificationClick(notification)
                      }
                    } : undefined}
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
                      <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 touch-target"
                            onClick={() => markAsRead(notification.id)}
                            disabled={processingIds.has(notification.id)}
                            aria-label="Mark as read"
                          >
                            {processingIds.has(notification.id) ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 touch-target text-muted-foreground hover:text-destructive"
                          onClick={() => deleteNotification(notification.id)}
                          disabled={processingIds.has(notification.id)}
                          aria-label="Delete notification"
                        >
                          {processingIds.has(notification.id) ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
