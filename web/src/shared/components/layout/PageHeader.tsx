import type { ReactNode } from 'react'

export default function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-4 mb-5 sm:mb-6">
      <div className="min-w-0 flex-1 basis-72">
        <h1 className="text-2xl font-semibold text-ink truncate">{title}</h1>
        {description && <p className="text-sm text-midnight-400 mt-1">{description}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-2 max-sm:w-full max-sm:[&>*]:flex-1 max-sm:[&>*]:justify-center">
          {actions}
        </div>
      )}
    </div>
  )
}
