import type { OrgChartEmployee, OrgChartEmployeeNode, ParsedRock, AvatarColor, AVATAR_COLORS } from "./types"

/**
 * Get initials from a full name
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/**
 * Get avatar color based on first letter of name
 */
export function getAvatarColor(name: string): AvatarColor {
  const firstChar = name.trim().charAt(0).toUpperCase()
  const colors: Record<string, AvatarColor> = {
    A: { bg: "bg-red-100", text: "text-red-700" },
    B: { bg: "bg-orange-100", text: "text-orange-700" },
    C: { bg: "bg-amber-100", text: "text-amber-700" },
    D: { bg: "bg-yellow-100", text: "text-yellow-700" },
    E: { bg: "bg-lime-100", text: "text-lime-700" },
    F: { bg: "bg-green-100", text: "text-green-700" },
    G: { bg: "bg-emerald-100", text: "text-emerald-700" },
    H: { bg: "bg-teal-100", text: "text-teal-700" },
    I: { bg: "bg-cyan-100", text: "text-cyan-700" },
    J: { bg: "bg-sky-100", text: "text-sky-700" },
    K: { bg: "bg-blue-100", text: "text-blue-700" },
    L: { bg: "bg-indigo-100", text: "text-indigo-700" },
    M: { bg: "bg-violet-100", text: "text-violet-700" },
    N: { bg: "bg-purple-100", text: "text-purple-700" },
    O: { bg: "bg-fuchsia-100", text: "text-fuchsia-700" },
    P: { bg: "bg-pink-100", text: "text-pink-700" },
    Q: { bg: "bg-rose-100", text: "text-rose-700" },
    R: { bg: "bg-red-100", text: "text-red-700" },
    S: { bg: "bg-orange-100", text: "text-orange-700" },
    T: { bg: "bg-amber-100", text: "text-amber-700" },
    U: { bg: "bg-yellow-100", text: "text-yellow-700" },
    V: { bg: "bg-lime-100", text: "text-lime-700" },
    W: { bg: "bg-green-100", text: "text-green-700" },
    X: { bg: "bg-emerald-100", text: "text-emerald-700" },
    Y: { bg: "bg-teal-100", text: "text-teal-700" },
    Z: { bg: "bg-cyan-100", text: "text-cyan-700" },
  }
  return colors[firstChar] || { bg: "bg-slate-100", text: "text-slate-700" }
}

/**
 * Normalize a name for comparison (lowercase, trim, handle common variations)
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,]/g, "")
}

/**
 * Check if two names match (fuzzy matching)
 * Handles nicknames like "Jess" -> "Jessica", "Mike" -> "Michael"
 */
export function namesMatch(name1: string, name2: string): boolean {
  const n1 = normalizeName(name1)
  const n2 = normalizeName(name2)

  // Exact match
  if (n1 === n2) return true

  // Check if one contains the other
  if (n1.includes(n2) || n2.includes(n1)) return true

  // Check first/last name combinations
  const parts1 = n1.split(" ")
  const parts2 = n2.split(" ")

  // Match first name + last name in any order
  if (parts1.length >= 2 && parts2.length >= 2) {
    const firstLast1 = `${parts1[0]} ${parts1[parts1.length - 1]}`
    const firstLast2 = `${parts2[0]} ${parts2[parts2.length - 1]}`
    if (firstLast1 === firstLast2) return true

    // Check if last names match AND first name is prefix/nickname
    const lastName1 = parts1[parts1.length - 1]
    const lastName2 = parts2[parts2.length - 1]
    const firstName1 = parts1[0]
    const firstName2 = parts2[0]

    if (lastName1 === lastName2) {
      // Check if one first name starts with the other (handles Jess/Jessica, Mike/Michael, etc.)
      if (firstName1.startsWith(firstName2) || firstName2.startsWith(firstName1)) {
        return true
      }
    }
  }

  return false
}

/**
 * Parse rocks string into structured format
 * Format: "Rock 1: Title\n* task1\n* task2\nRock 2: Title..."
 */
