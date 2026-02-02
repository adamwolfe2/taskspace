"use client"

import { useState } from "react"
import Image from "next/image"
import { useApp } from "@/lib/contexts/app-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertCircle, ArrowRight, Check } from "lucide-react"
import { getErrorMessage } from "@/lib/utils"

export function RegisterPage() {
  const { register, setCurrentPage, error, clearError, isLoading } = useApp()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [organizationName, setOrganizationName] = useState("")
  const [localError, setLocalError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError("")
    clearError()

    if (!name || !email || !password) {
      setLocalError("Please fill in all required fields")
      return
    }

    if (password !== confirmPassword) {
      setLocalError("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters")
      return
    }

    try {
      await register(email, password, name, organizationName || undefined)
    } catch (err: unknown) {
      setLocalError(getErrorMessage(err, "Registration failed"))
    }
  }

  const displayError = localError || error

  const passwordRequirements = [
    { met: password.length >= 8, text: "At least 8 characters" },
    { met: /[A-Z]/.test(password), text: "One uppercase letter" },
    { met: /[a-z]/.test(password), text: "One lowercase letter" },
    { met: /[0-9]/.test(password), text: "One number" },
  ]

  const allRequirementsMet = passwordRequirements.every(r => r.met)

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Registration Form */}
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
            <h2 className="text-2xl font-semibold text-black">Create your account</h2>
            <p className="text-gray-500">Get started with your team in minutes</p>
          </div>

          {/* Error Alert */}
          {displayError && (
            <div className="p-4 bg-black text-white rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{displayError}</p>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-black">
                  Full name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  autoComplete="name"
                  className="h-11 bg-white border-gray-200 focus:border-black focus:ring-black text-black placeholder:text-gray-400"
                />
              </div>

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

              <div className="space-y-2">
                <Label htmlFor="organizationName" className="text-sm font-medium text-black">
                  Organization name <span className="text-gray-400">(optional)</span>
                </Label>
                <Input
                  id="organizationName"
                  type="text"
                  placeholder="Your company name"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  disabled={isLoading}
                  className="h-11 bg-white border-gray-200 focus:border-black focus:ring-black text-black placeholder:text-gray-400"
                />
                <p className="text-xs text-gray-500">
                  Leave blank if joining via invitation
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-black">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="h-11 bg-white border-gray-200 focus:border-black focus:ring-black text-black placeholder:text-gray-400"
                />
                {password && (
                  <div className="mt-3 space-y-2">
                    {passwordRequirements.map((req, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-2 text-xs ${
                          req.met ? "text-black" : "text-gray-400"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          req.met ? "bg-black border-black" : "border-gray-300"
                        }`}>
                          {req.met && <Check className="h-2.5 w-2.5 text-white" />}
                        </div>
                        <span>{req.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-black">
                  Confirm password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="h-11 bg-white border-gray-200 focus:border-black focus:ring-black text-black placeholder:text-gray-400"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-black hover:bg-gray-800 text-white font-medium transition-colors"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <p className="text-xs text-center text-gray-500 leading-relaxed">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </p>
          </form>

          {/* Sign In Link */}
          <p className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => setCurrentPage("login")}
              className="text-black font-semibold hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>

      {/* Right Side - Feature Highlight */}
      <div className="hidden lg:flex flex-1 bg-black text-white p-12 items-center justify-center">
        <div className="max-w-lg space-y-8">
          <div className="space-y-4">
            <div className="inline-block px-3 py-1 bg-white/10 rounded-full text-sm font-medium">
              Get started in minutes
            </div>
            <h2 className="text-4xl font-bold leading-tight">
              Everything your team needs to stay aligned
            </h2>
            <p className="text-lg text-gray-300">
              Join teams using Taskspace to run their business with the EOS framework
            </p>
          </div>

          <div className="space-y-6 pt-8">
            <div className="border-l-2 border-white/20 pl-6 space-y-2">
              <h3 className="font-semibold text-lg">Free to start</h3>
              <p className="text-gray-400">Get up to 5 team members on the free plan</p>
            </div>

            <div className="border-l-2 border-white/20 pl-6 space-y-2">
              <h3 className="font-semibold text-lg">No credit card required</h3>
              <p className="text-gray-400">Start using Taskspace immediately after signup</p>
            </div>

            <div className="border-l-2 border-white/20 pl-6 space-y-2">
              <h3 className="font-semibold text-lg">AI-powered insights</h3>
              <p className="text-gray-400">Get intelligent suggestions and automated reports</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
