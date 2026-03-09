import { describe, expect, it } from 'vitest'

import { buildCsv } from './csv'

describe('buildCsv', () => {
  it('escapes commas, quotes, and newlines', () => {
    const csv = buildCsv(
      [
        {
          name: 'Alpha, Beta',
          note: 'He said "buy"\nToday',
        },
      ],
      ['name', 'note'],
    )

    expect(csv).toBe('name,note\n"Alpha, Beta","He said ""buy""\nToday"')
  })
})
