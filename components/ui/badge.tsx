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
