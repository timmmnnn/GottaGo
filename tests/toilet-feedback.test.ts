import { describe, expect, it } from 'vitest'
import { isValidRating, normalizeComment } from '../src/lib/toiletFeedback'

describe('toilet feedback helpers', () => {
  it('accepts only whole-number ratings from 1 to 5', () => {
    expect(isValidRating(1)).toBe(true)
    expect(isValidRating(5)).toBe(true)
    expect(isValidRating(0)).toBe(false)
    expect(isValidRating(6)).toBe(false)
    expect(isValidRating(2.5)).toBe(false)
  })

  it('normalizes optional comments before submission', () => {
    expect(normalizeComment('  clean   and easy to find  ')).toBe('clean and easy to find')
    expect(normalizeComment('   ')).toBe('')
    expect(normalizeComment('a'.repeat(510))).toHaveLength(500)
  })
})
