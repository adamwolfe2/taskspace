'use client'

import { cn } from '@/lib/utils'
import { useBrandTheme } from '@/lib/contexts/brand-theme-context'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  const { colors } = useBrandTheme()

  // Create gradient from brand colors
  const gradientStyle = {
    background: `linear-gradient(90deg, ${colors.primary} 0%, ${colors.accent} 50%, ${colors.primary} 100%)`,
    backgroundSize: '200% 100%',
    animation: 'shimmer 2s infinite',
  }

  return (
    <>
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
      <div
        data-slot="skeleton"
        className={cn('rounded-md opacity-20', className)}
        style={gradientStyle}
        {...props}
      />
    </>
  )
}

export { Skeleton }
