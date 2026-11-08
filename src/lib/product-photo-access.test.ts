import { describe, expect, it } from 'vitest'
import { mayEditPhoto } from './product-photo-access'

describe('mayEditPhoto', () => {
  it('lets the creator change the photo', () => {
    expect(mayEditPhoto('S1', 'S1', true)).toBe(true)
  })

  it('lets the only seller of a sheet product (no creator) change the photo', () => {
    expect(mayEditPhoto('S1', null, false)).toBe(true)
  })

  it('locks a sheet product another supplier also sells', () => {
    expect(mayEditPhoto('S1', null, true)).toBe(false)
  })

  it('locks a product another supplier created', () => {
    expect(mayEditPhoto('S1', 'S2', false)).toBe(false)
  })
})
