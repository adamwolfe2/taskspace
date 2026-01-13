/**
 * Next.js Instrumentation
 * This file runs once when the server starts
 * Used for startup validation and initialization
 */

export async function register() {
  // Only run validation on server startup (not during build)
  if (process.env.NEXT_RUNTIME === "nodejs") {
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
