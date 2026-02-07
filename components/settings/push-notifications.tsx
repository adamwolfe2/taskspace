"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Bell, BellOff, Loader2, Smartphone, AlertTriangle, CheckCircle2 } from "lucide-react"

interface PushNotificationsCardProps {
  userId: string
}

export function PushNotificationsCard({ userId }: PushNotificationsCardProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isToggling, setIsToggling] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const { toast } = useToast()

  useEffect(() => {
    checkSupport()
  }, [])

  const checkSupport = async () => {
    // Check if browser supports push notifications
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setIsSupported(false)
      setIsLoading(false)
      return
    }

    setIsSupported(true)
    setPermission(Notification.permission)

    try {
      // Check if VAPID keys are configured
      const response = await fetch("/api/push-subscriptions")
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setIsConfigured(data.data.isConfigured)
          setIsSubscribed(data.data.subscriptions.length > 0)
        }
      }
    } catch (error) {
      // Error checking push subscription status
    } finally {
      setIsLoading(false)
    }
  }

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js")
      await navigator.serviceWorker.ready
      return registration
    } catch (error) {
      throw error
    }
  }

  const subscribe = async () => {
    setIsToggling(true)
    try {
      // Request permission
      const permission = await Notification.requestPermission()
      setPermission(permission)

      if (permission !== "granted") {
        toast({
          title: "Permission denied",
          description: "Please allow notifications in your browser settings",
          variant: "destructive",
        })
        return
      }

      // Get VAPID public key
      const keyResponse = await fetch("/api/push-subscriptions")
      if (!keyResponse.ok) throw new Error("Failed to get VAPID key")
      const keyData = await keyResponse.json()

      if (!keyData.data?.vapidPublicKey) {
        toast({
          title: "Not configured",
          description: "Push notifications are not configured on the server",
          variant: "destructive",
        })
        return
      }

      // Register service worker
      const registration = await registerServiceWorker()

      // Convert VAPID key to Uint8Array
      const vapidKey = urlBase64ToUint8Array(keyData.data.vapidPublicKey)

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      })

      // Send subscription to server
      const response = await fetch("/api/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(subscription.getKey("p256dh")),
              auth: arrayBufferToBase64(subscription.getKey("auth")),
            },
          },
        }),
      })

      if (!response.ok) throw new Error("Failed to save subscription")

      setIsSubscribed(true)
      toast({
        title: "Notifications enabled",
        description: "You will now receive push notifications",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to enable push notifications",
        variant: "destructive",
      })
    } finally {
      setIsToggling(false)
    }
  }

  const unsubscribe = async () => {
    setIsToggling(true)
    try {
      // Unsubscribe from browser
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()

        // Remove from server
        await fetch(`/api/push-subscriptions?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
          method: "DELETE",
        })
      }

      setIsSubscribed(false)
      toast({
        title: "Notifications disabled",
        description: "You will no longer receive push notifications on this device",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disable push notifications",
        variant: "destructive",
      })
    } finally {
      setIsToggling(false)
    }
  }

  // Helper to convert VAPID key to Uint8Array
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  // Helper to convert ArrayBuffer to base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer | null) => {
    if (!buffer) return ""
    const bytes = new Uint8Array(buffer)
    let binary = ""
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking support...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Real-time browser notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800">Not supported</p>
              <p className="text-sm text-amber-700">
                Your browser doesn't support push notifications. Try using Chrome, Firefox, or Edge.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Push Notifications
            </CardTitle>
            <CardDescription>
              Get real-time notifications even when the app is closed
            </CardDescription>
          </div>
          {isSubscribed && (
            <Badge className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Enabled
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConfigured && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Server not configured</p>
              <p className="text-sm text-amber-700 mt-1">
                Push notifications require VAPID keys to be configured on the server.
              </p>
              <p className="text-xs text-amber-600 mt-2">
                Add <code className="bg-amber-100 px-1 rounded">VAPID_PUBLIC_KEY</code> and{" "}
                <code className="bg-amber-100 px-1 rounded">VAPID_PRIVATE_KEY</code> environment variables.
              </p>
            </div>
          </div>
        )}

        {isConfigured && permission === "denied" && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
            <BellOff className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Notifications blocked</p>
              <p className="text-sm text-red-700 mt-1">
                You've blocked notifications for this site. To enable them, click the lock icon in your browser's address bar and allow notifications.
              </p>
            </div>
          </div>
        )}

        {isConfigured && permission !== "denied" && (
          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="font-medium">This device</p>
                <p className="text-sm text-muted-foreground">
                  {isSubscribed
                    ? "Receiving push notifications"
                    : "Not receiving push notifications"}
                </p>
              </div>
            </div>
            <Button
              variant={isSubscribed ? "outline" : "default"}
              onClick={isSubscribed ? unsubscribe : subscribe}
              disabled={isToggling}
            >
              {isToggling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isSubscribed ? (
                <>
                  <BellOff className="h-4 w-4 mr-2" />
                  Disable
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Enable
                </>
              )}
            </Button>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>Push notifications let you know when:</p>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li>A task is assigned to you</li>
            <li>It's time to submit your EOD report</li>
            <li>Someone escalates an issue</li>
            <li>Your rocks are updated</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