export function parseRocks(rocksString: string | undefined): ParsedRock[] {
  if (!rocksString) return []

  const rocks: ParsedRock[] = []
  const lines = rocksString.split("\n").map(l => l.trim()).filter(Boolean)

  let currentRock: ParsedRock | null = null
  let rockIndex = 0

  for (const line of lines) {
    // Check if this is a rock title (e.g., "Rock 1: Title" or just a title without bullets)
    const rockMatch = line.match(/^Rock\s*\d*:?\s*(.+)$/i)
    if (rockMatch) {
      if (currentRock) {
        rocks.push(currentRock)
      }
      currentRock = {
        index: rockIndex++,
        title: rockMatch[1].trim(),
        bullets: []
      }
    } else if (line.startsWith("*") || line.startsWith("-") || line.startsWith("•")) {
      // This is a bullet point
      if (currentRock) {
        currentRock.bullets.push(line.replace(/^[\*\-•]\s*/, "").trim())
      }
    } else if (!currentRock && line) {
      // First non-empty line might be a rock title without "Rock X:" prefix
      currentRock = {
        index: rockIndex++,
        title: line,
        bullets: []
      }
    }
  }

  if (currentRock) {
    rocks.push(currentRock)
  }

  return rocks
}

/**
 * Format rocks back to string format
 */
export function formatRocks(rocks: ParsedRock[]): string {
  return rocks.map((rock, idx) => {
    const bullets = rock.bullets.map(b => `* ${b}`).join("\n")
    return `Rock ${idx + 1}: ${rock.title}${bullets ? "\n" + bullets : ""}`
  }).join("\n\n")
}

/**
 * Build org tree from flat employee list
 */
export function buildOrgTree(employees: OrgChartEmployee[]): OrgChartEmployeeNode | null {
  if (employees.length === 0) return null

  // Create a map of employees by name for quick lookup
  const employeeMap = new Map<string, OrgChartEmployeeNode>()

  // Initialize all employees as nodes
  employees.forEach(emp => {
    const node: OrgChartEmployeeNode = {
      ...emp,
      directReports: [],
      level: 0
    }
    employeeMap.set(normalizeName(emp.fullName), node)
  })

  // Find the CEO (employee with no supervisor or supervisor not in list)
  let ceo: OrgChartEmployeeNode | null = null

  // Build the tree by linking supervisors to reports
  employees.forEach(emp => {
    const node = employeeMap.get(normalizeName(emp.fullName))
    if (!node) return

    if (!emp.supervisor) {
      // No supervisor = CEO/top level
      if (!ceo) ceo = node
    } else {
      // Find supervisor in map (try exact match first, then fuzzy)
      let supervisor = employeeMap.get(normalizeName(emp.supervisor))

      if (!supervisor) {
        // Try fuzzy matching
        for (const [key, value] of employeeMap.entries()) {
          if (namesMatch(key, emp.supervisor)) {
            supervisor = value
            break
          }
        }
      }

      if (supervisor) {
        supervisor.directReports.push(node)
      } else {
        // Supervisor not found - this might be the CEO or supervisor is external
        if (!ceo) ceo = node
      }
    }
  })

  // If no CEO found by supervisor logic, use first employee or look for common CEO titles
  if (!ceo) {
    const ceoTitles = ["ceo", "chief executive", "president", "founder", "owner"]
    for (const [, node] of employeeMap) {
      if (ceoTitles.some(title => node.jobTitle.toLowerCase().includes(title))) {
        ceo = node
        break
      }
    }
    if (!ceo && employeeMap.size > 0) {
      ceo = employeeMap.values().next().value ?? null
    }
  }

  // Set levels recursively
  function setLevels(node: OrgChartEmployeeNode, level: number) {
    node.level = level
    node.directReports.forEach(report => setLevels(report, level + 1))
  }

  if (ceo) {
    setLevels(ceo, 0)
  }

  return ceo
}

/**
 * Calculate rock completion percentage for an employee
 */
export function calculateRockProgress(
  rocks: ParsedRock[],
  progress: Map<string, boolean>
): number {
  if (rocks.length === 0) return 0

  let totalBullets = 0
  let completedBullets = 0

  rocks.forEach((rock, rockIdx) => {
    rock.bullets.forEach((_, bulletIdx) => {
      totalBullets++
      const key = `${rockIdx}-${bulletIdx}`
      if (progress.get(key)) {
        completedBullets++
      }
    })
  })

  if (totalBullets === 0) return 0
  return Math.round((completedBullets / totalBullets) * 100)
}

/**
 * Common synonyms and related terms for semantic search
 */
