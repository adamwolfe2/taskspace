'use client'

import { cn } from '@/lib/utils'
import { useBrandTheme } from '@/lib/contexts/brand-theme-context'
import { adjustOpacity } from '@/lib/utils/color-helpers'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  const { colors } = useBrandTheme()

  // Create subtle shimmer effect with workspace brand colors
  const baseColor = adjustOpacity(colors.primary, 0.1)
  const shimmerColor = adjustOpacity(colors.primary, 0.15)

  const gradientStyle = {
    background: `linear-gradient(90deg, ${baseColor} 0%, ${shimmerColor} 50%, ${baseColor} 100%)`,
    backgroundSize: '200% 100%',
    animation: 'shimmer 2s ease-in-out infinite',
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
        className={cn('rounded-lg', className)}
        style={gradientStyle}
        {...props}
      />
    </>
  )
}

export { Skeleton }
