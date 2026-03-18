"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bell, X } from "lucide-react"

export function PushNotificationPrompt() {
  const [show, setShow] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    // Check if push is supported and not already subscribed
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return
    if (Notification.permission === "granted") {
      setIsSubscribed(true)
      return
    }
    if (Notification.permission === "denied") return

    // Show prompt after 5 seconds if not dismissed
    const dismissed = localStorage.getItem("push-prompt-dismissed")
    if (dismissed) return

    const timer = setTimeout(() => setShow(true), 5000)
    return () => clearTimeout(timer)
  }, [])

  const handleEnable = async () => {
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setShow(false)
        return
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register("/sw.js")
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        setShow(false)
        return
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      })

      const sub = subscription.toJSON()
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: sub.keys?.p256dh,
          auth: sub.keys?.auth,
        }),
      })

      setIsSubscribed(true)
      setShow(false)
    } catch {
      setShow(false)
    }
  }

  const handleDismiss = () => {
    setShow(false)
    localStorage.setItem("push-prompt-dismissed", "true")
  }

  if (!show || isSubscribed) return null

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-80 shadow-lg">
      <CardContent className="py-3 px-4">
        <div className="flex items-start gap-3">
          <Bell className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Enable push notifications?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Get reminders to submit your EOD report</p>
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={handleEnable}>Enable</Button>
              <Button size="sm" variant="ghost" onClick={handleDismiss}>Not now</Button>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleDismiss} aria-label="Dismiss notification prompt">
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
