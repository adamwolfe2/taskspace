/**
 * Zod validation schema tests
 *
 * Tests for:
 * - loginSchema
 * - registerSchema
 * - forgotPasswordSchema
 * - resetPasswordSchema
 * - updateNotificationSchema
 * - createTaskSchema
 */

import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateNotificationSchema,
  createTaskSchema,
} from "@/lib/validation/schemas"

describe("loginSchema", () => {
  it("should validate a correct login payload", () => {
    const result = loginSchema.safeParse({
      email: "User@Example.com",
      password: "secret123",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe("user@example.com") // lowercased
    }
  })

  it("should fail when email is missing", () => {
    const result = loginSchema.safeParse({ password: "secret123" })
    expect(result.success).toBe(false)
  })

  it("should fail when password is missing", () => {
    const result = loginSchema.safeParse({ email: "user@example.com" })
    expect(result.success).toBe(false)
  })

  it("should fail for invalid email format", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "secret123",
    })
    expect(result.success).toBe(false)
  })

  it("should accept optional organizationId", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "secret",
      organizationId: "550e8400-e29b-41d4-a716-446655440000",
    })
    expect(result.success).toBe(true)
  })
})

describe("registerSchema", () => {
  const validRegister = {
    email: "new@example.com",
    password: "StrongPass1",
    name: "Test User",
  }

  it("should validate a correct registration payload", () => {
    const result = registerSchema.safeParse(validRegister)
    expect(result.success).toBe(true)
  })

  it("should fail when password is too short", () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      password: "Sh1",
    })
    expect(result.success).toBe(false)
  })

  it("should fail when password lacks uppercase", () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      password: "alllowercase1",
    })
    expect(result.success).toBe(false)
  })

  it("should fail when name is missing", () => {
    const result = registerSchema.safeParse({
      email: "new@example.com",
      password: "StrongPass1",
    })
    expect(result.success).toBe(false)
  })

  it("should fail when name is too short", () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      name: "A",
    })
    expect(result.success).toBe(false)
  })

  it("should accept optional organizationName", () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      organizationName: "My Org",
    })
    expect(result.success).toBe(true)
  })
})

describe("forgotPasswordSchema", () => {
  it("should validate a correct email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "user@example.com" })
    expect(result.success).toBe(true)
  })

  it("should fail for invalid email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "bad-email" })
    expect(result.success).toBe(false)
  })
})

describe("resetPasswordSchema", () => {
  it("should validate a correct reset payload", () => {
    const result = resetPasswordSchema.safeParse({
      token: "some-valid-token",
      password: "NewStrong1",
    })
    expect(result.success).toBe(true)
  })

  it("should fail when token is missing", () => {
    const result = resetPasswordSchema.safeParse({
      password: "NewStrong1",
    })
    expect(result.success).toBe(false)
  })

  it("should fail when password is too short", () => {
    const result = resetPasswordSchema.safeParse({
      token: "some-token",
      password: "Sh1",
    })
    expect(result.success).toBe(false)
  })

  it("should fail when password lacks a number", () => {
    const result = resetPasswordSchema.safeParse({
      token: "some-token",
      password: "NoNumbersHere",
    })
    expect(result.success).toBe(false)
  })
})

describe("updateNotificationSchema", () => {
  it("should validate with id", () => {
    const result = updateNotificationSchema.safeParse({ id: "notif-123" })
    expect(result.success).toBe(true)
  })

  it("should validate with markAllRead", () => {
    const result = updateNotificationSchema.safeParse({ markAllRead: true })
    expect(result.success).toBe(true)
  })

  it("should validate empty object (both optional)", () => {
    const result = updateNotificationSchema.safeParse({})
    expect(result.success).toBe(true)
  })
})

describe("createTaskSchema", () => {
  const validTask = {
    title: "Complete the report",
    workspaceId: "550e8400-e29b-41d4-a716-446655440000",
  }

  it("should validate a minimal task (title + workspaceId)", () => {
    const result = createTaskSchema.safeParse(validTask)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.priority).toBe("normal") // default
    }
  })

  it("should fail when title is missing", () => {
    const result = createTaskSchema.safeParse({
      workspaceId: "550e8400-e29b-41d4-a716-446655440000",
    })
    expect(result.success).toBe(false)
  })

  it("should fail when workspaceId is missing", () => {
    const result = createTaskSchema.safeParse({ title: "A task" })
    expect(result.success).toBe(false)
  })

  it("should fail for invalid priority", () => {
    const result = createTaskSchema.safeParse({
      ...validTask,
      priority: "urgent",
    })
    expect(result.success).toBe(false)
  })

  it("should accept valid priority values", () => {
    for (const priority of ["high", "medium", "normal"]) {
      const result = createTaskSchema.safeParse({ ...validTask, priority })
      expect(result.success).toBe(true)
    }
  })

  it("should accept optional dueDate in YYYY-MM-DD format", () => {
    const result = createTaskSchema.safeParse({
      ...validTask,
      dueDate: "2024-03-15",
    })
    expect(result.success).toBe(true)
  })

  it("should reject invalid dueDate format", () => {
    const result = createTaskSchema.safeParse({
      ...validTask,
      dueDate: "March 15, 2024",
    })
    expect(result.success).toBe(false)
  })

  it("should fail when title is empty after trimming", () => {
    const result = createTaskSchema.safeParse({
      ...validTask,
      title: "   ",
    })
    expect(result.success).toBe(false)
  })
})
