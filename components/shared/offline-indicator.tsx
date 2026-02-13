"use client"

import { useEffect, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

/**
 * Offline Indicator Component
 *
 * Displays a banner when the user loses internet connectivity
 * and automatically hides when connection is restored.
 */
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      if (wasOffline) {
        setShowReconnected(true)
        setWasOffline(false)
        // Hide "reconnected" message after 3 seconds
        setTimeout(() => setShowReconnected(false), 3000)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
      setShowReconnected(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [wasOffline])

  // Show reconnected message
  if (showReconnected) {
    return (
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
        <Alert className="bg-green-50 border-green-200 shadow-lg">
          <Wifi className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 font-medium">
            Connection restored
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Show offline message
  if (!isOnline) {
    return (
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300 max-w-md">
        <Alert className="bg-amber-50 border-amber-200 shadow-lg">
          <WifiOff className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong className="font-semibold">You're offline.</strong>
            <span className="block text-sm mt-1">
              Some features may not work until your connection is restored.
            </span>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return null
}

/**
 * Hook to detect online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
