import { useState } from 'react'
import { tripCategoryColor } from '../utils/tripCategoryColor'
import { useAddTripCategory, useTripCategories } from '../hooks/trips-queries'
import Select from '@/shared/components/forms/Select'

/** Trip categories only: separate from the monthly ones, and never written to a sheet. */
const NEW = '__new'

export default function CategoryPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const { data: categories = [] } = useTripCategories()
  const add = useAddTripCategory()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  const submit = async () => {
    const clean = name.trim()

    if (!clean) {
      return
    }
    await add.mutateAsync(clean)
    onChange(clean)
    setName('')
    setAdding(false)
  }

  if (adding) {
    return (
      <div>
        <div className="flex gap-2">
          <input
            autoFocus
            className="input flex-1 min-w-0"
            value={name}
            maxLength={40}
            placeholder="New category"
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
          />
          <button className="btn-primary" disabled={add.isPending || !name.trim()} onClick={submit}>
            Add
          </button>
          <button className="btn-secondary" onClick={() => setAdding(false)}>
            Cancel
          </button>
        </div>
        {add.error && <p className="text-xs text-expense mt-1">{add.error.message}</p>}
      </div>
    )
  }

  return (
    <Select
      className="w-full"
      value={value}
      onChange={v => (v === NEW ? setAdding(true) : onChange(v))}
      options={[
        ...categories.map(c => ({ value: c, label: c, color: tripCategoryColor(c) })),
        { value: NEW, label: '+ New category…' },
      ]}
    />
  )
}
