/**
 * Next.js Instrumentation
 * This file runs once when the server starts
 * Used for startup validation, Sentry initialization, and logging setup
 */

export async function register() {
  // Only run validation on server startup (not during build)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Initialize Sentry for Node.js runtime
    if (process.env.SENTRY_DSN) {
      const Sentry = await import("@sentry/nextjs")
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || "development",
        tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
        profilesSampleRate: 0.1,
        // Scrub sensitive data
        beforeSend(event) {
          // Remove sensitive headers
          if (event.request?.headers) {
            delete event.request.headers["authorization"]
            delete event.request.headers["cookie"]
            delete event.request.headers["x-api-key"]
          }
          // Remove sensitive data from breadcrumbs
          if (event.breadcrumbs) {
            event.breadcrumbs = event.breadcrumbs.map((bc) => {
              if (bc.data) {
                delete bc.data.password
                delete bc.data.token
                delete bc.data.apiKey
              }
              return bc
            })
          }
          return event
        },
      })
    }

    const { assertEnv, validateEnv } = await import("./lib/env")

    // Validate environment variables
    try {
      assertEnv()

      // Log feature status in development
      if (process.env.NODE_ENV === "development") {
        const result = validateEnv()
        console.log("\n🚀 AIMS EOD Server Starting...")
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        console.log("Feature Status:")
        result.features.forEach((f) => {
          const status = f.enabled ? "✓" : "○"
          const color = f.enabled ? "\x1b[32m" : "\x1b[90m"
          console.log(`  ${color}${status}\x1b[0m ${f.name}`)
        })
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
      }
    } catch (error) {
      console.error("Failed to start server:", error)
      // In production, we might want to exit, but in development allow startup
      if (process.env.NODE_ENV === "production") {
        process.exit(1)
      }
    }
  }
}
