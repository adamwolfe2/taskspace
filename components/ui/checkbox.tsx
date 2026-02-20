'use client'

import * as React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { CheckIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer size-5 shrink-0 rounded-md border-2 border-slate-300 bg-white shadow-sm transition-all duration-200 ease-out outline-none',
        'data-[state=checked]:bg-primary data-[state=checked]:text-white data-[state=checked]:border-primary data-[state=checked]:shadow-md',
        'focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2',
        'hover:border-primary/40',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-red-400',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current animate-in zoom-in-50 duration-150"
      >
        <CheckIcon className="size-3.5 stroke-[3]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
