/**
 * Sentry Client-Side Configuration
 *
 * This file configures Sentry for the browser environment.
 * It's automatically loaded by @sentry/nextjs.
 */

import * as Sentry from "@sentry/nextjs"

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",

    // Performance monitoring sample rate
    // Adjust based on traffic - lower for high-traffic apps
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Session replay configuration (optional)
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Only report errors in production
    enabled: process.env.NODE_ENV === "production",

    // Ignore common non-actionable errors
    ignoreErrors: [
      // Random browser extensions
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      // Network errors that aren't actionable
      "Failed to fetch",
      "NetworkError when attempting to fetch resource",
      "Load failed",
      // Browser-specific quirks
      "Non-Error exception captured",
    ],

    // Don't send events during development
    beforeSend(event) {
      if (process.env.NODE_ENV === "development") {
        return null
      }

      // Scrub sensitive data from the event
      if (event.request?.data) {
        const data =
          typeof event.request.data === "string"
            ? JSON.parse(event.request.data)
            : event.request.data

        if (data.password) delete data.password
        if (data.token) delete data.token
        if (data.apiKey) delete data.apiKey

        event.request.data = JSON.stringify(data)
      }

      return event
    },
  })
}
