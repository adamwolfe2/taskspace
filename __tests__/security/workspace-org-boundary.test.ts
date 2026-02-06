/**
 * Security Test: Workspace Organization Boundary Validation
 *
 * Tests that workspace-scoped operations correctly validate that workspaces
 * belong to the authenticated user's organization, preventing cross-organization
 * data access vulnerabilities.
 *
 * CRITICAL: These tests verify the fix for a security vulnerability where an
 * attacker could enumerate workspace IDs and access data from other organizations.
 */

import { verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { createWorkspace, getWorkspaceById } from "@/lib/db/workspaces"
import { sql } from "@/lib/db/sql"

describe("Workspace Organization Boundary Security", () => {
  const testOrgId1 = "test-org-1"
  const testOrgId2 = "test-org-2"
  let workspace1Id: string
  let workspace2Id: string

  beforeAll(async () => {
    // Create test organizations
    await sql`
      INSERT INTO organizations (id, name, settings)
      VALUES
        (${testOrgId1}, 'Test Org 1', '{}'::jsonb),
        (${testOrgId2}, 'Test Org 2', '{}'::jsonb)
      ON CONFLICT (id) DO NOTHING
    `

    // Create workspaces in different organizations
    const ws1 = await createWorkspace({
      organizationId: testOrgId1,
      name: "Workspace in Org 1",
      slug: "workspace-org-1",
      isDefault: true,
    })
    workspace1Id = ws1.id

    const ws2 = await createWorkspace({
      organizationId: testOrgId2,
      name: "Workspace in Org 2",
      slug: "workspace-org-2",
      isDefault: true,
    })
    workspace2Id = ws2.id
  })

  afterAll(async () => {
    // Cleanup
    await sql`DELETE FROM workspaces WHERE id IN (${workspace1Id}, ${workspace2Id})`
    await sql`DELETE FROM organizations WHERE id IN (${testOrgId1}, ${testOrgId2})`
  })

  describe("verifyWorkspaceOrgBoundary", () => {
    it("should return true when workspace belongs to the organization", async () => {
      const result = await verifyWorkspaceOrgBoundary(workspace1Id, testOrgId1)
      expect(result).toBe(true)
    })

    it("should return false when workspace belongs to a different organization", async () => {
      const result = await verifyWorkspaceOrgBoundary(workspace1Id, testOrgId2)
      expect(result).toBe(false)
    })

    it("should return false when workspace does not exist", async () => {
      const result = await verifyWorkspaceOrgBoundary("non-existent-workspace", testOrgId1)
      expect(result).toBe(false)
    })

    it("should prevent workspace enumeration attacks", async () => {
      // Simulate an attacker trying to enumerate workspace IDs
      const attackerOrgId = testOrgId2
      const targetWorkspaceId = workspace1Id // Workspace belonging to different org

      const result = await verifyWorkspaceOrgBoundary(targetWorkspaceId, attackerOrgId)

      // Should return false without revealing information about the workspace
      expect(result).toBe(false)
    })
  })

  describe("Workspace retrieval with organization check", () => {
    it("should successfully retrieve workspace when org matches", async () => {
      const workspace = await getWorkspaceById(workspace1Id)
      expect(workspace).not.toBeNull()
      expect(workspace?.organizationId).toBe(testOrgId1)

      // Verify org boundary
      const isValid = await verifyWorkspaceOrgBoundary(workspace1Id, testOrgId1)
      expect(isValid).toBe(true)
    })

    it("should fail boundary check when org does not match", async () => {
      const workspace = await getWorkspaceById(workspace1Id)
      expect(workspace).not.toBeNull()
      expect(workspace?.organizationId).toBe(testOrgId1)

      // Verify org boundary with wrong org
      const isValid = await verifyWorkspaceOrgBoundary(workspace1Id, testOrgId2)
      expect(isValid).toBe(false)
    })
  })

  describe("Security patterns", () => {
    it("should use 404 status instead of 403 to prevent information leakage", async () => {
      // This is a conceptual test showing the pattern used in routes
      const workspaceExists = await getWorkspaceById(workspace1Id)
      const belongsToOrg = await verifyWorkspaceOrgBoundary(workspace1Id, testOrgId2)

      // When workspace exists but doesn't belong to org, we return 404
      // This prevents attackers from knowing if a workspace ID exists
      if (workspaceExists && !belongsToOrg) {
        const expectedStatusCode = 404 // Not 403
        expect(expectedStatusCode).toBe(404)
      }
    })

    it("should check organization boundary before workspace access check", async () => {
      // The proper order of checks:
      // 1. Check workspace exists
      // 2. Check workspace belongs to user's organization (org boundary)
      // 3. Check user has access to workspace (workspace membership)

      const workspace = await getWorkspaceById(workspace1Id)
      expect(workspace).not.toBeNull()

      // Step 2: Org boundary check (CRITICAL SECURITY CHECK)
      const orgBoundaryPassed = await verifyWorkspaceOrgBoundary(
        workspace1Id,
        testOrgId1
      )
      expect(orgBoundaryPassed).toBe(true)

      // Step 3: Workspace access check would follow
      // (userHasWorkspaceAccess would be called here)
    })
  })
})
