import * as React from "react"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipArrow } from "./Tooltip"
import { cn } from "../../lib/utils"

interface TooltipWrapperProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  delayDuration?: number
  skipDelayDuration?: number
  className?: string
  contentClassName?: string
  showArrow?: boolean
  disabled?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  sideOffset?: number
  alignOffset?: number
  maxWidth?: number
  avoidCollisions?: boolean
  collisionBoundary?: Element | null
  collisionPadding?: number
  sticky?: "partial" | "always"
}

const TooltipWrapper = React.forwardRef<
  React.ElementRef<typeof TooltipTrigger>,
  TooltipWrapperProps
>(({
  content,
  children,
  side = "top",
  align = "center",
  delayDuration = 400,
  skipDelayDuration = 300,
  className,
  contentClassName,
  showArrow = true,
  disabled = false,
  open,
  onOpenChange,
  sideOffset = 4,
  alignOffset = 0,
  maxWidth = 300,
  avoidCollisions = true,
  collisionBoundary,
  collisionPadding = 10,
  sticky = "partial",
  ...props
}, ref) => {
  // Don't render tooltip if disabled or no content
  if (disabled || !content) {
    return <>{children}</>
  }

  return (
    <Tooltip
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      open={open}
      onOpenChange={onOpenChange}
    >
      <TooltipTrigger
        ref={ref}
        className={cn("cursor-help", className)}
        asChild
        {...props}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        avoidCollisions={avoidCollisions}
        collisionBoundary={collisionBoundary}
        collisionPadding={collisionPadding}
        sticky={sticky}
        className={cn(
          "max-w-xs break-words leading-relaxed",
          contentClassName
        )}
        style={{ maxWidth }}
      >
        {content}
        {showArrow && <TooltipArrow />}
      </TooltipContent>
    </Tooltip>
  )
})
TooltipWrapper.displayName = "TooltipWrapper"

export { TooltipWrapper }
export type { TooltipWrapperProps }