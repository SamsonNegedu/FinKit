import { Layers, List } from 'lucide-react'
import SegmentedControl from '@/shared/components/forms/SegmentedControl'

type Mode = 'list' | 'merchant'

/** Switches between one row per transaction and rows grouped by merchant. */
export default function ViewToggle({ value, onChange }: { value: Mode; onChange: (mode: Mode) => void }) {
  return (
    <SegmentedControl
      variant="track"
      ariaLabel="View"
      value={value}
      onChange={onChange}
      options={[
        { value: 'list', label: 'List', icon: <List className="h-3.5 w-3.5" />, iconOnlyOnPhone: true },
        { value: 'merchant', label: 'By merchant', icon: <Layers className="h-3.5 w-3.5" />, iconOnlyOnPhone: true },
      ]}
    />
  )
}
