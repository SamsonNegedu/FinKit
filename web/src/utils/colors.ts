// Predefined colors for German categories
const CATEGORY_COLORS: Record<string, string> = {
  // Income categories
  'Einnahmen': 'bg-emerald-100 text-emerald-800',
  'Sparen': 'bg-blue-100 text-blue-800',
  'Finanzen': 'bg-indigo-100 text-indigo-800',

  // Expense categories
  'Essen & Trinken': 'bg-orange-100 text-orange-800',
  'Drogerie': 'bg-pink-100 text-pink-800',
  'Wohnen': 'bg-purple-100 text-purple-800',
  'Mobilitaet': 'bg-cyan-100 text-cyan-800',
  'Lifestyle': 'bg-rose-100 text-rose-800',
  'Freizeit': 'bg-amber-100 text-amber-800',
  'Gesundheit': 'bg-teal-100 text-teal-800',
  'Versicherungen': 'bg-violet-100 text-violet-800',
  'Kinder': 'bg-fuchsia-100 text-fuchsia-800',

  // Default category
  'Sonstiges': 'bg-gray-100 text-gray-800'
};

// Generate a consistent color for any category
export const getCategoryColor = (category: string): string => {
  // Check if we have a predefined color
  const predefinedColor = CATEGORY_COLORS[category];
  if (predefinedColor) {
    return predefinedColor;
  }

  // Generate a consistent color based on the category name
  const colors = [
    'bg-green-100 text-green-800',
    'bg-blue-100 text-blue-800',
    'bg-purple-100 text-purple-800',
    'bg-pink-100 text-pink-800',
    'bg-orange-100 text-orange-800',
    'bg-teal-100 text-teal-800',
    'bg-indigo-100 text-indigo-800',
    'bg-yellow-100 text-yellow-800',
    'bg-red-100 text-red-800',
    'bg-emerald-100 text-emerald-800',
    'bg-cyan-100 text-cyan-800',
    'bg-rose-100 text-rose-800',
    'bg-amber-100 text-amber-800',
    'bg-violet-100 text-violet-800',
    'bg-fuchsia-100 text-fuchsia-800'
  ];

  // Use the category name to generate a consistent index
  const index = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
}; 
