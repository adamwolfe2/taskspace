import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-2 text-base shadow-sm transition-all duration-200 ease-out outline-none md:text-sm',
        'placeholder:text-slate-400',
        'file:text-slate-700 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-500/10 focus-visible:shadow-md',
        'hover:border-slate-300',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
        'aria-invalid:ring-red-500/20 aria-invalid:border-red-400',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
