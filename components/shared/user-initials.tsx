interface UserInitialsProps {
  name: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function UserInitials({ name, size = "md", className = "" }: UserInitialsProps) {
  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-16 h-16 text-xl",
  }

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium ${className}`}
    >
      {initials}
    </div>
  )
}
