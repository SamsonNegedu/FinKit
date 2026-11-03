import { useState } from 'react'
import Select from '@/shared/components/forms/Select'
import { useTripSubcategories } from '../hooks/trips-queries'

const NONE = ''
const NEW = '__new'

/**
 * Optional detail inside a category: Flight inside Transport, Dinner inside Food & drink. The suggestions
 * come from the server, and one typed here is remembered once a cost uses it.
 */
export default function SubcategoryPicker({
  category,
  value,
  onChange,
}: {
  category: string
  value: string
  onChange: (s: string) => void
}) {
  const { data: all = {} } = useTripSubcategories()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const known = all[category] ?? []
  // A value from an older cost or another spelling still shows, even when it is not in the list
  const options = value && !known.includes(value) ? [...known, value] : known

  const submit = () => {
    const clean = name.trim()

    if (clean) {
      onChange(clean)
      setName('')
      setAdding(false)
    }
  }

  if (adding) {
    return (
      <div className="flex gap-2">
        <input
          autoFocus
          className="input flex-1 min-w-0"
          value={name}
          maxLength={40}
          placeholder="New subcategory"
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
        />
        <button className="btn-primary" disabled={!name.trim()} onClick={submit}>
          Use
        </button>
        <button className="btn-secondary" onClick={() => setAdding(false)}>
          Cancel
        </button>
      </div>
    )
  }

  return (
    <Select
      className="w-full"
      value={value}
      onChange={v => (v === NEW ? setAdding(true) : onChange(v))}
      options={[
        { value: NONE, label: 'Not specified' },
        ...options.map(s => ({ value: s, label: s })),
        { value: NEW, label: '+ Other…' },
      ]}
    />
  )
}