const SYNONYMS: Record<string, string[]> = {
  "hr": ["human resources", "people", "personnel", "hiring", "recruiting", "recruitment"],
  "human resources": ["hr", "people", "personnel", "hiring", "recruiting"],
  "it": ["information technology", "tech", "technology", "systems", "computers", "software"],
  "tech": ["technology", "it", "information technology", "technical"],
  "ceo": ["chief executive", "executive director", "president", "founder"],
  "cfo": ["chief financial", "finance director", "financial"],
  "coo": ["chief operating", "operations director"],
  "cto": ["chief technology", "technology director", "tech lead"],
  "finance": ["accounting", "financial", "budget", "money", "payroll"],
  "accounting": ["finance", "financial", "accounts", "bookkeeping"],
  "sales": ["revenue", "business development", "selling", "customers"],
  "marketing": ["advertising", "promotion", "branding", "communications"],
  "operations": ["ops", "operational", "processes", "logistics"],
  "ops": ["operations", "operational"],
  "admin": ["administration", "administrative", "office"],
  "dev": ["development", "developer", "engineering", "programmer"],
  "engineering": ["development", "dev", "technical", "software"],
  "manager": ["supervisor", "lead", "director", "head"],
  "boss": ["manager", "supervisor", "lead", "reports to"],
  "help": ["assist", "support", "contact"],
}

/**
 * Expand query with synonyms
 */
function expandWithSynonyms(keywords: string[]): string[] {
  const expanded = new Set(keywords)
  keywords.forEach(keyword => {
    const synonymList = SYNONYMS[keyword]
    if (synonymList) {
      synonymList.forEach(syn => expanded.add(syn))
    }
    // Also check if any synonym key contains this keyword
    Object.entries(SYNONYMS).forEach(([key, values]) => {
      if (key.includes(keyword) || values.some(v => v.includes(keyword))) {
        expanded.add(key)
        values.forEach(v => expanded.add(v))
      }
    })
  })
  return Array.from(expanded)
}

/**
 * Find employees matching a search query (for RAG/chat)
 * Uses keyword scoring with synonym expansion for better semantic search
 */
export function findRelevantEmployees(
  employees: OrgChartEmployee[],
  query: string
): OrgChartEmployee[] {
  const queryLower = query.toLowerCase()
  const baseKeywords = queryLower.split(/\s+/).filter(k => k.length > 2)
  const keywords = expandWithSynonyms(baseKeywords)

  // Check if query is asking about reporting relationships
  const reportsToMatch = queryLower.match(/(?:reports?\s+to|under|managed\s+by|supervisor\s+(?:of|is))\s+([a-z]+(?:\s+[a-z]+)?)/i)
  const managesMatch = queryLower.match(/(?:who\s+(?:does|do)|(?:direct\s+)?reports?\s+(?:of|to))\s+([a-z]+(?:\s+[a-z]+)?)\s+(?:manage|supervise|lead)/i)

  return employees
    .map(emp => {
      let score = 0
      const searchFields = [
        emp.fullName,
        emp.department,
        emp.jobTitle,
        emp.notes || "",
        emp.extraInfo || "",
        emp.rocks || ""
      ].join(" ").toLowerCase()

      // Score based on keyword matches (including synonyms)
      keywords.forEach(keyword => {
        if (searchFields.includes(keyword)) {
          score += 1
        }
        // Exact word match gets higher score
        if (new RegExp(`\\b${keyword}\\b`).test(searchFields)) {
          score += 2
        }
      })

      // Name matches get highest priority
      if (emp.fullName.toLowerCase().includes(queryLower)) {
        score += 10
      }

      // Check individual name parts
      baseKeywords.forEach(keyword => {
        if (emp.fullName.toLowerCase().includes(keyword)) {
          score += 5
        }
      })

      // Department matches
      if (emp.department.toLowerCase().includes(queryLower)) {
        score += 5
      }
      baseKeywords.forEach(keyword => {
        if (emp.department.toLowerCase().includes(keyword)) {
          score += 3
        }
      })

      // Job title matches
      if (emp.jobTitle.toLowerCase().includes(queryLower)) {
        score += 5
      }
      baseKeywords.forEach(keyword => {
        if (emp.jobTitle.toLowerCase().includes(keyword)) {
          score += 3
        }
      })

      // Supervisor relationship queries
      if (reportsToMatch) {
        const supervisorName = reportsToMatch[1]
        if (emp.supervisor && emp.supervisor.toLowerCase().includes(supervisorName)) {
          score += 15 // High score for matching supervisor relationship
        }
      }

      // Responsibilities/notes match for "who handles X" queries
      if (queryLower.includes("who") && (queryLower.includes("handle") || queryLower.includes("responsible") || queryLower.includes("contact"))) {
        if (emp.notes && baseKeywords.some(k => emp.notes!.toLowerCase().includes(k))) {
          score += 8
        }
        if (emp.extraInfo && baseKeywords.some(k => emp.extraInfo!.toLowerCase().includes(k))) {
          score += 8
        }
      }

      return { employee: emp, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8) // Return more results for better context
    .map(({ employee }) => employee)
}
