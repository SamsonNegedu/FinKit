// Placeholder layout shown while a saved session loads or a file is being parsed.
export default function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading transactions">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="card h-24 bg-surface" />
        ))}
      </div>
      <div className="card h-14" />
      <div className="card space-y-3">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-10 rounded-lg bg-midnight-800" />
        ))}
      </div>
    </div>
  )
}
