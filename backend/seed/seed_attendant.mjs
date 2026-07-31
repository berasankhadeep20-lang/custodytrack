// seed_attendant.mjs
// Creates one demo attendant login. This has to be a script, not plain SQL, because
// creating a real Supabase Auth user (password hashing, auth.users triggers) goes
// through the Admin API, not a raw insert.
//
// Usage:
//   npm install @supabase/supabase-js
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxxx node seed_attendant.mjs
//
// The service role key is in Supabase dashboard -> Project Settings -> API.
// NEVER put this key in frontend code — it bypasses RLS entirely, admin use only.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars first.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// Matches the coach_id seeded in seed_reference_data.sql
const COACH_ID = '22222222-2222-2222-2222-222222222222';

async function main() {
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: 'attendant.demo@custodytrack.test',
    password: 'ChangeMe123!',   // demo only — this account has no real data behind it
    email_confirm: true,
  });

  if (userError) throw userError;
  const attendantId = userData.user.id;
  console.log('Created auth user:', attendantId);

  const { error: attendantError } = await supabase.from('attendants').insert({
    id: attendantId,
    employee_id: 'DEMO-001',
    name: 'Demo Attendant',
    role: 'attendant',
  });
  if (attendantError) throw attendantError;

  const { error: assignError } = await supabase.from('journey_assignments').insert({
    coach_id: COACH_ID,
    attendant_id: attendantId,
  });
  if (assignError) throw assignError;

  console.log('Done. Log in as attendant.demo@custodytrack.test / ChangeMe123!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
