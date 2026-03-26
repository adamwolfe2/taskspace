import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 sm:px-4 py-2.5 text-sm shadow-sm transition-all duration-150 ease-out outline-none',
        'placeholder:text-slate-400',
        'file:text-slate-700 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:shadow-md',
        'hover:border-primary/30',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
        'aria-invalid:ring-red-500/20 aria-invalid:border-red-400',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
