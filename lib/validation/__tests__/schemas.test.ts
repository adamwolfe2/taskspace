/**
 * Schema smoke tests — verify that schemas accept/reject the edge cases
 * that the UI actually produces. Prevents mismatches between "UI allows it"
 * and "schema rejects it" from causing silent 400 errors.
 */

import {
  createEODReportSchema,
  bulkInviteSchema,
  bulkTaskOperationSchema,
  reorderSubtasksSchema,
  updateAgendaSchema,
  bulkRockSchema,
} from "../schemas"

// Reusable valid EOD task
const validTask = {
  id: "task-1",
  text: "Worked on feature X",
  rockTitle: null,
}

// Reusable valid EOD priority
const validPriority = {
  id: "priority-1",
  text: "Finish feature Y tomorrow",
  rockTitle: null,
}

const WORKSPACE_ID = "a0000000-0000-0000-0000-000000000001"

// ============================================================
// createEODReportSchema
// ============================================================

describe("createEODReportSchema", () => {
  it("accepts a minimal valid report with no tomorrow priorities", () => {
    // This was the production bug: min(1) on tomorrowPriorities caused
    // silent 400 when users submitted without any tomorrow priorities.
    const result = createEODReportSchema.safeParse({
      tasks: [validTask],
      tomorrowPriorities: [],
      workspaceId: WORKSPACE_ID,
    })
    expect(result.success).toBe(true)
  })

  it("accepts a full report with priorities", () => {
    const result = createEODReportSchema.safeParse({
      tasks: [validTask],
      tomorrowPriorities: [validPriority],
      challenges: "Some challenge",
      needsEscalation: false,
      workspaceId: WORKSPACE_ID,
    })
    expect(result.success).toBe(true)
  })

  it("rejects when tasks array is empty (UI should always require at least one task)", () => {
    const result = createEODReportSchema.safeParse({
      tasks: [],
      tomorrowPriorities: [],
      workspaceId: WORKSPACE_ID,
    })
    expect(result.success).toBe(false)
  })

  it("rejects when workspaceId is missing", () => {
    const result = createEODReportSchema.safeParse({
      tasks: [validTask],
      tomorrowPriorities: [],
    })
    expect(result.success).toBe(false)
  })

  it("rejects when workspaceId is not a valid UUID", () => {
    const result = createEODReportSchema.safeParse({
      tasks: [validTask],
      tomorrowPriorities: [],
      workspaceId: "not-a-uuid",
    })
    expect(result.success).toBe(false)
  })

  it("accepts optional challenges defaulting to empty string", () => {
    const result = createEODReportSchema.safeParse({
      tasks: [validTask],
      tomorrowPriorities: [],
      workspaceId: WORKSPACE_ID,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.challenges).toBe("")
    }
  })

  it("accepts needsEscalation defaulting to false", () => {
    const result = createEODReportSchema.safeParse({
      tasks: [validTask],
      tomorrowPriorities: [],
      workspaceId: WORKSPACE_ID,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.needsEscalation).toBe(false)
    }
  })

  it("accepts numeric metric value", () => {
    const result = createEODReportSchema.safeParse({
      tasks: [validTask],
      tomorrowPriorities: [],
      workspaceId: WORKSPACE_ID,
      metricValueToday: 5,
    })
    expect(result.success).toBe(true)
  })

  it("accepts null metric value", () => {
    const result = createEODReportSchema.safeParse({
      tasks: [validTask],
      tomorrowPriorities: [],
      workspaceId: WORKSPACE_ID,
      metricValueToday: null,
    })
    expect(result.success).toBe(true)
  })

  it("strips rockId empty strings to null (transform)", () => {
    const result = createEODReportSchema.safeParse({
      tasks: [{ ...validTask, rockId: "" }],
      tomorrowPriorities: [],
      workspaceId: WORKSPACE_ID,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tasks[0].rockId).toBeNull()
    }
  })
})

// ============================================================
// bulkInviteSchema — min(1) IS intentional here
// ============================================================

describe("bulkInviteSchema", () => {
  it("accepts one or more valid emails", () => {
    const result = bulkInviteSchema.safeParse({
      emails: ["adam@example.com"],
      role: "member",
      department: "Engineering",
    })
    expect(result.success).toBe(true)
  })

  it("rejects empty emails array (intentional — bulk invite needs targets)", () => {
    const result = bulkInviteSchema.safeParse({
      emails: [],
      role: "member",
      department: "Engineering",
    })
    expect(result.success).toBe(false)
  })
})

// ============================================================
// bulkTaskOperationSchema — min(1) IS intentional
// ============================================================

describe("bulkTaskOperationSchema", () => {
  it("rejects empty taskIds (intentional)", () => {
    const result = bulkTaskOperationSchema.safeParse({
      taskIds: [],
      operation: "complete",
    })
    expect(result.success).toBe(false)
  })

  it("accepts valid bulk operation", () => {
    const result = bulkTaskOperationSchema.safeParse({
      taskIds: ["a0000000-0000-0000-0000-000000000002"],
      operation: "complete",
    })
    expect(result.success).toBe(true)
  })
})

// ============================================================
// reorderSubtasksSchema — min(1) IS intentional
// ============================================================

describe("reorderSubtasksSchema", () => {
  it("rejects empty subtaskIds (can't reorder nothing)", () => {
    const result = reorderSubtasksSchema.safeParse({ subtaskIds: [] })
    expect(result.success).toBe(false)
  })

  it("accepts a list of subtask IDs", () => {
    const result = reorderSubtasksSchema.safeParse({
      subtaskIds: ["sub-1", "sub-2"],
    })
    expect(result.success).toBe(true)
  })
})

// ============================================================
// updateAgendaSchema — min(1) IS intentional
// ============================================================

describe("updateAgendaSchema", () => {
  it("rejects empty sections array (agenda must have at least one section)", () => {
    const result = updateAgendaSchema.safeParse({ sections: [] })
    expect(result.success).toBe(false)
  })
})

// ============================================================
// bulkRockSchema — min(1) IS intentional (AI bulk import)
// ============================================================

describe("bulkRockSchema", () => {
  it("rejects empty rocks array", () => {
    const result = bulkRockSchema.safeParse({ rocks: [] })
    expect(result.success).toBe(false)
  })
})
