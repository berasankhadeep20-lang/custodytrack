// seed_attendant.mjs
// Creates the demo attendant AND demo TTE/admin login. Idempotent — safe to
// run again if you already ran it once during Phase 0/1 setup; it looks up
// existing accounts instead of failing on "already exists."
//
// Usage:
//   npm install @supabase/supabase-js
//   set SUPABASE_URL=https://xxxx.supabase.co
//   set SUPABASE_SERVICE_ROLE_KEY=xxxx
//   node seed_attendant.mjs

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

async function getOrCreateUser(email, password) {
  const { data: created, error } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (!error) return created.user;

  // Already exists — look it up instead of treating this as a failure.
  const { data: list, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;
  const existing = list.users.find((u) => u.email === email);
  if (existing) return existing;
  throw error; // genuinely failed for some other reason
}

async function upsertAttendant(id, employeeId, name, role) {
  const { error } = await supabase.from('attendants').upsert({ id, employee_id: employeeId, name, role });
  if (error) throw error;
}

async function ensureAssignment(coachId, attendantId) {
  const { error } = await supabase
    .from('journey_assignments')
    .upsert({ coach_id: coachId, attendant_id: attendantId }, { onConflict: 'coach_id,attendant_id' });
  if (error) throw error;
}

async function main() {
  const attendantUser = await getOrCreateUser('attendant.demo@custodytrack.test', 'ChangeMe123!');
  await upsertAttendant(attendantUser.id, 'DEMO-001', 'Demo Attendant', 'attendant');
  await ensureAssignment(COACH_ID, attendantUser.id);
  console.log('Attendant ready: attendant.demo@custodytrack.test / ChangeMe123!');

  // Phase 4: TTE/admin account, for testing /admin. No journey_assignments row
  // needed — is_tte_or_admin() in the RLS policies bypasses that check
  // entirely, by design (see docs/SCHEMA.md §4).
  const tteUser = await getOrCreateUser('tte.demo@custodytrack.test', 'ChangeMe123!');
  await upsertAttendant(tteUser.id, 'DEMO-TTE-001', 'Demo TTE', 'tte');
  console.log('TTE ready: tte.demo@custodytrack.test / ChangeMe123! (visit /admin)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
