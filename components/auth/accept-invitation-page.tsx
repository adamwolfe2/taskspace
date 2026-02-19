"use client"

import { useState, useEffect } from "react"
import { useApp } from "@/lib/contexts/app-context"
import { api } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, Check, Users } from "lucide-react"

interface InvitationDetails {
  email: string
  organizationName: string
  role: string
  department: string
  existingUser: boolean
}

interface AcceptInvitationPageProps {
  token: string
}

export function AcceptInvitationPage({ token }: AcceptInvitationPageProps) {
  const { setCurrentUser, setCurrentOrganization, setCurrentPage } = useApp()
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null)
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    async function fetchInvitation() {
      try {
        const data = await api.invitations.getByToken(token)
        setInvitation({
          email: data.email,
          organizationName: data.organizationName,
          role: data.role,
          department: data.department,
          existingUser: data.existingUser,
        })
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Invalid or expired invitation")
      } finally {
        setIsLoading(false)
      }
    }
    fetchInvitation()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!invitation?.existingUser) {
      if (!name) {
        setError("Please enter your name")
        return
      }
      if (!password || password.length < 8) {
        setError("Password must be at least 8 characters")
        return
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match")
        return
      }
    }

    try {
      setIsSubmitting(true)
      const data = await api.invitations.accept(
        token,
        invitation?.existingUser ? undefined : name,
        invitation?.existingUser ? undefined : password
      )

      // Set auth state
      const teamMember = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.member?.role ?? "member",
        department: data.member?.department ?? "",
        avatar: data.user.avatar,
        joinDate: data.member?.joinedAt ?? new Date().toISOString(),
        status: data.member?.status ?? "active",
      }

      setCurrentUser(teamMember)
      setCurrentOrganization(data.organization ?? null)
      setCurrentPage("welcome")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary" role="status" aria-label="Loading" />
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-destructive/10 rounded-xl p-3">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setCurrentPage("login")}
            >
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const passwordRequirements = [
    { met: password.length >= 8, text: "At least 8 characters" },
    { met: /[A-Z]/.test(password), text: "One uppercase letter" },
    { met: /[a-z]/.test(password), text: "One lowercase letter" },
    { met: /[0-9]/.test(password), text: "One number" },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary rounded-xl p-3">
              <Users className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            Join {invitation?.organizationName}
          </CardTitle>
          <CardDescription>
            You've been invited to join as a {invitation?.role} in the {invitation?.department} department
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={invitation?.email || ""}
                disabled
                className="bg-muted"
              />
            </div>

            {!invitation?.existingUser && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSubmitting}
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    autoComplete="new-password"
                  />
                  {password && (
                    <div className="text-xs space-y-1 mt-2">
                      {passwordRequirements.map((req, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-1 ${
                            req.met ? "text-green-600" : "text-muted-foreground"
                          }`}
                        >
                          <Check className={`h-3 w-3 ${req.met ? "opacity-100" : "opacity-30"}`} />
                          <span>{req.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                    autoComplete="new-password"
                  />
                </div>
              </>
            )}

            {invitation?.existingUser && (
              <Alert>
                <Check className="h-4 w-4" />
                <AlertDescription>
                  You already have an account. Click below to join this organization.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                "Accept Invitation"
              )}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => setCurrentPage("login")}
                className="text-primary hover:underline font-medium"
              >
                Back to Login
              </button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
