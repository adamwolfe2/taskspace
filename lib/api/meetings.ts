/**
 * Meeting API Helper Functions
 *
 * Contains shared logic for meeting state management and validation.
 */

import type { MeetingStatus } from "@/lib/db/meetings"

// Valid state transitions for meeting lifecycle
export const VALID_TRANSITIONS: Record<MeetingStatus, MeetingStatus[]> = {
  'scheduled': ['in_progress', 'cancelled'],
  'in_progress': ['completed', 'cancelled'],
  'completed': [], // terminal state - no transitions allowed
  'cancelled': [], // terminal state - no transitions allowed
}

/**
 * Validates if a meeting status transition is allowed
 * @param from - Current meeting status
 * @param to - Target meeting status
 * @returns true if the transition is valid, false otherwise
 */
export function isValidTransition(from: MeetingStatus, to: MeetingStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

/**
 * Checks if a meeting status is a terminal state
 * @param status - Meeting status to check
 * @returns true if the status is terminal (completed or cancelled)
 */
export function isTerminalState(status: MeetingStatus): boolean {
  return status === 'completed' || status === 'cancelled'
}

/**
 * Gets a human-readable error message for an invalid transition
 * @param from - Current meeting status
 * @param to - Target meeting status
 * @returns Error message explaining why the transition is invalid
 */
export function getTransitionErrorMessage(from: MeetingStatus, to: MeetingStatus): string {
  if (isTerminalState(from)) {
    return `Cannot modify a ${from} meeting. Meetings in terminal states are read-only.`
  }

  const validTransitions = VALID_TRANSITIONS[from]
  if (!validTransitions || validTransitions.length === 0) {
    return `Invalid meeting state: ${from}`
  }

  return `Cannot transition from '${from}' to '${to}'. Valid transitions: ${validTransitions.join(', ')}`
}
