import { describe, expect, it } from 'vitest'
import { guessTripItem, isTravelBooking } from '../utils/tripGuess'

describe('guessing a trip category', () => {
  it('reads flights, stays, rides and food from the payee text', () => {
    expect(guessTripItem('Ryanair Dublin')).toEqual({ category: 'Transport', subcategory: 'Flight' })
    expect(guessTripItem('PayPal Zahlung bei Booking.com')).toEqual({ category: 'Accommodation' })
    expect(guessTripItem('Uber *TRIP Help.uber.com')).toEqual({ category: 'Transport', subcategory: 'Taxi & rides' })
    expect(guessTripItem('Ristorante Da Mario')).toEqual({ category: 'Food & drink' })
    expect(guessTripItem('Mercadona Barcelona')).toEqual({ category: 'Food & drink', subcategory: 'Groceries' })
  })

  it('says nothing when the text gives no clue, so the caller can fall back to Other', () => {
    expect(guessTripItem('Kartenzahlung 4711')).toBeNull()
  })
})

describe('spotting a travel booking', () => {
  it('counts flights and places to stay, not food or fuel', () => {
    expect(isTravelBooking('Eurowings GmbH')).toBe(true)
    expect(isTravelBooking('Hotel Adlon Kempinski')).toBe(true)
    expect(isTravelBooking('Ristorante Da Mario')).toBe(false)
    expect(isTravelBooking('Shell Tankstelle')).toBe(false)
  })
})
