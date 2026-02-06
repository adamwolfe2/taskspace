'use client'

import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  // Use default shimmer effect (removed brand theming to avoid provider requirement)
  const gradientStyle = {
    background: `linear-gradient(90deg, hsl(var(--muted)) 0%, hsl(var(--muted) / 0.8) 50%, hsl(var(--muted)) 100%)`,
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
