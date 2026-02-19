import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { checkAirtableConnection } from "@/lib/org-chart/airtable"
import { withAuth } from "@/lib/api/middleware"
import { logger, logError } from "@/lib/logger"

export const GET = withAuth(async (_request, _auth) => {
  try {
    // Check database for employees (primary source)
    let databaseConnected = false
    let employeeCount = 0
    try {
      employeeCount = await db.maEmployees.count()
      databaseConnected = employeeCount > 0
    } catch {
      databaseConnected = false
    }

    // Check Airtable as fallback
    const airtableConnected = await checkAirtableConnection()
    const aiConfigured = !!process.env.ANTHROPIC_API_KEY || !!process.env.OPENAI_API_KEY

    // Connected if we have database employees OR Airtable
    const isConnected = databaseConnected || airtableConnected

    return NextResponse.json({
      success: true,
      connected: isConnected,
      database: databaseConnected,
      airtable: airtableConnected,
      openai: aiConfigured,
      employeeCount,
      source: databaseConnected ? "database" : airtableConnected ? "airtable" : "fallback",
      message: databaseConnected
        ? `Connected to database (${employeeCount} employees)`
        : airtableConnected
        ? "Connected to Airtable"
        : "Using fallback data",
    })
  } catch (error) {
    logError(logger, "Status check error", error)
    return NextResponse.json({
      success: true,
      connected: false,
      database: false,
      airtable: false,
      openai: !!process.env.ANTHROPIC_API_KEY || !!process.env.OPENAI_API_KEY,
      source: "fallback",
      message: "Connection check failed",
    })
  }
})
