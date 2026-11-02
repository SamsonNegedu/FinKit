/**
 * The FinKit mark: an F that is also a bar chart. The same drawing lives in `public/favicon.svg` (browser tab and
 * the public pages), so a change to one must be made in the other.
 */
export default function Logo({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="finkit-logo" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#finkit-logo)" />
      <rect x="16" y="14" width="9" height="36" rx="4.5" fill="#fff" />
      <rect x="16" y="14" width="32" height="9" rx="4.5" fill="#fff" />
      <rect x="16" y="29" width="22" height="9" rx="4.5" fill="#fff" fillOpacity=".72" />
    </svg>
  )
}
