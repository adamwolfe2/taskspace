// Google Calendar integration utilities

import { db } from "@/lib/db"
import { generateId } from "@/lib/auth/password"
import type { GoogleCalendarToken, GoogleCalendarEventMapping, AssignedTask, Rock } from "@/lib/types"
import { encryptToken, decryptToken } from "@/lib/crypto/token-encryption"

// OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/google-calendar/callback`

// Required scopes for Calendar access
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
]

export function isConfigured(): boolean {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET)
}

export function getAuthUrl(state: string): string {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google Calendar is not configured')
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string
  refresh_token: string
  expiry_date: number
  token_type: string
  scope: string
}> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Google Calendar is not configured')
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Token exchange error:', error)
    throw new Error('Failed to exchange code for tokens')
  }

  const data = await response.json()
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry_date: Date.now() + (data.expires_in * 1000),
    token_type: data.token_type,
    scope: data.scope,
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  expiry_date: number
}> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Google Calendar is not configured')
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to refresh access token')
  }

  const data = await response.json()
  return {
    access_token: data.access_token,
    expiry_date: Date.now() + (data.expires_in * 1000),
  }
}

// Legacy method - for backward compatibility
export async function getValidAccessToken(userId: string, orgId: string, workspaceId?: string): Promise<string | null> {
  // If workspaceId is provided, use workspace-scoped method
  if (workspaceId) {
    const token = await db.googleCalendarTokens.findByUserIdAndWorkspace(userId, orgId, workspaceId)
    if (!token) return null

    // Decrypt tokens from database
    const decryptedAccessToken = decryptToken(token.accessToken)
    const decryptedRefreshToken = decryptToken(token.refreshToken)

    if (!decryptedAccessToken || !decryptedRefreshToken) {
      console.error('Failed to decrypt Google Calendar tokens')
      return null
    }

    // Check if token is expired (with 5 min buffer)
    if (token.expiryDate < Date.now() + 5 * 60 * 1000) {
      try {
        const refreshed = await refreshAccessToken(decryptedRefreshToken)
        // Encrypt new access token before storing
        const encryptedAccessToken = encryptToken(refreshed.access_token)
        await db.googleCalendarTokens.updateByWorkspace(userId, orgId, workspaceId, {
          accessToken: encryptedAccessToken!,
          expiryDate: refreshed.expiry_date,
        })
        return refreshed.access_token
      } catch (error) {
        console.error('Failed to refresh token:', error)
        return null
      }
    }

    return decryptedAccessToken
  }

  // Legacy: org-scoped lookup
  const token = await db.googleCalendarTokens.findByUserId(userId, orgId)
  if (!token) return null

  // Decrypt tokens from database
  const decryptedAccessToken = decryptToken(token.accessToken)
  const decryptedRefreshToken = decryptToken(token.refreshToken)

  if (!decryptedAccessToken || !decryptedRefreshToken) {
    console.error('Failed to decrypt Google Calendar tokens')
    return null
  }

  // Check if token is expired (with 5 min buffer)
  if (token.expiryDate < Date.now() + 5 * 60 * 1000) {
    try {
      const refreshed = await refreshAccessToken(decryptedRefreshToken)
      // Encrypt new access token before storing
      const encryptedAccessToken = encryptToken(refreshed.access_token)
      await db.googleCalendarTokens.update(userId, orgId, {
        accessToken: encryptedAccessToken!,
        expiryDate: refreshed.expiry_date,
      })
      return refreshed.access_token
    } catch (error) {
      console.error('Failed to refresh token:', error)
      return null
    }
  }

  return decryptedAccessToken
}

// Calendar API helpers
export async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: {
    summary: string
    description?: string
    start: { date: string } | { dateTime: string; timeZone?: string }
    end: { date: string } | { dateTime: string; timeZone?: string }
    colorId?: string
  }
): Promise<{ id: string }> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    console.error('Create event error:', error)
    throw new Error('Failed to create calendar event')
  }

  return response.json()
}

export async function updateCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: {
    summary?: string
    description?: string
    start?: { date: string } | { dateTime: string; timeZone?: string }
    end?: { date: string } | { dateTime: string; timeZone?: string }
    colorId?: string
  }
): Promise<{ id: string }> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    console.error('Update event error:', error)
    throw new Error('Failed to update calendar event')
  }

  return response.json()
}

