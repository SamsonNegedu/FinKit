/** Small in-memory limiter (this is a single-instance personal app). */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>()
  constructor(private readonly now: () => number) {}

  /** Returns false when `key` has already used up `max` hits in the last `windowMs`. */
  allow(key: string, windowMs: number, max: number): boolean {
    const t = this.now()
    const recent = (this.hits.get(key) || []).filter(x => t - x < windowMs)
    if (recent.length >= max) {
      this.hits.set(key, recent)
      return false
    }
    recent.push(t)
    this.hits.set(key, recent)
    return true
  }
}
