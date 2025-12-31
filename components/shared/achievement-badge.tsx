"use client"

import { cn } from "@/lib/utils"
import {
 Flame,
 Trophy,
 Star,
 CheckCircle2,
 Target,
 Calendar,
 Sunrise,
 Clock,
 Brain,
 Crown,
 Footprints,
 Mountain,
 CalendarCheck,
} from "lucide-react"
import {
 Tooltip,
 TooltipContent,
 TooltipProvider,
 TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Achievement, UserAchievement } from "@/lib/types"

const iconMap: Record<string, React.ElementType> = {
 flame: Flame,
 trophy: Trophy,
 star: Star,
 "check-circle": CheckCircle2,
 "check-circle-2": CheckCircle2,
 target: Target,
 calendar: Calendar,
 sunrise: Sunrise,
 clock: Clock,
 brain: Brain,
 crown: Crown,
 footprints: Footprints,
 mountain: Mountain,
 "calendar-check": CalendarCheck,
}

interface AchievementBadgeProps {
 achievement: Achievement
 earned?: boolean
 earnedAt?: string
 progress?: number
 size?: "sm" | "md" | "lg"
 showTooltip?: boolean
 className?: string
}

export function AchievementBadge({
 achievement,
 earned = false,
 earnedAt,
 progress,
 size = "md",
 showTooltip = true,
 className,
}: AchievementBadgeProps) {
 const Icon = iconMap[achievement.icon] || Star

 const sizeClasses = {
 sm: "h-8 w-8",
 md: "h-12 w-12",
 lg: "h-16 w-16",
 }

 const iconSizes = {
 sm: "h-4 w-4",
 md: "h-6 w-6",
 lg: "h-8 w-8",
 }

 const badge = (
 <div
 className={cn(
 "relative rounded-full flex items-center justify-center transition-all",
 sizeClasses[size],
 earned
 ? `bg-gradient-to-br from-amber-100 to-amber-200   ring-2 ring-amber-400 shadow-lg`
 : "bg-slate-100  ring-1 ring-slate-200  opacity-50",
 className
 )}
 >
 <Icon
 className={cn(
 iconSizes[size],
 earned ? achievement.badgeColor : "text-slate-400 "
 )}
 />
 {earned && size !== "sm" && (
 <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full flex items-center justify-center ring-2 ring-white ">
 <CheckCircle2 className="h-3 w-3 text-white" />
 </div>
 )}
 {!earned && progress !== undefined && progress > 0 && (
 <svg
 className="absolute inset-0"
 viewBox="0 0 36 36"
 >
 <circle
 cx="18"
 cy="18"
 r="16"
 fill="none"
 stroke="currentColor"
 strokeWidth="2"
 className="text-slate-200 "
 />
 <circle
 cx="18"
 cy="18"
 r="16"
 fill="none"
 stroke="currentColor"
 strokeWidth="2"
 strokeDasharray={`${progress} 100`}
 strokeLinecap="round"
 className="text-amber-500 transform -rotate-90 origin-center"
 />
 </svg>
 )}
 </div>
 )

 if (!showTooltip) return badge

 return (
 <TooltipProvider>
 <Tooltip>
 <TooltipTrigger asChild>{badge}</TooltipTrigger>
 <TooltipContent side="top" className="max-w-xs">
 <div className="space-y-1">
 <p className="font-semibold">{achievement.name}</p>
 {achievement.description && (
 <p className="text-xs text-slate-500 ">
 {achievement.description}
 </p>
 )}
 {earned && earnedAt && (
 <p className="text-xs text-green-600 ">
 Earned {new Date(earnedAt).toLocaleDateString()}
 </p>
 )}
 {!earned && progress !== undefined && (
 <p className="text-xs text-slate-500">
 Progress: {progress}%
 </p>
 )}
 <p className="text-xs text-amber-600 ">
 {achievement.points} points
 </p>
 </div>
 </TooltipContent>
 </Tooltip>
 </TooltipProvider>
 )
}

// Grid of achievements
interface AchievementGridProps {
 achievements: Achievement[]
 userAchievements: UserAchievement[]
 size?: "sm" | "md" | "lg"
 className?: string
}

export function AchievementGrid({
 achievements,
 userAchievements,
 size = "md",
 className,
}: AchievementGridProps) {
 const earnedMap = new Map(
 userAchievements.map((ua) => [ua.achievementId, ua])
 )

 return (
 <div className={cn("flex flex-wrap gap-3", className)}>
 {achievements.map((achievement) => {
 const userAchievement = earnedMap.get(achievement.id)
 return (
 <AchievementBadge
 key={achievement.id}
 achievement={achievement}
 earned={!!userAchievement}
 earnedAt={userAchievement?.earnedAt}
 progress={userAchievement?.progress}
 size={size}
 />
 )
 })}
 </div>
 )
}

// Compact achievement display for profiles
export function AchievementSummary({
 achievements,
 userAchievements,
 maxDisplay = 5,
 className,
}: AchievementGridProps & { maxDisplay?: number }) {
 const earnedAchievements = userAchievements
 .filter((ua) => ua.achievementId)
 .sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())
 .slice(0, maxDisplay)

 const achievementMap = new Map(achievements.map((a) => [a.id, a]))
 const totalPoints = userAchievements.reduce((sum, ua) => {
 const achievement = achievementMap.get(ua.achievementId)
 return sum + (achievement?.points || 0)
 }, 0)

 return (
 <div className={cn("flex items-center gap-3", className)}>
 <div className="flex -space-x-2">
 {earnedAchievements.map((ua) => {
 const achievement = achievementMap.get(ua.achievementId)
 if (!achievement) return null
 return (
 <AchievementBadge
 key={ua.id}
 achievement={achievement}
 earned
 earnedAt={ua.earnedAt}
 size="sm"
 />
 )
 })}
 </div>
 {earnedAchievements.length > 0 && (
 <div className="text-sm">
 <span className="font-semibold text-amber-600 ">
 {totalPoints.toLocaleString()}
 </span>
 <span className="text-slate-500 "> pts</span>
 </div>
 )}
 </div>
 )
}

// New achievement unlocked notification
export function AchievementUnlockedBanner({
 achievement,
 onDismiss,
 className,
}: {
 achievement: Achievement
 onDismiss: () => void
 className?: string
}) {
 return (
 <div
 className={cn(
 "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl shadow-2xl animate-slide-up",
 className
 )}
 >
 <AchievementBadge achievement={achievement} earned size="lg" showTooltip={false} />
 <div>
 <p className="text-sm font-medium opacity-90">Achievement Unlocked!</p>
 <p className="text-lg font-bold">{achievement.name}</p>
 <p className="text-sm opacity-75">+{achievement.points} points</p>
 </div>
 <button
 onClick={onDismiss}
 className="ml-4 p-2 hover:bg-white/20 rounded-full transition-colors"
 >
 ×
 </button>
 </div>
 )
}
