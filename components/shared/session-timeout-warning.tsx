"use client"

import { useEffect, useState, useCallback } from 'react'
import { useApp } from '@/lib/contexts/app-context'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Clock, X } from 'lucide-react'
import { CONFIG } from '@/lib/config'

/**
 * Session Timeout Warning Component
 *
 * Monitors user activity and warns when session is about to expire.
 * Prevents data loss by prompting users to save work before timeout.
 */

const SESSION_DURATION_MS = CONFIG.auth.sessionDurationDays * 24 * 60 * 60 * 1000
const WARNING_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes before expiration
const ACTIVITY_CHECK_INTERVAL_MS = 60 * 1000 // Check every minute

export function SessionTimeoutWarning() {
  const { isAuthenticated } = useApp()
  const [showWarning, setShowWarning] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  const refreshSession = useCallback(async () => {
    try {
      // Refresh session by calling the auth endpoint
      await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
      })

      // Reset warning state
      setShowWarning(false)
      setDismissed(false)
      if (typeof window !== 'undefined') {
        localStorage.setItem('lastActivity', Date.now().toString())
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Session] Failed to refresh session:', error)
      }
    }
  }, [])

  const updateLastActivity = useCallback(() => {
    if (!isAuthenticated || typeof window === 'undefined') return
    localStorage.setItem('lastActivity', Date.now().toString())
  }, [isAuthenticated])

  useEffect(() => {
    // Prevent SSR issues
    setIsMounted(true)

    if (!isAuthenticated || typeof window === 'undefined') {
      setShowWarning(false)
      return
    }

    // Track user activity
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart']
    activityEvents.forEach(event => {
      window.addEventListener(event, updateLastActivity, { passive: true })
    })

    // Initialize last activity timestamp
    const lastActivity = localStorage.getItem('lastActivity')
    if (!lastActivity) {
      localStorage.setItem('lastActivity', Date.now().toString())
    }

    // Check session timeout periodically
    const checkInterval = setInterval(() => {
      const lastActivityStr = localStorage.getItem('lastActivity')
      if (!lastActivityStr) return

      const lastActivityTime = parseInt(lastActivityStr, 10)
      const timeSinceActivity = Date.now() - lastActivityTime
      const remaining = SESSION_DURATION_MS - timeSinceActivity

      // If session expired, let the auth system handle it
      if (remaining <= 0) {
        setShowWarning(false)
        return
      }

      // Show warning if within threshold and not dismissed
      if (remaining <= WARNING_THRESHOLD_MS && !dismissed) {
        setShowWarning(true)
        setTimeRemaining(Math.ceil(remaining / 1000 / 60)) // minutes
      } else {
        setShowWarning(false)
      }
    }, ACTIVITY_CHECK_INTERVAL_MS)

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, updateLastActivity)
      })
      clearInterval(checkInterval)
    }
  }, [isAuthenticated, dismissed, updateLastActivity])

  const handleDismiss = () => {
    setDismissed(true)
    setShowWarning(false)
  }

  const handleExtend = async () => {
    await refreshSession()
  }

  // Don't render during SSR or before mount
  if (!isMounted || !showWarning || !timeRemaining) return null

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 max-w-md animate-in slide-in-from-bottom duration-300">
      <Alert className="bg-amber-50 border-amber-200 shadow-lg pr-12">
        <Clock className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-900 font-semibold">
          Session Expiring Soon
        </AlertTitle>
        <AlertDescription className="text-amber-800">
          <p className="text-sm mb-3">
            Your session will expire in <strong>{timeRemaining} minute{timeRemaining !== 1 ? 's' : ''}</strong>.
            Any unsaved work may be lost.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleExtend}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Extend Session
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDismiss}
              className="border-amber-300 text-amber-900 hover:bg-amber-100"
            >
              Dismiss
            </Button>
          </div>
        </AlertDescription>
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-amber-600 hover:text-amber-800"
          aria-label="Dismiss warning"
        >
          <X className="h-4 w-4" />
        </button>
      </Alert>
    </div>
  )
}
