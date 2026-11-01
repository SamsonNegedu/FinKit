import { useSearch } from '@tanstack/react-router'
import ConnectBank from '../components/banks/ConnectBank'
import PageHeader from '@/shared/components/layout/PageHeader'
import { ConnectSearch } from '@/features/banking/constants/search.constants'

export default function ConnectBankPage() {
  const { bank } = useSearch({ from: '/banks/connect' }) as ConnectSearch
  return (
    <div>
      <PageHeader
        title="Connect a bank"
        description="Choose your bank, check what will be read, then approve on the bank's own page."
      />
      <ConnectBank initialBank={bank} />
    </div>
  )
}
