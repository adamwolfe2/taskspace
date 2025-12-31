"use client"

import { cn } from "@/lib/utils"

interface ProgressRingProps {
 progress: number // 0-100
 size?: number
 strokeWidth?: number
 className?: string
 showPercentage?: boolean
 color?: string
 trackColor?: string
 animated?: boolean
}

export function ProgressRing({
 progress,
 size = 80,
 strokeWidth = 8,
 className,
 showPercentage = true,
 color,
 trackColor = "stroke-slate-200 ",
 animated = true,
}: ProgressRingProps) {
 const normalizedProgress = Math.min(100, Math.max(0, progress))
 const radius = (size - strokeWidth) / 2
 const circumference = radius * 2 * Math.PI
 const offset = circumference - (normalizedProgress / 100) * circumference

 // Determine color based on progress if not provided
 const progressColor = color || getProgressColor(normalizedProgress)

 return (
 <div className={cn("relative inline-flex items-center justify-center", className)}>
 <svg
 width={size}
 height={size}
 className="transform -rotate-90"
 >
 {/* Background track */}
 <circle
 cx={size / 2}
 cy={size / 2}
 r={radius}
 fill="none"
 strokeWidth={strokeWidth}
 className={trackColor}
 />
 {/* Progress arc */}
 <circle
 cx={size / 2}
 cy={size / 2}
 r={radius}
 fill="none"
 strokeWidth={strokeWidth}
 strokeLinecap="round"
 className={cn(progressColor, animated && "transition-all duration-500 ease-out")}
 style={{
 strokeDasharray: circumference,
 strokeDashoffset: offset,
 }}
 />
 </svg>
 {showPercentage && (
 <div className="absolute inset-0 flex items-center justify-center">
 <span className="text-sm font-semibold text-slate-700 ">
 {Math.round(normalizedProgress)}%
 </span>
 </div>
 )}
 </div>
 )
}

function getProgressColor(progress: number): string {
 if (progress >= 100) return "stroke-green-500"
 if (progress >= 75) return "stroke-emerald-500"
 if (progress >= 50) return "stroke-blue-500"
 if (progress >= 25) return "stroke-amber-500"
 return "stroke-red-500"
}

// Mini progress ring for compact displays
export function MiniProgressRing({
 progress,
 size = 32,
 strokeWidth = 4,
 className,
}: Omit<ProgressRingProps, "showPercentage">) {
 return (
 <ProgressRing
 progress={progress}
 size={size}
 strokeWidth={strokeWidth}
 showPercentage={false}
 className={className}
 />
 )
}

// Progress ring with label below
export function LabeledProgressRing({
 progress,
 label,
 sublabel,
 size = 100,
 strokeWidth = 10,
 className,
}: ProgressRingProps & { label?: string; sublabel?: string }) {
 return (
 <div className={cn("flex flex-col items-center gap-2", className)}>
 <ProgressRing
 progress={progress}
 size={size}
 strokeWidth={strokeWidth}
 showPercentage={true}
 />
 {label && (
 <div className="text-center">
 <p className="text-sm font-medium text-slate-700 ">{label}</p>
 {sublabel && (
 <p className="text-xs text-slate-500 ">{sublabel}</p>
 )}
 </div>
 )}
 </div>
 )
}

// Animated progress ring that fills on mount
export function AnimatedProgressRing({
 progress,
 delay = 0,
 ...props
}: ProgressRingProps & { delay?: number }) {
 return (
 <ProgressRing
 {...props}
 progress={progress}
 animated
 className={cn(props.className, "opacity-0 animate-fade-in")}
 style={{
 animationDelay: `${delay}ms`,
 animationFillMode: "forwards",
 } as React.CSSProperties}
 />
 )
}
