/**
 * API Utilities Barrel Export
 *
 * Centralized exports for API-related utilities and middleware.
 */

export {
  withAuth,
  withAdmin,
  withOwner,
  withWorkspaceAccess,
  withWorkspaceParam,
  withOptionalAuth,
  withRoleCheck,
  withOrgMembership,
  type AuthenticatedHandler,
  type WorkspaceHandler,
  type RouteContext,
} from "./middleware"
