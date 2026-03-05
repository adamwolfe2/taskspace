"use client"

import React, { useState, useRef } from "react"
import { useApp } from "@/lib/contexts/app-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { User, Mail, Loader2, Check, Upload, Camera } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/utils"

export function ProfileSettingsTab() {
  const { currentUser, refreshSession } = useApp()
  const { toast } = useToast()

  // Profile state
  const [name, setName] = useState(currentUser?.name || "")
  const [email] = useState(currentUser?.email || "")
  const [jobTitle, setJobTitle] = useState(currentUser?.jobTitle || "")
  const [department, setDepartment] = useState(currentUser?.department || "")
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(currentUser?.avatar)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const getInitials = (fullName: string) => {
    return fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPG, or GIF)",
        variant: "destructive",
      })
      return
    }

    if (file.size > 500 * 1024) {
      toast({
        title: "File too large",
        description: "Avatar image must be less than 500KB. Try a smaller image or resize it first.",
        variant: "destructive",
      })
      return
    }

    setIsUploadingAvatar(true)
    try {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        setAvatarPreview(base64)
        setIsUploadingAvatar(false)
      }
      reader.onerror = () => {
        toast({
          title: "Upload failed",
          description: "Could not read the image file. Please try again.",
          variant: "destructive",
        })
        setIsUploadingAvatar(false)
      }
      reader.readAsDataURL(file)
    } catch {
      setIsUploadingAvatar(false)
    }
  }

  const handleRemoveAvatar = () => {
    setAvatarPreview(undefined)
    if (avatarInputRef.current) {
      avatarInputRef.current.value = ""
    }
  }

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your display name",
        variant: "destructive",
      })
      return
    }

    setIsSavingProfile(true)
    try {
      const response = await fetch("/api/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          memberId: currentUser?.id,
          name: name.trim(),
          jobTitle: jobTitle.trim() || null,
          department: department.trim() || null,
          avatar: avatarPreview || null,
        }),
      })

      const data = await response.json().catch(() => ({ success: false, error: null }))
      if (!data.success) {
        throw new Error(data.error || "Failed to save profile")
      }

      await refreshSession()

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      })
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to save profile"),
        variant: "destructive",
      })
    } finally {
      setIsSavingProfile(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Manage your personal details and how you appear to your team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar Section */}
          <div className="flex items-start gap-6">
            <div className="relative group">
              <Avatar className="h-20 w-20 border-2 border-slate-200">
                <AvatarImage src={avatarPreview} alt={name || "User avatar"} />
                <AvatarFallback className="bg-slate-700 text-white text-xl font-semibold">
                  {getInitials(name || "?")}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                disabled={isUploadingAvatar}
                aria-label="Upload profile photo"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {avatarPreview ? "Change Photo" : "Upload Photo"}
                </Button>
                {avatarPreview && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveAvatar}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, or GIF. Max 500KB. A square image works best.
              </p>
            </div>
          </div>

          <Separator />

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="profile-name">Display Name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              disabled={isSavingProfile}
            />
            <p className="text-xs text-muted-foreground">
              This is how your name appears to other team members across the platform.
            </p>
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="profile-email">Email Address</Label>
            <div className="flex items-center gap-2">
              <Input
                id="profile-email"
                value={email}
                disabled
                className="bg-muted"
              />
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
            <p className="text-xs text-muted-foreground">
              Your email address is used for login and cannot be changed here. Contact your administrator if you need to update it.
            </p>
          </div>

          {/* Job Title */}
          <div className="space-y-2">
            <Label htmlFor="profile-job-title">Job Title</Label>
            <Input
              id="profile-job-title"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g., Product Manager, Software Engineer"
              disabled={isSavingProfile}
            />
            <p className="text-xs text-muted-foreground">
              Your role or position within the organization.
            </p>
          </div>

          {/* Department */}
          <div className="space-y-2">
            <Label htmlFor="profile-department">Department</Label>
            <Input
              id="profile-department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g., Engineering, Marketing, Operations"
              disabled={isSavingProfile}
            />
            <p className="text-xs text-muted-foreground">
              The team or department you belong to.
            </p>
          </div>

          <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
            {isSavingProfile ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Save Profile
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">Role</p>
              <p className="capitalize">{currentUser?.role || "Member"}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Member Since</p>
              <p>{currentUser?.joinDate ? new Date(currentUser.joinDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "N/A"}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Status</p>
              <p className="capitalize">{currentUser?.status || "Active"}</p>
            </div>
            {currentUser?.lastActive && (
              <div>
                <p className="font-medium text-muted-foreground">Last Active</p>
                <p>{new Date(currentUser.lastActive).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
