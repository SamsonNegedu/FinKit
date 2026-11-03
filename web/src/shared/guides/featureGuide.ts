export interface FeatureGuideArticle {
  id: string
  title: string
  /** One line on what this is for, shown under the title */
  summary: string
  tips: string[]
  /** In-app route (TanStack `to`) when the user can jump straight there. */
  to?: string
  search?: Record<string, unknown>
  linkLabel?: string
  requiresBanking?: boolean
}

export interface FeatureGuideSection {
  id: GuideSectionId
  title: string
  description: string
  articles: FeatureGuideArticle[]
}

export type GuideSectionId = 'start' | 'collect' | 'balance' | 'insights' | 'setup'

export const FEATURE_GUIDE_SECTIONS: FeatureGuideSection[] = [
  {
    id: 'start',
    title: 'Getting started',
    description: 'What FinKit does, where your data lives, and a routine that works.',
    articles: [
      {
        id: 'how-it-works',
        title: 'How FinKit works',
        summary: 'Add transactions, sort them once, read the results, copy a month into your sheet.',
        tips: [
          'Add data with Add file (a CSV or spreadsheet) or connect a bank under Banks. Everything merges into one list.',
          'Sort what the app is unsure of in Review. Each category you pick teaches a merchant rule, so the next import sorts itself.',
          'Read the results in Analytics: Your year, Where it went, Category by month and Trend.',
          'Each month, copy the finished row from Your year into your Google Sheet.',
        ],
      },
      {
        id: 'overview',
        title: 'Overview',
        summary: 'The period at a glance, with what needs attention.',
        to: '/',
        linkLabel: 'Open overview',
        tips: [
          'The period picker in the header sets the dates for Overview, Transactions, Review, Income and Where it went. Your year, Category by month and Trend have their own span.',
          'Tiles link into Review, Budgets, banks and recurring payments when something needs attention.',
          'Add another file any time with Add file: it merges into the same list, and repeats are skipped.',
        ],
      },
      {
        id: 'your-data',
        title: 'Your data',
        summary: 'Where transactions are kept and who can see them.',
        tips: [
          'Files you import stay in your browser. They are never sent to the server.',
          'Bank sync keeps an encrypted copy on the server, tied to your sign-in, so syncs stay up to date. Banks › Delete stored data removes it.',
          'Each signed-in person sees only their own data. Categories, rules and budgets are saved per person.',
          'There is no analytics or tracking built in.',
        ],
      },
    ],
  },
  {
    id: 'collect',
    title: 'Collect',
    description: 'Bring transactions in from files or bank sync, then browse and fix them in one list.',
    articles: [
      {
        id: 'banks',
        title: 'Banks',
        summary: 'Connect a bank for read-only syncing.',
        to: '/banks',
        linkLabel: 'Open banks',
        requiresBanking: true,
        tips: [
          'Pick your bank and country on Connect, finish the login at your bank, then return here. FinKit can read transactions but never move money.',
          'Open a connection to sync a date range, replace a login, or disconnect and delete stored data.',
          'If a banner says the link expired, reconnect. Your categories and rules are kept.',
        ],
      },
      {
        id: 'transactions',
        title: 'Transactions',
        summary: 'Every transaction in one list, to search, filter and fix.',
        to: '/transactions',
        linkLabel: 'Open transactions',
        tips: [
          'Switch between List and By merchant. By merchant groups by payee, and opening one shows all its charges so you can recategorize them together.',
          'Search, filter by category, bank or file, and show or hide transfers. Save view remembers a combination.',
          'Tick rows to change their category in bulk. The bar shows the net total of what you selected, per currency, and the hover shows money in and out.',
          'Row actions add a note, split a payment, or (with banking on) move it to a trip.',
        ],
      },
      {
        id: 'transaction-subcategories',
        title: 'Subcategories',
        summary: 'A finer label inside a category, without adding a second total.',
        to: '/transactions',
        linkLabel: 'Open transactions',
        tips: [
          'In the category picker, click › on a category to pick or add a subcategory, for example Shopping › Fashion. A category that already has some opens its list when you click it.',
          'Choosing “All from this merchant” makes the subcategory part of that merchant’s rule. “Only this one” changes just the row.',
          'The parent category always keeps its full total. Open a category in Analytics › Where it went to see the split by subcategory, then by merchant.',
          'Picking a different category clears the old subcategory, since it only means something inside its own category.',
        ],
      },
      {
        id: 'transaction-row-tools',
        title: 'Splits, transfers and which month counts',
        summary: 'For payments that need more than one category, none, or another month.',
        to: '/transactions',
        linkLabel: 'Open transactions',
        tips: [
          'Split divides one purchase into parts with their own categories. Parts do not teach merchant rules.',
          'Transfers between your own accounts drop out of spending, and Review skips them.',
          'A monthly payment taken a few days early or late can count in the month it is for. Hover the date and click the calendar to choose the previous month, the bank date or the next month. The date shown stays the bank’s.',
          'Your year points out a month with no income and, when a salary looks misplaced, offers to move it. It only suggests.',
        ],
      },
      {
        id: 'merchant',
        title: 'Merchants',
        summary: 'Everything one payee has charged you.',
        to: '/transactions',
        search: { view: 'merchants' },
        linkLabel: 'By merchant',
        tips: [
          'Open a payee to see every charge in the period and fix categories in bulk.',
          'The category you pick becomes a merchant rule, so future charges from that payee are sorted for you. You can edit or remove it under Settings › Rules.',
        ],
      },
    ],
  },
  {
    id: 'balance',
    title: 'Balance the month',
    description: 'Sort unclear rows, check income, and keep trip spending out of your months.',
    articles: [
      {
        id: 'review',
        title: 'Review',
        summary: 'A short queue of merchants the app was unsure about.',
        to: '/review',
        linkLabel: 'Open review',
        tips: [
          'Pick a category for each merchant, or press 1 to 9 for the suggestions. S skips and E excludes.',
          'The count shows on Overview and in the sidebar badge. Transfers never appear here.',
        ],
      },
      {
        id: 'income',
        title: 'Income',
        summary: 'Decide which money coming in counts as income.',
        to: '/income',
        linkLabel: 'Open income',
        tips: [
          'Transfers between your own accounts are excluded automatically. Exclude or include anything else by hand, for example a refund.',
          'What counts here is what Your year, Trend and Overview use as income.',
        ],
      },
      {
        id: 'trips',
        title: 'Trips',
        summary: 'Spending paid from a separate balance, kept out of your months.',
        to: '/trips',
        linkLabel: 'Open trips',
        requiresBanking: true,
        tips: [
          'Create a trip with dates, travelers and an optional budget. Archived trips stay readable but out of the way.',
          'Suggestions on a trip surface likely travel spend from the trip window.',
          'Spend tagged to a trip is removed from your monthly totals so it is not counted twice.',
        ],
      },
      {
        id: 'trip-inside',
        title: 'Inside a trip',
        summary: 'Breakdown, transactions and settings for one trip.',
        to: '/trips',
        linkLabel: 'Open trips',
        requiresBanking: true,
        tips: [
          'Breakdown shows money put in, spent and left, budget, settlement between travelers, and charts by category, place or day.',
          'Transactions lists everything on the trip. Assign funding or a cost category, a place, who paid, and shared splits.',
          'Manage edits the trip, archives it or deletes it. Add cost covers cash or manual lines that have no bank row.',
        ],
      },
      {
        id: 'trip-categories-subcategories',
        title: 'Trip categories',
        summary: 'Trips have their own categories and subcategories.',
        to: '/trips',
        linkLabel: 'Open trips',
        requiresBanking: true,
        tips: [
          'Trip categories (Transport, Food & drink and so on) are separate from your Settings categories. They only describe spend on that trip.',
          'Each cost gets a trip category and, if you like, a subcategory such as Transport › Flight. Ones you type are remembered.',
          'You can add a new trip category from the picker when tagging costs.',
        ],
      },
    ],
  },
  {
    id: 'insights',
    title: 'Insights',
    description: 'See where money went, month by month, and keep it on budget.',
    articles: [
      {
        id: 'your-year',
        title: 'Your year',
        summary: 'Every month in the columns of your Google Sheet.',
        to: '/analytics/year',
        linkLabel: 'Open your year',
        tips: [
          'One row per month, in the same columns and order as your sheet, worked out by the same rules the sheet row uses: savings and investments sit apart from spending, and excluded rows and transfers are left out.',
          'To reconcile, copy the latest finished month with the green button, or any month with the copy icon on its row. Paste into the matching row of your sheet.',
          'Columns follow Settings › Columns, so a column you add there appears here. Wide sheets scroll sideways.',
          'Categories with nothing that year are hidden. Spending in a category your sheet has no column for is listed under the table.',
        ],
      },
      {
        id: 'analytics',
        title: 'Where it went',
        summary: 'Categories and merchants for the period you pick.',
        to: '/analytics',
        linkLabel: 'Open where it went',
        tips: [
          'The period picker sets the dates. The tiles show what was spent, how much repeats on a schedule, and what was invested or saved.',
          'Open a category to see who it went to, split by subcategory first if you use them.',
          'Investments and savings are shown apart, as put away, and never counted as spent.',
        ],
      },
      {
        id: 'category-by-month',
        title: 'Category by month',
        summary: 'Which category moved, month to month.',
        to: '/analytics/months',
        linkLabel: 'Open category by month',
        tips: [
          'The last six months, one column each, shaded by how large a month is for that category.',
          'The last column compares the latest month with the average of the ones before it.',
          'Click a cell to see those transactions.',
        ],
      },
      {
        id: 'trends',
        title: 'Trend',
        summary: 'Where each month’s income went.',
        to: '/analytics/trend',
        linkLabel: 'Open trend',
        tips: [
          'One bar per month: red is spent, cyan is put away, green is left over. The dashed line is income, so a bar above it is a month that spent more than came in.',
          'Switch between 6 months, 12 months and all. Click a month to see where it went.',
        ],
      },
      {
        id: 'budgets',
        title: 'Budgets',
        summary: 'A monthly limit per category.',
        to: '/budgets',
        linkLabel: 'Open budgets',
        tips: [
          'Set a limit per category and watch progress against actual spend for the month. A monthly cap covers everything.',
          'Overview calls out categories that are close to or over their limit.',
        ],
      },
      {
        id: 'contracts',
        title: 'Recurring payments',
        summary: 'Subscriptions and standing orders found in your history.',
        to: '/contracts',
        linkLabel: 'Open recurring payments',
        requiresBanking: true,
        tips: [
          'Payments that repeat for at least three payments are found automatically. Open one to confirm its category.',
          'See price rises, what is coming up this month, and your fixed costs per month.',
        ],
      },
    ],
  },
  {
    id: 'setup',
    title: 'Setup',
    description: 'Categories, your sheet’s columns, and the rules that sort transactions.',
    articles: [
      {
        id: 'settings-sheet',
        title: 'Google Sheet',
        summary: 'The spreadsheet your columns are matched to.',
        to: '/settings/sheet',
        linkLabel: 'Sheet settings',
        tips: [
          'Enter your spreadsheet, the tab for the year, and how months are written there.',
          'This is where the app reads your header row from, so the Columns settings can match your sheet.',
        ],
      },
      {
        id: 'settings-categories',
        title: 'Categories',
        summary: 'Your own list, with icons and colors.',
        to: '/settings/categories',
        linkLabel: 'Category list',
        tips: [
          'Add a category, then give it an icon and a color. They show in Analytics, Budgets, Review and the pickers.',
          'Archive one you no longer use. It stops being offered but stays in filters, charts and past years. One that nothing uses can be deleted.',
          'A new category has no sheet column until you map it under Columns.',
        ],
      },
      {
        id: 'settings-columns',
        title: 'Columns',
        summary: 'Match the app’s categories to your sheet’s columns.',
        to: '/settings/columns',
        linkLabel: 'Column mapping',
        tips: [
          'Paste your sheet’s header row and the categories, their order and the totals follow it.',
          'Map each category to a column letter, and list the formula columns the app must leave alone.',
        ],
      },
      {
        id: 'settings-rules',
        title: 'Rules',
        summary: 'How transactions get sorted without you.',
        to: '/settings/rules',
        linkLabel: 'Rules',
        tips: [
          'Merchant rules are learned when you pick a category: one per merchant, with its subcategory if you chose one. Change or delete them here.',
          'Custom rules you build from a transaction with “Make a rule…”, matching on payee, words or amount. The one with more conditions wins, and custom rules are checked before merchant rules.',
          'Changes apply to future imports and when data is re-processed.',
        ],
      },
      {
        id: 'settings-back-office',
        title: 'Back office',
        summary: 'For whoever runs the app.',
        to: '/settings/back-office',
        linkLabel: 'Back office',
        requiresBanking: true,
        tips: [
          'Inspect sync logs and connection health when a bank misbehaves.',
          'Only shown when your account has back-office access.',
        ],
      },
    ],
  },
]

export function visibleFeatureGuideSections(bankingEnabled: boolean): FeatureGuideSection[] {
  const keep = (article: FeatureGuideArticle) => !article.requiresBanking || bankingEnabled

  return FEATURE_GUIDE_SECTIONS.map(section => ({
    ...section,
    articles: section.articles.filter(keep),
  })).filter(section => section.articles.length > 0)
}
