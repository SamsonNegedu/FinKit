const GERMAN_CATEGORY_MAP: Record<string, string> = {
  'Essen & Trinken/Lebensmittel': 'Groceries',
  'Essen & Trinken/Lieferservice': 'Eating Out',
  'Essen & Trinken': 'Groceries',
  'Wohnen/Rundfunkgebuehren': 'Radio Tax',
  'Wohnen/Internet & Telefon': 'Internet',
  'Wohnen/Miete': 'Rent',
  'Wohnen/Strom': 'Electricity',
  Wohnen: 'Rent',
  'Lifestyle/Shopping': 'Shopping',
  'Lifestyle/Bekleidung': 'Shopping',
  'Lifestyle/Mobilfunk': 'Internet',
  'Lifestyle/Prime-Mitgliedschaft': 'Subscriptions',
  'Lifestyle/Sonstiger Lifestyle': 'Shopping',
  Lifestyle: 'Shopping',
  'Freizeit/In-App-Kaeufe': 'Personal Entertainment',
  Freizeit: 'Personal Entertainment',
  'Gesundheit/Apotheke': 'Health & Wellbeing',
  Gesundheit: 'Health & Wellbeing',
  'Mobilitaet/Fuehrerschein': 'Car',
  'Mobilitaet/Auto': 'Car',
  Mobilitaet: 'Public Transport',
  'Versicherungen/Sonstige Sachversicherung': 'Insurance',
  Versicherungen: 'Insurance',
  'Sparen/Kapitalanlage': 'Investment',
  'Sparen/Sparplan': 'Investment',
  Sparen: 'Savings',
  'Finanzen/Investment': 'Investment',
  'Finanzen/Steuern': 'Other',
  Finanzen: 'Other',
  'Einnahmen/Lohn / Gehalt': 'Income',
  'Einnahmen/Sonstige Einnahmen': 'Income',
  Einnahmen: 'Income',
  'Sonstiges/Sonstige Ausgaben': 'Other',
  Sonstiges: 'Other',
  'Drogerie/Drogerie': 'Groceries',
  Drogerie: 'Groceries',
}

export function mapGermanCategory(category?: string, subcategory?: string): string | undefined {
  if (!category) return undefined
  const combined = subcategory ? `${category}/${subcategory}` : category
  return GERMAN_CATEGORY_MAP[combined] || GERMAN_CATEGORY_MAP[category]
}
