'use client'

import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  // Always use neutral gray for skeletons — brand theming should not affect loading states
  const gradientStyle = {
    background: `linear-gradient(90deg, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%)`,
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
