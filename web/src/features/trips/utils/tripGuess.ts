/** A trip category, and optionally a subcategory, as the server knows them. */
export interface TripGuess {
  category: string
  subcategory?: string
}

/**
 * What a payee's name or payment text says it is, in trip terms. Order matters: the first match wins, so the
 * specific (a flight) comes before the general (a restaurant). Names are the trip categories built into the
 * server; if they ever change, this must change with them.
 */
const RULES: Array<[RegExp, TripGuess]> = [
  [
    /\b(lufthansa|ryanair|easyjet|eurowings|wizz ?air|condor|vueling|ita airways|klm|air france|british airways|iberia|tap air|turkish airlines|emirates|flight|flug)\b/i,
    { category: 'Transport', subcategory: 'Flight' },
  ],
  [/\b(flixbus|blablacar|bus)\b/i, { category: 'Transport', subcategory: 'Bus' }],
  [
    /\b(trenitalia|renfe|sncf|italo|eurostar|oebb|öbb|db fernverkehr|train)\b/i,
    { category: 'Transport', subcategory: 'Train' },
  ],
  [/\b(uber|bolt|freenow|free now|taxi|lyft|cabify)\b/i, { category: 'Transport', subcategory: 'Taxi & rides' }],
  [
    /\b(sixt|hertz|avis|europcar|enterprise|rent a car|mietwagen)\b/i,
    { category: 'Transport', subcategory: 'Car hire' },
  ],
  [
    /\b(shell|aral|bp|esso|total|tankstelle|parking|parkhaus)\b/i,
    { category: 'Transport', subcategory: 'Fuel & parking' },
  ],
  [
    /\b(booking\.?com|airbnb|hostelworld|expedia|agoda|hotels?\.com|hotel|hostel|resort|motel|pension|campsite|camping)\b/i,
    { category: 'Accommodation' },
  ],
  [
    /\b(restaurant|ristorante|trattoria|cafe|café|coffee|bistro|bar|pub|pizz\w*|bakery|bäckerei|mcdonald|burger)\b/i,
    { category: 'Food & drink' },
  ],
  [
    /\b(supermarket|spar|carrefour|mercadona|lidl|aldi|tesco)\b/i,
    { category: 'Food & drink', subcategory: 'Groceries' },
  ],
  [
    /\b(museum|museo|tour|tickets?|getyourguide|viator|klook|ticketmaster|excursion|park)\b/i,
    { category: 'Activities' },
  ],
]

export function guessTripItem(text: string): TripGuess | null {
  for (const [pattern, guess] of RULES) {
    if (pattern.test(text)) {
      return guess
    }
  }

  return null
}

/**
 * Payees that are almost certainly about a trip: flights and places to stay. Narrower than the guess above on
 * purpose, because this is used to propose starting a trip and a restaurant or a fuel stop proves nothing.
 */
const BOOKING =
  /\b(lufthansa|ryanair|easyjet|eurowings|wizz ?air|condor|vueling|ita airways|klm|air france|british airways|iberia|tap air|turkish airlines|emirates|booking\.?com|airbnb|hostelworld|expedia|agoda|hotels?\.com|hotel|hostel)\b/i

export const isTravelBooking = (text: string) => BOOKING.test(text)
