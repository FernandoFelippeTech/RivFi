import { createClient } from '@supabase/supabase-js'
import { configurationIssue } from './config'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const configurationError = configurationIssue(url, key)
export const supabase = configurationError ? null : createClient(url!, key!, {
  global: {
    fetch: (input, init) => fetch(input, {
      ...init,
      signal: init?.signal
        ? AbortSignal.any([init.signal, AbortSignal.timeout(20000)])
        : AbortSignal.timeout(20000),
    }),
  },
})

export function client() {
  if (!supabase) throw new Error(configurationError)
  return supabase
}
