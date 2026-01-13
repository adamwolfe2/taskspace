/**
 * Sentry Server-Side Configuration
 *
 * This file configures Sentry for the Node.js environment.
 * It's automatically loaded by @sentry/nextjs.
 */

import * as Sentry from "@sentry/nextjs"

const SENTRY_DSN = process.env.SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",

    // Performance monitoring sample rate
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Enable profiling for Node.js
    profilesSampleRate: 0.1,

    // Scrub sensitive data before sending
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers["authorization"]
        delete event.request.headers["cookie"]
        delete event.request.headers["x-api-key"]
        delete event.request.headers["x-migration-key"]
      }

      // Remove sensitive data from request body
      if (event.request?.data) {
        try {
          const data =
            typeof event.request.data === "string"
              ? JSON.parse(event.request.data)
              : event.request.data

          // Remove sensitive fields
          const sensitiveFields = [
            "password",
            "passwordHash",
            "token",
            "apiKey",
            "secret",
            "accessToken",
            "refreshToken",
          ]

          sensitiveFields.forEach((field) => {
            if (data[field]) {
              data[field] = "[REDACTED]"
            }
          })

          event.request.data = JSON.stringify(data)
        } catch {
          // If parsing fails, clear the data
          event.request.data = "[REDACTED]"
        }
      }

      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((bc) => {
          if (bc.data) {
            delete bc.data.password
            delete bc.data.token
            delete bc.data.apiKey
            delete bc.data.secret
          }
          return bc
        })
      }

      // Remove sensitive contexts
      if (event.contexts?.request) {
        delete event.contexts.request.cookies
      }

      return event
    },

    // Ignore certain errors
    ignoreErrors: [
      // Database connection issues during shutdown
      "connection terminated unexpectedly",
      "Cannot acquire a client from a pool",
    ],
  })
}
