// Example org chart seed data for demo/testing purposes
// Real organizations populate their own data via the org chart UI or Airtable import

export interface MAEmployeeSeed {
  firstName: string
  lastName: string
  supervisor: string | null  // Full name of supervisor, null = CEO/top level
  department: string
  jobTitle: string
  responsibilities: string
  notes: string
  email: string
}

export const MA_EMPLOYEES_SEED: MAEmployeeSeed[] = [
  // === CEO ===
  {
    firstName: "Example",
    lastName: "CEO",
    supervisor: null,
    department: "Executive",
    jobTitle: "CEO",
    responsibilities: "Overall company strategy, vision, and operations",
    notes: "Replace this seed data with your actual org chart",
    email: "ceo@example.com"
  },

  // === Direct Reports ===
  {
    firstName: "Example",
    lastName: "COO",
    supervisor: "Example CEO",
    department: "Operations",
    jobTitle: "COO",
    responsibilities: "Day-to-day operations, process optimization, team efficiency",
    notes: "",
    email: "coo@example.com"
  },
  {
    firstName: "Example",
    lastName: "CTO",
    supervisor: "Example CEO",
    department: "Engineering",
    jobTitle: "CTO",
    responsibilities: "Technology strategy, engineering team leadership, platform development",
    notes: "",
    email: "cto@example.com"
  },
  {
    firstName: "Example",
    lastName: "CMO",
    supervisor: "Example CEO",
    department: "Marketing",
    jobTitle: "CMO",
    responsibilities: "Marketing strategy, brand management, demand generation",
    notes: "",
    email: "cmo@example.com"
  },

  // === Team Members ===
  {
    firstName: "Example",
    lastName: "Engineer",
    supervisor: "Example CTO",
    department: "Engineering",
    jobTitle: "Software Engineer",
    responsibilities: "Feature development, code reviews, technical documentation",
    notes: "",
    email: "engineer@example.com"
  },
  {
    firstName: "Example",
    lastName: "Marketer",
    supervisor: "Example CMO",
    department: "Marketing",
    jobTitle: "Marketing Manager",
    responsibilities: "Campaign management, content strategy, analytics",
    notes: "",
    email: "marketer@example.com"
  },
  {
    firstName: "Example",
    lastName: "OpsMgr",
    supervisor: "Example COO",
    department: "Operations",
    jobTitle: "Operations Manager",
    responsibilities: "Process management, team coordination, resource planning",
    notes: "",
    email: "ops@example.com"
  },
]

export const TOTAL_EMPLOYEES = MA_EMPLOYEES_SEED.length
