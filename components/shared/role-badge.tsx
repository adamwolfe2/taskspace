import { Badge } from "@/components/ui/badge"

interface RoleBadgeProps {
  role: "owner" | "admin" | "member"
}

export function RoleBadge({ role }: RoleBadgeProps) {
  switch (role) {
    case "owner":
      return (
        <Badge variant="default" className="text-xs">
          Owner
        </Badge>
      )
    case "admin":
      return (
        <Badge variant="default" className="text-xs">
          Admin
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary" className="text-xs">
          Member
        </Badge>
      )
  }
}
