"use client"

import React, { useState } from "react"
import { useApp } from "@/lib/contexts/app-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock, Loader2, Check, Eye, EyeOff, AlertTriangle, Shield, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { TwoFactorSettings } from "./two-factor-settings"

export function SecuritySettingsTab() {
  const { currentUser: _currentUser } = useApp()
  const { toast } = useToast()
  const router = useRouter()

  // Password state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])

  // 2FA state
  const [totpEnabled, setTotpEnabled] = useState(false)
  const [totpStatusLoaded, setTotpStatusLoaded] = useState(false)

  // Fetch 2FA status on mount
  React.useEffect(() => {
    async function check2FAStatus() {
      try {
        const res = await fetch("/api/auth/session", {
          headers: { "X-Requested-With": "XMLHttpRequest" },
        })
        const data = await res.json()
        if (data.success) {
          setTotpEnabled(data.data?.user?.totpEnabled ?? false)
        }
      } catch {
        // Silently fail
      } finally {
        setTotpStatusLoaded(true)
      }
    }
    check2FAStatus()
  }, [])

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deletePassword, setDeletePassword] = useState("")
  const [showDeletePassword, setShowDeletePassword] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)

  const validatePassword = (password: string): string[] => {
    const errors: string[] = []
    if (password.length < 8) errors.push("Password must be at least 8 characters long")
    if (!/[A-Z]/.test(password)) errors.push("Password must contain at least one uppercase letter")
    if (!/[a-z]/.test(password)) errors.push("Password must contain at least one lowercase letter")
    if (!/[0-9]/.test(password)) errors.push("Password must contain at least one number")
    return errors
  }

  const handleChangePassword = async () => {
    setPasswordErrors([])
    if (!currentPassword) { setPasswordErrors(["Please enter your current password"]); return }
    const validationErrors = validatePassword(newPassword)
    if (validationErrors.length > 0) { setPasswordErrors(validationErrors); return }
    if (newPassword !== confirmPassword) { setPasswordErrors(["New password and confirmation do not match"]); return }
    if (currentPassword === newPassword) { setPasswordErrors(["New password must be different from your current password"]); return }

    setIsSavingPassword(true)
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await response.json().catch(() => ({ success: false, error: null }))
      if (!data.success) throw new Error(data.error || "Failed to change password")

      setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setPasswordErrors([])
      toast({ title: "Password changed", description: "Your password has been updated successfully." })
    } catch (err: unknown) {
      setPasswordErrors([getErrorMessage(err, "Failed to change password")])
    } finally {
      setIsSavingPassword(false)
    }
  }

  const passwordStrength = (() => {
    if (!newPassword) return { label: "", color: "", width: 0 }
    const errors = validatePassword(newPassword)
    const score = 4 - errors.length
    if (score <= 1) return { label: "Weak", color: "bg-red-500", width: 25 }
    if (score === 2) return { label: "Fair", color: "bg-orange-500", width: 50 }
    if (score === 3) return { label: "Good", color: "bg-yellow-500", width: 75 }
    return { label: "Strong", color: "bg-green-500", width: 100 }
  })()

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "delete my account") {
      toast({ title: "Confirmation required", description: 'Please type "delete my account" exactly to confirm', variant: "destructive" })
      return
    }
    if (!deletePassword) {
      toast({ title: "Password required", description: "Please enter your password to confirm account deletion", variant: "destructive" })
      return
    }

    setIsDeletingAccount(true)
    try {
      const response = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ password: deletePassword, confirmationText: deleteConfirmText }),
      })
      const data = await response.json().catch(() => ({ success: false, error: null }))
      if (!data.success) throw new Error(data.error || "Failed to delete account")

      toast({ title: "Account deleted", description: "Your account has been permanently deleted. Redirecting..." })
      setTimeout(() => { router.push("/signup") }, 2000)
    } catch (err: unknown) {
      toast({ title: "Error", description: getErrorMessage(err, "Failed to delete account"), variant: "destructive" })
    } finally {
      setIsDeletingAccount(false)
    }
  }

  const canDeleteAccount = deleteConfirmText === "delete my account" && deletePassword.trim().length > 0

  return (
    <div className="space-y-4">
      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your password to keep your account secure. Choose a strong password that you do not use elsewhere.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {passwordErrors.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
              {passwordErrors.map((error, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="sec-current-password">Current Password</Label>
            <div className="relative">
              <Input
                id="sec-current-password"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                disabled={isSavingPassword}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sec-new-password">New Password</Label>
            <div className="relative">
              <Input
                id="sec-new-password"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordErrors([]) }}
                placeholder="Enter your new password"
                disabled={isSavingPassword}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {newPassword && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${passwordStrength.color} transition-all duration-300 rounded-full`}
                      style={{ width: `${passwordStrength.width}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${
                    passwordStrength.width <= 25 ? "text-red-600" :
                    passwordStrength.width <= 50 ? "text-orange-600" :
                    passwordStrength.width <= 75 ? "text-yellow-600" :
                    "text-green-600"
                  }`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use at least 8 characters with uppercase, lowercase, and numbers.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sec-confirm-password">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="sec-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPasswordErrors([]) }}
                placeholder="Confirm your new password"
                disabled={isSavingPassword}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword && newPassword && confirmPassword !== newPassword && (
              <p className="text-xs text-red-600">Passwords do not match</p>
            )}
            {confirmPassword && newPassword && confirmPassword === newPassword && newPassword.length >= 8 && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Passwords match
              </p>
            )}
          </div>

          <Button
            onClick={handleChangePassword}
            disabled={isSavingPassword || !currentPassword || !newPassword || !confirmPassword}
          >
            {isSavingPassword ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</>
            ) : (
              <><Shield className="mr-2 h-4 w-4" />Update Password</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      {totpStatusLoaded && (
        <TwoFactorSettings
          totpEnabled={totpEnabled}
          onStatusChange={() => setTotpEnabled(!totpEnabled)}
        />
      )}

      {/* Danger Zone */}
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-red-600">
            Irreversible actions that will permanently affect your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showDeleteConfirm ? (
            <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-white">
              <div>
                <h3 className="font-medium text-slate-900">Delete Account</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Delete Account
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> This action cannot be undone. This will permanently delete your account,
                  remove all your data, and you will lose access to all workspaces and organizations you belong to.
                </AlertDescription>
              </Alert>
              <div className="space-y-4 p-4 border border-red-200 rounded-lg bg-white">
                <div className="space-y-2">
                  <Label htmlFor="delete-confirm-text" className="text-sm font-medium">
                    Type &quot;delete my account&quot; to confirm
                  </Label>
                  <Input
                    id="delete-confirm-text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="delete my account"
                    disabled={isDeletingAccount}
                    className="font-mono"
                  />
                  {deleteConfirmText && deleteConfirmText !== "delete my account" && (
                    <p className="text-xs text-red-600">Text does not match. Please type exactly as shown.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delete-password">Confirm your password</Label>
                  <div className="relative">
                    <Input
                      id="delete-password"
                      type={showDeletePassword ? "text" : "password"}
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Enter your password"
                      disabled={isDeletingAccount}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDeletePassword(!showDeletePassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showDeletePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button variant="destructive" onClick={handleDeleteAccount} disabled={!canDeleteAccount || isDeletingAccount} className="gap-2">
                    {isDeletingAccount ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Deleting...</>
                    ) : (
                      <><Trash2 className="h-4 w-4" />Delete My Account</>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); setDeletePassword("") }}
                    disabled={isDeletingAccount}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
