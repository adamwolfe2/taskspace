/**
 * Asana Webhook Signature Verification Tests
 *
 * Tests for verifying Asana webhook requests
 * per https://developers.asana.com/docs/webhooks#security
 */

import { createHmac } from "crypto"
import { verifyAsanaSignature } from "@/lib/integrations/asana"

const TEST_WEBHOOK_SECRET = "test_webhook_secret_123456"

function generateAsanaSignature(body: string, secret: string = TEST_WEBHOOK_SECRET): string {
  return createHmac("sha256", secret).update(body).digest("hex")
}

describe("Asana Webhook Signature Verification", () => {
  describe("verifyAsanaSignature", () => {
    it("should return true for valid signature", () => {
      const body = JSON.stringify({
        events: [
          {
            action: "changed",
            resource: { gid: "123456", resource_type: "task" },
          },
        ],
      })
      const signature = generateAsanaSignature(body)

      const result = verifyAsanaSignature(signature, body, TEST_WEBHOOK_SECRET)

      expect(result).toBe(true)
    })

    it("should return false for invalid signature", () => {
      const body = JSON.stringify({
        events: [{ action: "changed" }],
      })
      const invalidSignature = "invalid_signature_value"

      const result = verifyAsanaSignature(invalidSignature, body, TEST_WEBHOOK_SECRET)

      expect(result).toBe(false)
    })

    it("should return false for modified body (tampered request)", () => {
      const originalBody = JSON.stringify({ events: [{ action: "changed" }] })
      const modifiedBody = JSON.stringify({ events: [{ action: "deleted" }] })
      const signature = generateAsanaSignature(originalBody)

      const result = verifyAsanaSignature(signature, modifiedBody, TEST_WEBHOOK_SECRET)

      expect(result).toBe(false)
    })

    it("should return false for wrong secret", () => {
      const body = JSON.stringify({ events: [] })
      const signature = generateAsanaSignature(body, "correct_secret")

      const result = verifyAsanaSignature(signature, body, "wrong_secret")

      expect(result).toBe(false)
    })

    it("should return false for missing signature", () => {
      const body = JSON.stringify({ events: [] })

      const result = verifyAsanaSignature("", body, TEST_WEBHOOK_SECRET)

      expect(result).toBe(false)
    })

    it("should return false for missing body", () => {
      const signature = "some_signature"

      const result = verifyAsanaSignature(signature, "", TEST_WEBHOOK_SECRET)

      expect(result).toBe(false)
    })

    it("should return false for missing secret", () => {
      const body = JSON.stringify({ events: [] })
      const signature = "some_signature"

      const result = verifyAsanaSignature(signature, body, "")

      expect(result).toBe(false)
    })

    it("should handle complex webhook payloads", () => {
      const body = JSON.stringify({
        events: [
          {
            user: { gid: "12345", resource_type: "user" },
            resource: {
              gid: "67890",
              resource_type: "task",
              name: "Test Task with special chars: <>&\"",
            },
            parent: { gid: "11111", resource_type: "project" },
            action: "changed",
            change: {
              field: "completed",
              action: "changed",
              new_value: true,
            },
          },
        ],
      })
      const signature = generateAsanaSignature(body)

      const result = verifyAsanaSignature(signature, body, TEST_WEBHOOK_SECRET)

      expect(result).toBe(true)
    })

    it("should handle unicode characters in body", () => {
      const body = JSON.stringify({
        events: [
          {
            resource: { name: "Task with emoji 🎉 and unicode: 日本語" },
          },
        ],
      })
      const signature = generateAsanaSignature(body)

      const result = verifyAsanaSignature(signature, body, TEST_WEBHOOK_SECRET)

      expect(result).toBe(true)
    })

    it("should handle empty events array", () => {
      const body = JSON.stringify({ events: [] })
      const signature = generateAsanaSignature(body)

      const result = verifyAsanaSignature(signature, body, TEST_WEBHOOK_SECRET)

      expect(result).toBe(true)
    })

    it("should be case-sensitive for signature comparison", () => {
      const body = JSON.stringify({ events: [] })
      const signature = generateAsanaSignature(body)
      const uppercaseSignature = signature.toUpperCase()

      const result = verifyAsanaSignature(uppercaseSignature, body, TEST_WEBHOOK_SECRET)

      expect(result).toBe(false)
    })
  })
})
