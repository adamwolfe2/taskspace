import { NextResponse } from "next/server"
import { checkAirtableConnection } from "@/lib/org-chart/airtable"

export async function GET() {
  try {
    const airtableConnected = await checkAirtableConnection()
    const openaiConfigured = !!process.env.ANTHROPIC_API_KEY || !!process.env.OPENAI_API_KEY

    return NextResponse.json({
      success: true,
      airtable: airtableConnected,
      openai: openaiConfigured,
      message: airtableConnected
        ? "All systems operational"
        : "Airtable not connected, using fallback data",
    })
  } catch (error) {
    console.error("Status check error:", error)
    return NextResponse.json({
      success: true,
      airtable: false,
      openai: !!process.env.ANTHROPIC_API_KEY || !!process.env.OPENAI_API_KEY,
      message: "Airtable connection failed",
    })
  }
}
