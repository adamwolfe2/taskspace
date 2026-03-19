"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ShieldCheck, ShieldOff, Loader2, Copy, Check, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/utils"

interface TwoFactorSettingsProps {
  totpEnabled: boolean
  onStatusChange: () => void
}

export function TwoFactorSettings({ totpEnabled, onStatusChange }: TwoFactorSettingsProps) {
  const { toast } = useToast()

  // Setup flow state
  const [step, setStep] = useState<"idle" | "scanning" | "verifying" | "backup">("idle")
  const [qrCode, setQrCode] = useState("")
  const [manualSecret, setManualSecret] = useState("")
  const [verifyCode, setVerifyCode] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // Disable flow state
  const [showDisable, setShowDisable] = useState(false)
  const [disablePassword, setDisablePassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isDisabling, setIsDisabling] = useState(false)

  const handleStartSetup = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      setQrCode(data.data.qrCode)
      setManualSecret(data.data.secret)
      setStep("scanning")
    } catch (err: unknown) {
      toast({
        title: "Setup failed",
        description: getErrorMessage(err, "Could not start 2FA setup"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!verifyCode || verifyCode.length < 6) return
    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/2fa/verify-setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ code: verifyCode }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      setBackupCodes(data.data.backupCodes)
      setStep("backup")
      onStatusChange()
      toast({ title: "2FA enabled", description: "Two-factor authentication is now active" })
    } catch (err: unknown) {
      toast({
        title: "Verification failed",
        description: getErrorMessage(err, "Invalid code"),
        variant: "destructive",
      })
      setVerifyCode("")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisable = async () => {
    if (!disablePassword) return
    setIsDisabling(true)
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ password: disablePassword }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      setShowDisable(false)
      setDisablePassword("")
      onStatusChange()
      toast({ title: "2FA disabled", description: "Two-factor authentication has been turned off" })
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to disable 2FA"),
        variant: "destructive",
      })
    } finally {
      setIsDisabling(false)
    }
  }

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({ title: "Copied", description: "Backup codes copied to clipboard" })
  }

  const handleDone = () => {
    setStep("idle")
    setQrCode("")
    setManualSecret("")
    setVerifyCode("")
    setBackupCodes([])
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account using an authenticator app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {totpEnabled && step === "idle" && (
          <>
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <ShieldCheck className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <span className="text-sm text-emerald-800 font-medium">Two-factor authentication is enabled</span>
            </div>

            {!showDisable ? (
              <Button
                variant="outline"
                onClick={() => setShowDisable(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <ShieldOff className="mr-2 h-4 w-4" />
                Disable 2FA
              </Button>
            ) : (
              <div className="space-y-3 p-4 border border-red-200 rounded-lg bg-red-50/50">
                <p className="text-sm text-red-800">Enter your password to disable two-factor authentication.</p>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={isDisabling}
                    className="pr-10"
                    onKeyDown={(e) => e.key === "Enter" && handleDisable()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDisable}
                    disabled={!disablePassword || isDisabling}
                  >
                    {isDisabling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Confirm Disable
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setShowDisable(false); setDisablePassword("") }}
                    disabled={isDisabling}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {!totpEnabled && step === "idle" && (
          <>
            <p className="text-sm text-muted-foreground">
              Protect your account by requiring a verification code from an authenticator app
              (like Google Authenticator, Authy, or 1Password) when you sign in.
            </p>
            <Button onClick={handleStartSetup} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Set Up 2FA
            </Button>
          </>
        )}

        {step === "scanning" && (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Scan this QR code with your authenticator app, then enter the 6-digit code below to verify.
              </AlertDescription>
            </Alert>

            <div className="flex justify-center">
              <Image src={qrCode} alt="2FA QR code" width={192} height={192} className="w-48 h-48 border rounded-lg" unoptimized />
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground">Can&apos;t scan? Enter this code manually:</p>
              <code className="text-sm font-mono bg-slate-100 px-3 py-1 rounded select-all">
                {manualSecret}
              </code>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verify-code">Verification code</Label>
              <Input
                id="verify-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                disabled={isLoading}
                className="text-center text-lg tracking-widest font-mono"
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleVerify} disabled={isLoading || verifyCode.length < 6}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Verify & Enable
              </Button>
              <Button variant="outline" onClick={() => { setStep("idle"); setQrCode(""); setManualSecret(""); setVerifyCode("") }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {step === "backup" && (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                <strong>Save these backup codes!</strong> You can use each code once if you lose access to your authenticator app. Store them securely.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 border rounded-lg font-mono text-sm">
              {backupCodes.map((code, i) => (
                <div key={i} className="px-2 py-1 bg-white rounded border text-center">
                  {code}
                </div>
              ))}
            </div>

            <Button variant="outline" onClick={copyBackupCodes} className="w-full">
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? "Copied!" : "Copy Backup Codes"}
            </Button>

            <Button onClick={handleDone} className="w-full">
              Done
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
