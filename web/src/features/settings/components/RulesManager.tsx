import TabLinks from '@/shared/components/forms/TabLinks'
import CustomRulesList from './CustomRulesList'
import MerchantRulesList from './MerchantRulesList'

/**
 * The two kinds of categorizing rule, kept apart: merchant rules the app learns on its own (one per merchant), and
 * custom rules you build from a transaction. A custom rule is checked first.
 */
export default function RulesManager({ kind }: { kind: 'merchant' | 'custom' }) {
  return (
    <div className="space-y-5">
      <TabLinks
        ariaLabel="Kinds of rule"
        links={[
          { label: 'Merchant rules', link: { to: '/settings/rules' }, active: kind === 'merchant' },
          {
            label: 'Custom rules',
            link: { to: '/settings/rules', search: { kind: 'custom' } },
            active: kind === 'custom',
          },
        ]}
      />
      {kind === 'merchant' ? <MerchantRulesList /> : <CustomRulesList />}
    </div>
  )
}
