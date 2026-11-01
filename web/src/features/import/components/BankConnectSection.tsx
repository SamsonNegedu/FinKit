import { Landmark } from 'lucide-react'
import { PINNED_BANKS } from './fileUpload.types'

interface BankConnectSectionProps {
  showFile: boolean
  onConnectBank?: (bank: string | null) => void
  onToggleFileImport: () => void
}

export default function BankConnectSection({ showFile, onConnectBank, onToggleFileImport }: BankConnectSectionProps) {
  return (
    <div className="mb-8 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PINNED_BANKS.map(bank => (
          <button
            key={bank}
            onClick={() => onConnectBank?.(bank)}
            className="flex flex-col items-center gap-2 p-5 rounded-xl border border-midnight-700 bg-midnight-900/60 hover:bg-midnight-800 transition-colors"
          >
            <span className="w-10 h-10 rounded-xl bg-midnight-700 border border-midnight-600 grid place-items-center font-bold text-midnight-100">
              {bank[0]}
            </span>
            <span className="font-medium text-white">{bank}</span>
            <span className="text-xs text-midnight-400">Personal account</span>
            <span className="btn-primary text-sm mt-1">Connect</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
        <button
          onClick={() => onConnectBank?.(null)}
          className="inline-flex items-center gap-1.5 text-midnight-300 hover:text-white underline underline-offset-2"
        >
          <Landmark className="w-4 h-4" /> Another bank…
        </button>
        <button
          onClick={onToggleFileImport}
          aria-expanded={showFile}
          className="text-midnight-300 hover:text-white underline underline-offset-2"
        >
          Import a file instead
        </button>
      </div>
    </div>
  )
}
