import Image from "next/image"
import { cn } from "@/lib/utils"

interface IntegrationLogoProps {
  integration: "asana" | "google-calendar" | "slack" | "stripe" | "resend" | "claude"
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

const sizeMap = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
}

const logoConfig = {
  asana: {
    src: "/logos/integrations/asana.jpg",
    alt: "Asana",
  },
  "google-calendar": {
    src: "/logos/integrations/google-calendar.png",
    alt: "Google Calendar",
  },
  slack: {
    src: "/logos/integrations/slack.png",
    alt: "Slack",
  },
  stripe: {
    src: "/logos/integrations/stripe.png",
    alt: "Stripe",
  },
  resend: {
    src: "/logos/integrations/resend.png",
    alt: "Resend",
  },
  claude: {
    src: "/logos/integrations/claude.png",
    alt: "Claude AI",
  },
}

export function IntegrationLogo({ integration, size = "md", className }: IntegrationLogoProps) {
  const config = logoConfig[integration]
  const pixelSize = sizeMap[size]

  return (
    <Image
      src={config.src}
      alt={config.alt}
      width={pixelSize}
      height={pixelSize}
      className={cn("object-contain", className)}
      priority={false}
    />
  )
}
