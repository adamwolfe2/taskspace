/**
 * Web Push Utility
 *
 * Wraps the `web-push` npm package for sending VAPID-authenticated push notifications.
 * Configure VAPID keys via environment variables:
 *   VAPID_PUBLIC_KEY   — base64url-encoded public key
 *   VAPID_PRIVATE_KEY  — base64url-encoded private key
 *   VAPID_SUBJECT      — mailto: or https: contact URI (optional, defaults to app URL)
 *
 * Generate a keypair once with: npx web-push generate-vapid-keys
 */

import webpush from "web-push"
import { logger, logError } from "@/lib/logger"

let vapidConfigured = false

function ensureVapidConfigured(): void {
  if (vapidConfigured) return

  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY

  if (!publicKey || !privateKey) return

  const subject =
    process.env.VAPID_SUBJECT ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://www.trytaskspace.com"

  webpush.setVapidDetails(subject, publicKey, privateKey)
  vapidConfigured = true
}

/**
 * Returns true if VAPID keys are present in environment variables.
 */
export function isWebPushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

/**
 * Send a push notification to a single subscription.
 *
 * @param subscription - The push subscription object (endpoint + keys)
 * @param payload      - Notification content: title, body, and optional URL to open on click
 * @returns true if the notification was delivered, false on any error
 */
export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string }
): Promise<boolean> {
  if (!isWebPushConfigured()) {
    logger.warn("sendPushNotification: VAPID keys not configured, skipping")
    return false
  }

  ensureVapidConfigured()

  const pushSubscription: webpush.PushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  }

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/app",
  })

  try {
    await webpush.sendNotification(pushSubscription, notificationPayload)
    return true
  } catch (error) {
    // 410 Gone means the subscription has been revoked by the browser — log but don't throw
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 410 || statusCode === 404) {
      logger.info(
        { endpoint: subscription.endpoint, statusCode },
        "Push subscription is expired or invalid — should be removed"
      )
    } else {
      logError(logger, "sendPushNotification error", error)
    }
    return false
  }
}
