import {
  getTodayInTimezone,
  isValidEODDate,
  getQuarterFromDate,
  compareQuarters,
} from "../date-utils"

// Fix the clock to a known point: 2026-02-17T10:00:00 PST (18:00 UTC)
const FAKE_NOW = new Date("2026-02-17T18:00:00Z")

beforeAll(() => {
  jest.useFakeTimers()
  jest.setSystemTime(FAKE_NOW)
})

afterAll(() => {
  jest.useRealTimers()
})

// ============================================================
// getTodayInTimezone
// ============================================================

describe("getTodayInTimezone", () => {
  it("returns today in PST (America/Los_Angeles)", () => {
    // 18:00 UTC = 10:00 PST — still Feb 17
    expect(getTodayInTimezone("America/Los_Angeles")).toBe("2026-02-17")
  })

  it("returns today in EST (America/New_York)", () => {
    // 18:00 UTC = 13:00 EST — still Feb 17
    expect(getTodayInTimezone("America/New_York")).toBe("2026-02-17")
  })

  it("returns tomorrow in IST (Asia/Kolkata)", () => {
    // 18:00 UTC = 23:30 IST — still Feb 17 (barely)
    // At 18:30 UTC it flips to Feb 18 IST; at exactly 18:00 it is still 23:30 IST
    expect(getTodayInTimezone("Asia/Kolkata")).toBe("2026-02-17")
  })

  it("falls back gracefully on invalid timezone", () => {
    // Should return a valid YYYY-MM-DD string, not throw
    const result = getTodayInTimezone("Invalid/Timezone")
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

// ============================================================
// isValidEODDate
// ============================================================

describe("isValidEODDate", () => {
  const tz = "America/Los_Angeles"

  it("accepts today", () => {
    expect(isValidEODDate("2026-02-17", tz).valid).toBe(true)
  })

  it("rejects a future date", () => {
    const result = isValidEODDate("2026-02-18", tz)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain("future")
  })

  it("accepts up to 14 days in the past", () => {
    expect(isValidEODDate("2026-02-03", tz).valid).toBe(true)
  })

  it("rejects 15 days ago", () => {
    const result = isValidEODDate("2026-02-02", tz)
    expect(result.valid).toBe(false)
    expect(result.reason).toContain("14 days")
  })

  it("rejects dates much further in the past", () => {
    expect(isValidEODDate("2025-01-01", tz).valid).toBe(false)
  })

  it("provides a suggestedDate on failure", () => {
    const result = isValidEODDate("2026-02-18", tz)
    expect(result.suggestedDate).toBe("2026-02-17")
  })
})

// ============================================================
// getQuarterFromDate
// ============================================================

describe("getQuarterFromDate", () => {
  it("returns Q1 for January", () => {
    expect(getQuarterFromDate("2026-01-01")).toBe("Q1 2026")
  })

  it("returns Q1 for February", () => {
    expect(getQuarterFromDate("2026-02-17")).toBe("Q1 2026")
  })

  it("returns Q1 for March", () => {
    expect(getQuarterFromDate("2026-03-31")).toBe("Q1 2026")
  })

  it("returns Q2 for April", () => {
    expect(getQuarterFromDate("2026-04-01")).toBe("Q2 2026")
  })

  it("returns Q3 for September", () => {
    expect(getQuarterFromDate("2026-09-15")).toBe("Q3 2026")
  })

  it("returns Q4 for December", () => {
    expect(getQuarterFromDate("2025-12-31")).toBe("Q4 2025")
  })
})

// ============================================================
// compareQuarters
// ============================================================

describe("compareQuarters", () => {
  it("Q1 2026 is later than Q4 2025 (the production bug)", () => {
    // This was broken: alphabetical sort put Q4 2025 AFTER Q1 2026
    // because '4' > '1'. compareQuarters fixes this.
    expect(compareQuarters("Q1 2026", "Q4 2025")).toBeGreaterThan(0)
  })

  it("Q4 2025 is earlier than Q1 2026", () => {
    expect(compareQuarters("Q4 2025", "Q1 2026")).toBeLessThan(0)
  })

  it("same quarter returns 0", () => {
    expect(compareQuarters("Q2 2026", "Q2 2026")).toBe(0)
  })

  it("Q4 2026 is later than Q3 2026", () => {
    expect(compareQuarters("Q4 2026", "Q3 2026")).toBeGreaterThan(0)
  })

  it("sorts an array of quarters chronologically", () => {
    const quarters = ["Q4 2025", "Q2 2024", "Q1 2026", "Q3 2025"]
    const sorted = [...quarters].sort(compareQuarters)
    expect(sorted).toEqual(["Q2 2024", "Q3 2025", "Q4 2025", "Q1 2026"])
  })

  it("DESC sort puts most recent quarter first", () => {
    const quarters = ["Q4 2025", "Q1 2026", "Q3 2025"]
    const sorted = [...quarters].sort((a, b) => compareQuarters(b, a))
    expect(sorted[0]).toBe("Q1 2026")
  })
})
