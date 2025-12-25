interface ProgressBarProps {
  value: number
  status?: "on-track" | "at-risk" | "blocked" | "completed"
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
}

export function ProgressBar({ value, status = "on-track", showLabel = true, size = "md" }: ProgressBarProps) {
  const heightClasses = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3",
  }

  const colorClasses = {
    "on-track": "bg-success",
    "at-risk": "bg-warning",
    blocked: "bg-destructive",
    completed: "bg-primary",
  }

  return (
    <div className="w-full">
      <div className={`w-full bg-muted rounded-full overflow-hidden ${heightClasses[size]}`}>
        <div
          className={`${colorClasses[status]} ${heightClasses[size]} rounded-full transition-all duration-300`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      {showLabel && <p className="text-xs text-muted-foreground mt-1">{value}% complete</p>}
    </div>
  )
}
