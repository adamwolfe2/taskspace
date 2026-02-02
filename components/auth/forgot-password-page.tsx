"use client"

import { useState } from "react"
import Image from "next/image"
import { useApp } from "@/lib/contexts/app-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react"

export function ForgotPasswordPage() {
  const { setCurrentPage } = useApp()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email) {
      setError("Please enter your email address")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.status === 429) {
        setError(data.error || "Too many attempts. Please try again later.")
        return
      }

      // Always show success to prevent email enumeration
      setSuccess(true)
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-black">Check your email</h2>
              <p className="text-gray-500">
                If an account exists for <span className="font-medium text-black">{email}</span>,
                we've sent a password reset link.
              </p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">
              The link will expire in 1 hour. Check your spam folder if you don't see it.
            </p>
          </div>

          <Button
            variant="outline"
            className="w-full h-11 border-gray-200 hover:bg-gray-50 text-black font-medium"
            onClick={() => setCurrentPage("login")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
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

        {/* Title */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-black">Forgot password?</h2>
          <p className="text-gray-500">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-black text-white rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
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
              className="h-11 bg-white border-gray-200 focus:border-black focus:ring-black text-black placeholder:text-gray-400"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-black hover:bg-gray-800 text-white font-medium transition-colors"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending link...
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>

        {/* Back to Login */}
        <button
          type="button"
          onClick={() => setCurrentPage("login")}
          className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-black transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </button>
      </div>
    </div>
  )
}
