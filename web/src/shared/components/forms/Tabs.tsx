import type { ReactNode } from 'react'
import * as RadixTabs from '@radix-ui/react-tabs'

export interface TabItem<T extends string> {
  value: T
  label: string
  count?: number
  content: ReactNode
}

interface Props<T extends string> {
  value: T
  onChange: (value: T) => void
  tabs: Array<TabItem<T>>
}

/** The app's tabs: Radix Tabs in the app's colors, with arrow-key navigation built in. */
export default function Tabs<T extends string>({ value, onChange, tabs }: Props<T>) {
  return (
    <RadixTabs.Root value={value} onValueChange={v => onChange(v as T)}>
      <RadixTabs.List className="mb-4 flex gap-1 border-b border-midnight-700">
        {tabs.map(t => (
          <RadixTabs.Trigger
            key={t.value}
            value={t.value}
            className="-mb-px border-b-2 border-transparent px-4 py-2 text-sm font-medium text-midnight-400 outline-none transition-colors hover:text-white focus-visible:text-white data-[state=active]:border-accent data-[state=active]:text-white"
          >
            {t.label}
            {t.count !== undefined && <span className="ml-2 text-xs text-midnight-500">{t.count}</span>}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {tabs.map(t => (
        <RadixTabs.Content key={t.value} value={t.value} className="space-y-4 outline-none">
          {t.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  )
}
