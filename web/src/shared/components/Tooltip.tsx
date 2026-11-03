import type { ReactNode } from 'react'
import * as RadixTooltip from '@radix-ui/react-tooltip'

/** Wrap the whole app once: it sets how long to wait before a tooltip appears, and how fast the next one follows. */
export const TooltipProvider = ({ children }: { children: ReactNode }) => (
  <RadixTooltip.Provider delayDuration={300} skipDelayDuration={150}>
    {children}
  </RadixTooltip.Provider>
)

/**
 * A short hint for the one element inside. Unlike the browser's `title`, it also shows when the element gets the
 * keyboard focus, and looks like the rest of the app. It only describes: an icon-only button still needs its own
 * `aria-label`. Hints on touch screens appear on a long press of the focus, not by hover, so never put anything
 * essential in one.
 */
export default function Tooltip({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          sideOffset={6}
          collisionPadding={8}
          className="z-[90] max-w-xs rounded-md border border-line-strong bg-midnight-800 px-2.5 py-1.5 text-xs text-midnight-100 shadow-xl"
        >
          {label}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  )
}
