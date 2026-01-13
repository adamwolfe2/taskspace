/**
 * Slack Webhook Signature Verification Tests
 *
 * Tests for verifying Slack webhook requests
 * per https://api.slack.com/authentication/verifying-requests-from-slack
 */

import { createHmac } from "crypto"
import { verifySlackSignature } from "@/lib/integrations/slack"

const TEST_SIGNING_SECRET = "8f742231b10e8888abcd99yyyzzz85a5"

function generateSlackSignature(
  timestamp: string,
  body: string,
  secret: string = TEST_SIGNING_SECRET
): string {
  const sigBaseString = `v0:${timestamp}:${body}`
  return `v0=${createHmac("sha256", secret).update(sigBaseString).digest("hex")}`
}

describe("Slack Webhook Signature Verification", () => {
  describe("verifySlackSignature", () => {
    it("should return true for valid signature", () => {
      const timestamp = Math.floor(Date.now() / 1000).toString()
      const body = '{"type":"url_verification","challenge":"test123"}'
      const signature = generateSlackSignature(timestamp, body)

      const result = verifySlackSignature(
        signature,
        timestamp,
        body,
        TEST_SIGNING_SECRET
      )

      expect(result).toBe(true)
    })

    it("should return false for invalid signature", () => {
      const timestamp = Math.floor(Date.now() / 1000).toString()
      const body = '{"type":"url_verification","challenge":"test123"}'
      const invalidSignature = "v0=invalid_signature_here"

      const result = verifySlackSignature(
        invalidSignature,
        timestamp,
        body,
        TEST_SIGNING_SECRET
      )

      expect(result).toBe(false)
    })

    it("should return false for modified body (tampered request)", () => {
      const timestamp = Math.floor(Date.now() / 1000).toString()
      const originalBody = '{"type":"url_verification","challenge":"test123"}'
      const modifiedBody = '{"type":"url_verification","challenge":"hacked"}'
      const signature = generateSlackSignature(timestamp, originalBody)

      const result = verifySlackSignature(
        signature,
        timestamp,
        modifiedBody,
        TEST_SIGNING_SECRET
      )

      expect(result).toBe(false)
    })

    it("should return false for old timestamp (replay attack)", () => {
      // Timestamp from 10 minutes ago
      const oldTimestamp = (Math.floor(Date.now() / 1000) - 600).toString()
      const body = '{"type":"url_verification","challenge":"test123"}'
      const signature = generateSlackSignature(oldTimestamp, body)

      const result = verifySlackSignature(
        signature,
        oldTimestamp,
        body,
        TEST_SIGNING_SECRET
      )

      expect(result).toBe(false)
    })

    it("should return true for timestamp within 5 minute window", () => {
      // Timestamp from 2 minutes ago
      const recentTimestamp = (Math.floor(Date.now() / 1000) - 120).toString()
      const body = '{"type":"url_verification","challenge":"test123"}'
      const signature = generateSlackSignature(recentTimestamp, body)

      const result = verifySlackSignature(
        signature,
        recentTimestamp,
        body,
        TEST_SIGNING_SECRET
      )

      expect(result).toBe(true)
    })

    it("should return false for missing signature", () => {
      const timestamp = Math.floor(Date.now() / 1000).toString()
      const body = '{"type":"url_verification"}'

      const result = verifySlackSignature("", timestamp, body, TEST_SIGNING_SECRET)

      expect(result).toBe(false)
    })

    it("should return false for missing timestamp", () => {
      const body = '{"type":"url_verification"}'
      const signature = "v0=some_signature"

      const result = verifySlackSignature(signature, "", body, TEST_SIGNING_SECRET)

      expect(result).toBe(false)
    })

    it("should return false for missing body", () => {
      const timestamp = Math.floor(Date.now() / 1000).toString()
      const signature = "v0=some_signature"

      const result = verifySlackSignature(signature, timestamp, "", TEST_SIGNING_SECRET)

      expect(result).toBe(false)
    })

    it("should return false for missing secret", () => {
      const timestamp = Math.floor(Date.now() / 1000).toString()
      const body = '{"type":"url_verification"}'
      const signature = "v0=some_signature"

      const result = verifySlackSignature(signature, timestamp, body, "")

      expect(result).toBe(false)
    })

    it("should return false for wrong secret", () => {
      const timestamp = Math.floor(Date.now() / 1000).toString()
      const body = '{"type":"url_verification","challenge":"test123"}'
      const signature = generateSlackSignature(timestamp, body, "correct_secret")

      const result = verifySlackSignature(
        signature,
        timestamp,
        body,
        "wrong_secret"
      )

      expect(result).toBe(false)
    })

    it("should handle complex JSON payloads", () => {
      const timestamp = Math.floor(Date.now() / 1000).toString()
      const body = JSON.stringify({
        token: "test",
        team_id: "T12345",
        event: {
          type: "message",
          user: "U12345",
          text: "Hello <@U12345>!",
          ts: "1234567890.123456",
        },
      })
      const signature = generateSlackSignature(timestamp, body)

      const result = verifySlackSignature(
        signature,
        timestamp,
        body,
        TEST_SIGNING_SECRET
      )

      expect(result).toBe(true)
    })

    it("should handle special characters in body", () => {
      const timestamp = Math.floor(Date.now() / 1000).toString()
      const body = '{"text":"Hello\\nWorld\\t<>&\\"special chars"}'
      const signature = generateSlackSignature(timestamp, body)

      const result = verifySlackSignature(
        signature,
        timestamp,
        body,
        TEST_SIGNING_SECRET
      )

      expect(result).toBe(true)
    })
  })
})