export async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok && response.status !== 410) { // 410 = already deleted
    throw new Error('Failed to delete calendar event')
  }
}

export async function getCalendarList(accessToken: string): Promise<Array<{
  id: string
  summary: string
  primary?: boolean
}>> {
  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error('Failed to get calendar list')
  }

  const data = await response.json()
  return data.items || []
}

// Sync helpers
export async function syncTaskToCalendar(
  userId: string,
  orgId: string,
  task: AssignedTask
): Promise<void> {
  const accessToken = await getValidAccessToken(userId, orgId)
  if (!accessToken) return

  const tokenData = await db.googleCalendarTokens.findByUserId(userId, orgId)
  if (!tokenData || !tokenData.syncEnabled) return

  // Only sync tasks with due dates
  if (!task.dueDate) return

  const existingMapping = await db.googleCalendarEvents.findByItem(userId, 'task', task.id)

  const eventData = {
    summary: `[Task] ${task.title}`,
    description: task.description || `Priority: ${task.priority}`,
    start: { date: task.dueDate },
    end: { date: task.dueDate },
    colorId: task.priority === 'high' ? '11' : task.priority === 'medium' ? '5' : '8', // Red, Yellow, Gray
  }

  try {
    if (existingMapping) {
      // Update existing event
      await updateCalendarEvent(
        accessToken,
        tokenData.calendarId,
        existingMapping.googleEventId,
        eventData
      )
    } else {
      // Create new event
      const event = await createCalendarEvent(accessToken, tokenData.calendarId, eventData)

      const now = new Date().toISOString()
      await db.googleCalendarEvents.create({
        id: generateId(),
        userId,
        googleEventId: event.id,
        itemType: 'task',
        itemId: task.id,
        calendarId: tokenData.calendarId,
        createdAt: now,
        updatedAt: now,
      })
    }
  } catch (error) {
    console.error('Failed to sync task to calendar:', error)
  }
}

export async function syncRockToCalendar(
  userId: string,
  orgId: string,
  rock: Rock
): Promise<void> {
  const accessToken = await getValidAccessToken(userId, orgId)
  if (!accessToken) return

  const tokenData = await db.googleCalendarTokens.findByUserId(userId, orgId)
  if (!tokenData || !tokenData.syncEnabled) return

  const existingMapping = await db.googleCalendarEvents.findByItem(userId, 'rock', rock.id)

  const statusColors: Record<string, string> = {
    'on-track': '10',    // Green
    'at-risk': '5',      // Yellow
    'blocked': '11',     // Red
    'completed': '8',    // Gray
  }

  const eventData = {
    summary: `[Rock] ${rock.title}`,
    description: `${rock.description || ''}\n\nProgress: ${rock.progress}%\nStatus: ${rock.status}`,
    start: { date: rock.dueDate },
    end: { date: rock.dueDate },
    colorId: statusColors[rock.status] || '8',
  }

  try {
    if (existingMapping) {
      await updateCalendarEvent(
        accessToken,
        tokenData.calendarId,
        existingMapping.googleEventId,
        eventData
      )
    } else {
      const event = await createCalendarEvent(accessToken, tokenData.calendarId, eventData)

      const now = new Date().toISOString()
      await db.googleCalendarEvents.create({
        id: generateId(),
        userId,
        googleEventId: event.id,
        itemType: 'rock',
        itemId: rock.id,
        calendarId: tokenData.calendarId,
        createdAt: now,
        updatedAt: now,
      })
    }
  } catch (error) {
    console.error('Failed to sync rock to calendar:', error)
  }
}

export async function removeFromCalendar(
  userId: string,
  orgId: string,
  itemType: 'task' | 'rock',
  itemId: string
): Promise<void> {
  const accessToken = await getValidAccessToken(userId, orgId)
  if (!accessToken) return

  const tokenData = await db.googleCalendarTokens.findByUserId(userId, orgId)
  if (!tokenData) return

  const mapping = await db.googleCalendarEvents.findByItem(userId, itemType, itemId)
  if (!mapping) return

  try {
    await deleteCalendarEvent(accessToken, tokenData.calendarId, mapping.googleEventId)
    await db.googleCalendarEvents.deleteByItem(userId, itemType, itemId)
  } catch (error) {
    console.error('Failed to remove from calendar:', error)
  }
}
