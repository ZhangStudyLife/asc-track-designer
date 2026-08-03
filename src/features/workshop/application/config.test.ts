import { describe, expect, it } from 'vitest'
import { workshopWebRedirectUrl } from './config'

describe('workshop OAuth redirect', () => {
  it('preserves a GitHub Pages repository base path', () => {
    expect(workshopWebRedirectUrl('https://example.github.io/asc-track-designer/#/workshop'))
      .toBe('https://example.github.io/asc-track-designer/?workshopAuth=github')
  })

  it('uses the site root on a Vercel deployment', () => {
    expect(workshopWebRedirectUrl('https://asc.example.com/#/workshop/account'))
      .toBe('https://asc.example.com/?workshopAuth=github')
  })
})
