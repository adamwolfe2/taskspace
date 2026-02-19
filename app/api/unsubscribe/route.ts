import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { ApiResponse, NotificationPreferences } from '@/lib/types'

// GET /api/unsubscribe?email=user@example.com
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const email = searchParams.get('email')

  if (!email) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Email parameter required' },
      { status: 400 }
    )
  }

  try {
    // Find user by email
    const user = await db.users.findByEmail(email)

    if (!user) {
      // Show success page anyway to prevent email enumeration
      return renderUnsubscribePage()
    }

    // Find all org memberships for this user and disable email notifications
    const memberships = await db.members.findByUserId(user.id)

    for (const membership of memberships) {
      const currentPrefs = membership.notificationPreferences
      if (!currentPrefs) continue

      const updatedPrefs: NotificationPreferences = {
        task_assigned: { ...currentPrefs.task_assigned, email: false },
        eod_reminder: { ...currentPrefs.eod_reminder, email: false },
        escalation: { ...currentPrefs.escalation, email: false },
        rock_updated: { ...currentPrefs.rock_updated, email: false },
        digest: { ...currentPrefs.digest, email: false },
      }

      await db.members.update(membership.id, {
        notificationPreferences: updatedPrefs,
      })
    }

    return renderUnsubscribePage()
  } catch {
    // Still show success to prevent info leakage
    return renderUnsubscribePage()
  }
}

function renderUnsubscribePage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trytaskspace.com'
  return new NextResponse(
    `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed - TaskSpace</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
      max-width: 500px;
      width: 100%;
      padding: 40px;
      text-align: center;
    }
    h1 {
      color: #1f2937;
      margin-bottom: 16px;
    }
    p {
      color: #6b7280;
      margin-bottom: 24px;
    }
    .button {
      display: inline-block;
      background: #3b82f6;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      transition: background 0.2s;
    }
    .button:hover {
      background: #2563eb;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>You've been unsubscribed</h1>
    <p>You will no longer receive email notifications from TaskSpace.</p>
    <p>You can re-enable notifications anytime from your account settings.</p>
    <a href="${appUrl}/settings" class="button">Go to Settings</a>
  </div>
</body>
</html>
    `,
    {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    }
  )
}
