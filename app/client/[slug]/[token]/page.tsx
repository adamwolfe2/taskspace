/**
 * Client Portal Page
 *
 * Public server component — no auth middleware.
 * Validates token server-side and renders the interactive portal.
 */

import type { Metadata } from "next"
import { validatePortalToken } from "@/lib/auth/client-portal-auth"
import { ClientPortalPage } from "@/components/client-portal/client-portal-page"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  other: {
    "X-Robots-Tag": "noindex, nofollow",
  },
}

interface Props {
  params: Promise<{ slug: string; token: string }>
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="max-w-md w-full bg-background rounded-lg border p-8 text-center space-y-3">
        <div className="text-4xl">🔒</div>
        <h1 className="text-lg font-semibold">Portal Unavailable</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

export default async function Page({ params }: Props) {
  const { slug, token } = await params
  const auth = await validatePortalToken(slug, token)

  if ("error" in auth) {
    return <ErrorCard message="This portal link is no longer active." />
  }

  const { client } = auth

  return (
    <ClientPortalPage
      clientName={client.name}
      orgName={client.orgName}
      orgLogoUrl={client.orgLogoUrl}
      orgPrimaryColor={client.orgPrimaryColor}
      slug={slug}
      token={token}
    />
  )
}
