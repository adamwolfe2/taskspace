"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { useApp } from "@/lib/contexts/app-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertCircle, ArrowRight, ShieldCheck, ArrowLeft } from "lucide-react"
import { getErrorMessage } from "@/lib/utils"

export function LoginPage() {
  const { login, verify2FA, setCurrentPage, error, clearError, isLoading, enterDemoMode } = useApp()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [localError, setLocalError] = useState("")

  // 2FA state
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [totpCode, setTotpCode] = useState("")
  const totpInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus TOTP input when 2FA step appears
  useEffect(() => {
    if (pendingUserId) {
      totpInputRef.current?.focus()
    }
  }, [pendingUserId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError("")
    clearError()

    if (!email || !password) {
      setLocalError("Please enter your email and password")
      return
    }

    try {
      const result = await login(email, password)
      if (result?.pendingTwoFactor && result.userId) {
        setPendingUserId(result.userId)
      }
    } catch (err: unknown) {
      setLocalError(getErrorMessage(err, "Login failed"))
    }
  }

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError("")
    clearError()

    if (!totpCode || !pendingUserId) {
      setLocalError("Please enter your verification code")
      return
    }

    try {
      await verify2FA(pendingUserId, totpCode)
    } catch (err: unknown) {
      setLocalError(getErrorMessage(err, "Verification failed"))
      setTotpCode("")
    }
  }

  const handleBack = () => {
    setPendingUserId(null)
    setTotpCode("")
    setLocalError("")
    clearError()
  }

  const displayError = localError || error

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="flex flex-col items-center space-y-2">
            <Image
              src="/taskspace-logo.png"
              alt="Taskspace"
              width={64}
              height={64}
              className="w-16 h-16"
            />
            <h1 className="text-3xl font-bold text-black tracking-tight">Taskspace</h1>
          </div>

          {/* Welcome Text */}
          <div className="text-center space-y-2">
            {pendingUserId ? (
              <>
                <div className="flex justify-center">
                  <div className="rounded-full bg-black/5 p-3">
                    <ShieldCheck className="h-6 w-6 text-black" />
                  </div>
                </div>
                <h2 className="text-2xl font-semibold text-black">Two-factor authentication</h2>
                <p className="text-slate-500">Enter the 6-digit code from your authenticator app, or use a backup code</p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-semibold text-black">Welcome back</h2>
                <p className="text-slate-500">Sign in to your account to continue</p>
              </>
            )}
          </div>

          {/* Error Alert */}
          {displayError && (
            <div className="p-4 bg-black text-white rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{displayError}</p>
            </div>
          )}

          {pendingUserId ? (
            /* 2FA Code Entry */
            <form onSubmit={handle2FASubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="totp-code" className="text-sm font-medium text-black">
                  Verification code
                </Label>
                <Input
                  ref={totpInputRef}
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  maxLength={8}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/[^a-fA-F0-9]/g, ""))}
                  disabled={isLoading}
                  className="h-11 bg-white border-slate-200 focus:border-black focus:ring-black text-black placeholder:text-slate-400 text-center text-lg tracking-widest font-mono"
                />
                <p className="text-xs text-slate-400">Enter 6-digit TOTP code or 8-character backup code</p>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-black hover:bg-slate-800 text-white font-medium transition-colors"
                disabled={isLoading || totpCode.length < 6}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify"
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-slate-500 hover:text-black"
                onClick={handleBack}
                disabled={isLoading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Button>
            </form>
          ) : (
            /* Standard Login Form */
            <>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-black">
                      Email address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      autoComplete="email"
                      className="h-11 bg-white border-slate-200 focus:border-black focus:ring-black text-black placeholder:text-slate-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-sm font-medium text-black">
                        Password
                      </Label>
                      <button
                        type="button"
                        onClick={() => setCurrentPage("forgot-password")}
                        className="text-sm text-slate-600 hover:text-black transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      autoComplete="current-password"
                      className="h-11 bg-white border-slate-200 focus:border-black focus:ring-black text-black placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-black hover:bg-slate-800 text-white font-medium transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-500">Or</span>
                </div>
              </div>

              {/* Demo Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 border-slate-200 hover:bg-slate-50 text-black font-medium"
                onClick={enterDemoMode}
                disabled={isLoading}
              >
                View Demo
              </Button>

              {/* Sign Up Link */}
              <p className="text-center text-sm text-slate-600">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setCurrentPage("register")}
                  className="text-black font-semibold hover:underline"
                >
                  Create account
                </button>
              </p>
            </>
          )}
        </div>
      </div>

      {/* Right Side - Feature Highlight */}
      <div className="hidden lg:flex flex-1 bg-black text-white p-12 items-center justify-center">
        <div className="max-w-lg space-y-8">
          <div className="space-y-4">
            <div className="inline-block px-3 py-1 bg-white/10 rounded-full text-sm font-medium">
              EOS Operating System
            </div>
            <h2 className="text-4xl font-bold leading-tight">
              Run your business with clarity and focus
            </h2>
            <p className="text-lg text-slate-300">
              Taskspace brings the power of EOS to your team with EOD reports,
              quarterly rocks, and AI-powered insights.
            </p>
          </div>

          <div className="space-y-4 pt-8">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 bg-black rounded-full" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Daily EOD Reports</h3>
                <p className="text-slate-400 text-sm">Track progress and blockers with AI-powered insights</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 bg-black rounded-full" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Quarterly Rocks</h3>
                <p className="text-slate-400 text-sm">Set and track your most important goals</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 bg-black rounded-full" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Team Alignment</h3>
                <p className="text-slate-400 text-sm">Keep everyone focused on what matters most</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
