import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Fails loudly at startup rather than a confusing runtime error later —
  // this is the #1 thing that goes wrong when picking this project back up
  // after a break: forgetting to set up .env.local.
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local ' +
    'and fill in the values from Supabase Project Settings -> API.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
