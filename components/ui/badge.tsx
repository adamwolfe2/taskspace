import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-all duration-200 ease-out overflow-hidden',
  {
    variants: {
      variant: {
        // Primary brand variant (red)
        default:
          'border-transparent bg-red-600 text-white shadow-sm',
        primary:
          'border-transparent bg-red-600 text-white shadow-sm',
        secondary:
          'border-transparent bg-gray-100 text-gray-700',
        destructive:
          'border-transparent bg-red-600 text-white shadow-sm',
        warning:
          'border-transparent bg-amber-500 text-white shadow-sm',
        success:
          'border-transparent bg-emerald-500 text-white shadow-sm',
        info:
          'border-transparent bg-blue-500 text-white shadow-sm',
        outline:
          'border-gray-200 bg-white text-gray-700 shadow-sm',
        // Soft variants for subtle badges (consistent styling)
        'soft-red':
          'border-transparent bg-red-50 text-red-700',
        'soft-blue':
          'border-transparent bg-blue-50 text-blue-700',
        'soft-emerald':
          'border-transparent bg-emerald-50 text-emerald-700',
        'soft-green':
          'border-transparent bg-green-50 text-green-700',
        'soft-amber':
          'border-transparent bg-amber-50 text-amber-700',
        'soft-yellow':
          'border-transparent bg-yellow-50 text-yellow-700',
        'soft-slate':
          'border-transparent bg-gray-100 text-gray-600',
        'soft-gray':
          'border-transparent bg-gray-100 text-gray-600',
        'soft-violet':
          'border-transparent bg-violet-50 text-violet-700',
        'soft-purple':
          'border-transparent bg-purple-50 text-purple-700',
        // Priority variants
        critical:
          'border-red-200 bg-red-50 text-red-700 font-semibold',
        high:
          'border-orange-200 bg-orange-50 text-orange-700 font-semibold',
        medium:
          'border-amber-200 bg-amber-50 text-amber-700 font-semibold',
        low:
          'border-green-200 bg-green-50 text-green-700 font-semibold',
        // Status variants for rocks/tasks
        'on-track':
          'border-green-200 bg-green-50 text-green-700',
        'at-risk':
          'border-amber-200 bg-amber-50 text-amber-700',
        blocked:
          'border-red-200 bg-red-50 text-red-700',
        completed:
          'border-blue-200 bg-blue-50 text-blue-700',
        pending:
          'border-gray-200 bg-gray-50 text-gray-600',
        active:
          'border-green-200 bg-green-50 text-green-700',
        inactive:
          'border-gray-200 bg-gray-100 text-gray-500',
        // Role badges
        owner:
          'border-amber-200 bg-amber-50 text-amber-700 font-semibold',
        admin:
          'border-blue-200 bg-blue-50 text-blue-700 font-semibold',
        member:
          'border-gray-200 bg-gray-50 text-gray-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
