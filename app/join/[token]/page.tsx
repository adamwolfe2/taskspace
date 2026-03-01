"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react"

interface WorkspaceInfo {
  workspaceName: string
  workspaceType: string
  organizationName: string
  logoUrl: string | null
  primaryColor: string | null
  invitedEmail?: string
}

export default function JoinWorkspacePage() {
  const router = useRouter()
  const params = useParams<{ token: string }>()
  const token = params?.token as string

  const [info, setInfo] = useState<WorkspaceInfo | null>(null)
  const [infoError, setInfoError] = useState<string | null>(null)
  const [infoLoading, setInfoLoading] = useState(true)

  // Form state
  const [isSignIn, setIsSignIn] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fetch workspace info on mount
  useEffect(() => {
    if (!token) return

    fetch(`/api/join/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setInfo(data.data)
          // Pre-fill email for email-specific invitations
          if (data.data.invitedEmail) {
            setEmail(data.data.invitedEmail)
          }
        } else {
          setInfoError(data.error || "This invite link is no longer valid.")
        }
      })
      .catch(() => {
        setInfoError("Failed to load invite information.")
      })
      .finally(() => {
        setInfoLoading(false)
      })
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!isSignIn && !name.trim()) {
      setFormError("Please enter your name.")
      return
    }
    if (!email.trim()) {
      setFormError("Please enter your email.")
      return
    }
    if (!password) {
      setFormError("Please enter your password.")
      return
    }

    setIsSubmitting(true)
    try {
      const body: Record<string, string> = { email, password }
      if (!isSignIn) body.name = name.trim()

      const res = await fetch(`/api/join/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      })

      const data = await res.json()

      if (!data.success) {
        setFormError(data.error || "Failed to join workspace.")
        return
      }

      setSuccess(true)

      // Brief pause so the user sees the success state
      setTimeout(() => {
        router.push("/app")
      }, 1200)
    } catch {
      setFormError("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading state
  if (infoLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  // Invalid token
  if (infoError || !info) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <p className="text-center font-medium text-slate-800">
              {infoError || "This invite link is no longer valid."}
            </p>
            <p className="text-sm text-slate-500 text-center">
              Ask a workspace admin to generate a new invite link.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="text-center font-medium text-slate-800">
              You&apos;ve joined <strong>{info.workspaceName}</strong>!
            </p>
            <p className="text-sm text-slate-500">Redirecting you to the app&hellip;</p>
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </CardContent>
        </Card>
      </div>
    )
  }

  const accentColor = info.primaryColor || "#0f172a"

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="text-center space-y-3 pb-4">
          {/* Logo */}
          {info.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={info.logoUrl}
              alt={`${info.organizationName} logo`}
              className="h-12 w-auto mx-auto object-contain"
            />
          ) : (
            <div
              className="h-12 w-12 rounded-full mx-auto flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: accentColor }}
            >
              {(info.organizationName || "?")[0]?.toUpperCase()}
            </div>
          )}

          <div>
            <CardTitle className="text-xl">
              Join {info.workspaceName}
            </CardTitle>
            <CardDescription className="mt-1">
              {info.organizationName}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name — only for new account flow */}
            {!isSignIn && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isSignIn}
                  disabled={isSubmitting}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting || !!info?.invitedEmail}
                className={info?.invitedEmail ? "bg-slate-50 text-slate-500" : ""}
              />
              {info?.invitedEmail && (
                <p className="text-xs text-slate-400">This invitation is for this email address.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder={isSignIn ? "Your password" : "Create a password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
              />
              {!isSignIn && (
                <p className="text-xs text-slate-500">
                  Min 8 characters, must include upper, lower, and number.
                </p>
              )}
            </div>

            {formError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {formError}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
              style={{ backgroundColor: accentColor, borderColor: accentColor }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isSignIn ? "Signing in…" : "Creating account…"}
                </>
              ) : isSignIn ? (
                "Sign in & join"
              ) : (
                `Join ${info.workspaceName}`
              )}
            </Button>

            <p className="text-center text-sm text-slate-500">
              {isSignIn ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    className="text-slate-700 underline underline-offset-2 font-medium"
                    onClick={() => { setIsSignIn(false); setFormError(null) }}
                  >
                    Create one
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="text-slate-700 underline underline-offset-2 font-medium"
                    onClick={() => { setIsSignIn(true); setFormError(null) }}
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
