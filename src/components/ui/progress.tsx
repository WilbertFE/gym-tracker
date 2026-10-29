"use client"

import * as React from "react"
import { cn } from "cn"
import { Progress as ProgressPrimitive } from "radix-ui"

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative flex h-1.5 w-full items-center overflow-x-hidden rounded-none bg-intensity-none",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="size-full flex-1 border-r-2 border-white/70 bg-primary shadow-[0_0_10px_var(--primary)] transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
