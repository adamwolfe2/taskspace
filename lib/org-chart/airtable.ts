import type { OrgChartEmployee } from "./types"

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || "MA Org Chart Details"

interface AirtableRecord {
  id: string
  fields: {
    "First Name"?: string
    "Last Name"?: string
    Supervisor?: string
    Department?: string
    "Job Title"?: string
    "Job Description"?: string
    "Extra Info"?: string
    Rocks?: string
    Email?: string
  }
}

interface AirtableResponse {
  records: AirtableRecord[]
  offset?: string
}

/**
 * Fetch all employees from Airtable
 */
export async function fetchEmployeesFromAirtable(): Promise<OrgChartEmployee[]> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    throw new Error("Airtable configuration missing")
  }

  const employees: OrgChartEmployee[] = []
  let offset: string | undefined

  const encodedTableName = encodeURIComponent(AIRTABLE_TABLE_NAME)

  do {
    const url = new URL(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodedTableName}`
    )
    if (offset) {
      url.searchParams.set("offset", offset)
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Airtable API error: ${response.status} - ${error}`)
    }

    const data: AirtableResponse = await response.json()

    data.records.forEach((record) => {
      const fields = record.fields
      const firstName = fields["First Name"] || ""
      const lastName = fields["Last Name"] || ""
      const fullName = `${firstName} ${lastName}`.trim()

      if (fullName) {
        employees.push({
          id: record.id,
          firstName,
          lastName,
          fullName,
          supervisor: fields.Supervisor || null,
          department: fields.Department || "",
          jobTitle: fields["Job Title"] || "",
          notes: fields["Job Description"] || "",
          extraInfo: fields["Extra Info"] || "",
          rocks: fields.Rocks || "",
          email: fields.Email || undefined,
        })
      }
    })

    offset = data.offset
  } while (offset)

  return employees
}

/**
 * Update an employee's rocks in Airtable
 */
export async function updateEmployeeRocks(
  employeeId: string,
  rocks: string
): Promise<void> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    throw new Error("Airtable configuration missing")
  }

  const encodedTableName = encodeURIComponent(AIRTABLE_TABLE_NAME)
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodedTableName}/${employeeId}`

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        Rocks: rocks,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Airtable API error: ${response.status} - ${error}`)
  }
}

/**
 * Check if Airtable connection is working
 */
export async function checkAirtableConnection(): Promise<boolean> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return false
  }

  try {
    const encodedTableName = encodeURIComponent(AIRTABLE_TABLE_NAME)
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodedTableName}?maxRecords=1`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
    })

    return response.ok
  } catch {
    return false
  }
}
