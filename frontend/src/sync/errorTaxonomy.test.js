import { describe, it, expect } from 'vitest'
import { classifySyncError } from './errorTaxonomy'

describe('classifySyncError', () => {
  it('classifies a fetch/network failure correctly', () => {
    expect(classifySyncError({ name: 'TypeError', message: 'Failed to fetch' })).toBe('network')
    expect(classifySyncError({ message: 'NetworkError when attempting to fetch resource' })).toBe('network')
  })

  it('classifies an RLS denial (42501) as auth', () => {
    expect(classifySyncError({ code: '42501', message: 'new row violates row-level security policy' })).toBe('auth')
  })

  it('classifies an HTTP 401/403 as auth', () => {
    expect(classifySyncError({ status: 401, message: 'JWT expired' })).toBe('auth')
    expect(classifySyncError({ status: 403, message: 'Forbidden' })).toBe('auth')
  })

  it('classifies anything else with a Postgres error code as validation', () => {
    expect(classifySyncError({ code: '23505', message: 'duplicate key value violates unique constraint' })).toBe('validation')
    expect(classifySyncError({ code: '22P02', message: 'invalid input syntax for type uuid' })).toBe('validation')
  })

  it('returns "ok" for a falsy/no error', () => {
    expect(classifySyncError(null)).toBe('ok')
    expect(classifySyncError(undefined)).toBe('ok')
  })
})
