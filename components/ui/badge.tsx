import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none transition-all duration-200 ease-out overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm',
        secondary:
          'border-transparent bg-slate-100 text-slate-700',
        destructive:
          'border-transparent bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm',
        warning:
          'border-transparent bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-sm',
        success:
          'border-transparent bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm',
        outline:
          'border-slate-200 bg-white text-slate-700 shadow-sm',
        // Soft variants for subtle badges
        'soft-blue':
          'border-transparent bg-blue-50 text-blue-700',
        'soft-emerald':
          'border-transparent bg-emerald-50 text-emerald-700',
        'soft-amber':
          'border-transparent bg-amber-50 text-amber-700',
        'soft-red':
          'border-transparent bg-red-50 text-red-700',
        'soft-slate':
          'border-transparent bg-slate-100 text-slate-600',
        'soft-violet':
          'border-transparent bg-violet-50 text-violet-700',
        // Priority variants with gradient backgrounds
        critical:
          'border-red-200/50 bg-gradient-to-r from-red-50 to-red-100 text-red-700 font-semibold',
        high:
          'border-orange-200/50 bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 font-semibold',
        medium:
          'border-amber-200/50 bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 font-semibold',
        low:
          'border-emerald-200/50 bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 font-semibold',
        // Status variants for rocks/tasks
        'on-track':
          'border-emerald-200/50 bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700',
        'at-risk':
          'border-amber-200/50 bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700',
        blocked:
          'border-red-200/50 bg-gradient-to-r from-red-50 to-red-100 text-red-700',
        completed:
          'border-blue-200/50 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700',
        pending:
          'border-slate-200/50 bg-gradient-to-r from-slate-50 to-slate-100 text-slate-600',
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
