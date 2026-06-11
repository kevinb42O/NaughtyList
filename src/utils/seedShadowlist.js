/**
 * seedShadowlist.js
 *
 * One-time utility: migrates Shadowlist seed data into the 21rats Supabase
 * profile for the admin account (info@hondaanzee.be).
 *
 * Usage:
 *   node src/utils/seedShadowlist.js <SUPABASE_URL> <SERVICE_ROLE_KEY>
 *
 * You can grab these values from:
 *   Supabase Dashboard → Project Settings → API
 *   - URL:               "Project URL"
 *   - SERVICE_ROLE_KEY:  "service_role" key (not the anon key)
 *
 * Example:
 *   node src/utils/seedShadowlist.js https://xxx.supabase.co eyJhb...
 */

import { createClient } from '@supabase/supabase-js'

const [, , SUPABASE_URL, SERVICE_ROLE_KEY] = process.argv

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('\n❌ Usage: node src/utils/seedShadowlist.js <SUPABASE_URL> <SERVICE_ROLE_KEY>\n')
  console.error('   Get both values from: Supabase Dashboard → Project Settings → API\n')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── Seed data (ported from shadowlist project) ──────────────────────────────
const SEED_ACCOUNTS = [
  { id: 'Alpha-Q',                accountName: 'Alpha-Q',          userLevel: 450,  email: 'joske@almatips.com',              password: '',                insuredSlot2: false, insuredSlot3: false, shadowbanStatus: 'shadowbanned', shadowbanDate: '2026-06-08', shadowbanStartTime: new Date('2026-06-08T04:38:00+02:00').getTime(), profilePicture: '/avatars/skull.png'   },
  { id: 'canBfriendly#6054722',   accountName: 'canBfriendly',     userLevel: 4,    email: 'jossie1914@outlook.com',          password: '',                insuredSlot2: false, insuredSlot3: false, shadowbanStatus: 'clear',        shadowbanDate: '',          shadowbanStartTime: null,                                            profilePicture: '/avatars/soldier.png' },
  { id: 'joske12345#8073724',     accountName: 'joske12345',        userLevel: 460,  email: 'Joskeflierefluiter@gmail.com',    password: '',                insuredSlot2: false, insuredSlot3: false, shadowbanStatus: 'clear',        shadowbanDate: '',          shadowbanStartTime: null,                                            profilePicture: '/avatars/shield.png'  },
  { id: 'FlameThief#5458858',     accountName: 'FlameThief',        userLevel: 1,    email: 'joskejoskejoske1235@outlook.com', password: '',                insuredSlot2: false, insuredSlot3: false, shadowbanStatus: 'clear',        shadowbanDate: '',          shadowbanStartTime: null,                                            profilePicture: '/avatars/skull.png'   },
  { id: 'NeonLoa',                accountName: 'NeonLoa',           userLevel: 1,    email: 'josjosjos1235@gmail.com',         password: '',                insuredSlot2: false, insuredSlot3: false, shadowbanStatus: 'clear',        shadowbanDate: '',          shadowbanStartTime: null,                                            profilePicture: '/avatars/soldier.png' },
  { id: 'Alpha-Q#8104748',        accountName: 'Alpha-Q',           userLevel: 500,  email: 'Joskevermeulene@gmail.com',       password: '',                insuredSlot2: false, insuredSlot3: false, shadowbanStatus: 'shadowbanned', shadowbanDate: '2026-06-11', shadowbanStartTime: new Date('2026-06-11T02:24:00+02:00').getTime(), profilePicture: '/avatars/shield.png'  },
  { id: 'Alpha-Q (yousef)',       accountName: 'Alpha-Q (yousef)',  userLevel: 380,  email: 'yousefbe01@gmail.com',            password: 'Joseph1996!@@',   insuredSlot2: false, insuredSlot3: false, shadowbanStatus: 'clear',        shadowbanDate: '',          shadowbanStartTime: null,                                            profilePicture: '/avatars/skull.png'   },
  { id: 'blackkawk',              accountName: 'blackkawk',         userLevel: 1,    email: 'jossiewossie01@outlook.com',      password: '',                insuredSlot2: false, insuredSlot3: false, shadowbanStatus: 'shadowbanned', shadowbanDate: '2026-06-09', shadowbanStartTime: new Date('2026-06-09T01:46:00+02:00').getTime(), profilePicture: '/avatars/soldier.png' },
  { id: 'El Negro',               accountName: 'El Negro',          userLevel: 1,    email: 'kevinb420@gmail.com',             password: '',                insuredSlot2: false, insuredSlot3: false, shadowbanStatus: 'shadowbanned', shadowbanDate: '2026-06-09', shadowbanStartTime: new Date('2026-06-09T05:00:00+02:00').getTime(), profilePicture: '/avatars/shield.png'  },
  { id: 'LootyPetooty',           accountName: 'LootyPetooty',      userLevel: 1,    email: 'josz1996@outlook.com',            password: '',                insuredSlot2: false, insuredSlot3: false, shadowbanStatus: 'shadowbanned', shadowbanDate: '2026-06-11', shadowbanStartTime: new Date('2026-06-11T04:00:00+02:00').getTime(), profilePicture: '/avatars/skull.png'   },
  { id: 'ME#9805119',             accountName: 'ME',                userLevel: 1,    email: 'jooosssss1@outlook.com',          password: '',                insuredSlot2: false, insuredSlot3: false, shadowbanStatus: 'shadowbanned', shadowbanDate: '2026-06-05', shadowbanStartTime: new Date('2026-06-05T02:18:00+02:00').getTime(), profilePicture: '/avatars/soldier.png' },
  { id: 'poiypoihsdgpoi',         accountName: 'poiypoihsdgpoi',    userLevel: 1,    email: 'josmos45@outlook.com',            password: '',                insuredSlot2: false, insuredSlot3: false, shadowbanStatus: 'clear',        shadowbanDate: '',          shadowbanStartTime: null,                                            profilePicture: '/avatars/shield.png'  },
  { id: 'IwantToBeHabibi',        accountName: 'IwantToBeHabibi',   userLevel: 70,   email: 'jossie1111@outlook.com',          password: '',                insuredSlot2: false, insuredSlot3: false, shadowbanStatus: 'shadowbanned', shadowbanDate: '2026-06-10', shadowbanStartTime: new Date('2026-06-10T01:40:00+02:00').getTime(), profilePicture: '/avatars/skull.png'   },
  { id: 'HolyMoly',               accountName: 'HolyMoly',          userLevel: 1,    email: 'joskeu2026@outlook.com',          password: '',                insuredSlot2: false, insuredSlot3: false, shadowbanStatus: 'shadowbanned', shadowbanDate: '2026-06-11', shadowbanStartTime: new Date('2026-06-11T04:34:00+02:00').getTime(), profilePicture: '/avatars/soldier.png' },
  { id: 'youAreFkd#9396070',      accountName: 'youAreFkd',         userLevel: 105,  email: 'jooos05@outlook.com',             password: '',                insuredSlot2: false, insuredSlot3: false, shadowbanStatus: 'shadowbanned', shadowbanDate: '2026-06-08', shadowbanStartTime: new Date('2026-06-08T22:46:00+02:00').getTime(), profilePicture: '/avatars/shield.png'  },
  { id: 'hatethisgame#9414410',   accountName: 'hatethisgame',      userLevel: 1250, email: 'activisionsucksssss@gmail.com',   password: '',                insuredSlot2: false, insuredSlot3: false, shadowbanStatus: 'shadowbanned', shadowbanDate: '2026-06-07', shadowbanStartTime: new Date('2026-06-07T07:38:00+02:00').getTime(), profilePicture: '/avatars/skull.png'   },
  { id: 'Oopsiepoopsi#9574496',   accountName: 'Oopsiepoopsi',      userLevel: 1,    email: 'josjos1906@outlook.com',          password: '',                insuredSlot2: false, insuredSlot3: false, shadowbanStatus: 'shadowbanned', shadowbanDate: '2026-06-07', shadowbanStartTime: new Date('2026-06-07T05:00:00+02:00').getTime(), profilePicture: '/avatars/soldier.png' },
  { id: 'Alpha-Q-all#7255537',    accountName: 'Alpha-Q-all',       userLevel: 500,  email: 'josfliereflosh@gmail.com',        password: 'WAS7H <password>', insuredSlot2: false, insuredSlot3: false, shadowbanStatus: 'shadowbanned', shadowbanDate: '2026-06-08', shadowbanStartTime: new Date('2026-06-08T02:15:00+02:00').getTime(), profilePicture: '/avatars/shield.png'  },
  { id: 'LightLowietje',          accountName: 'LightLowietje',     userLevel: 1250, email: 'bourguignonphotography@gmail.com', password: '',               insuredSlot2: false, insuredSlot3: false, shadowbanStatus: 'shadowbanned', shadowbanDate: '2026-06-06', shadowbanStartTime: new Date('2026-06-06T20:08:00+02:00').getTime(), profilePicture: '/avatars/skull.png'   },
  { id: 'Joske420#1479701',       accountName: 'Joske420',          userLevel: 1250, email: 'kevinb42O@hotmail.com',           password: '',                insuredSlot2: false, insuredSlot3: false, shadowbanStatus: 'shadowbanned', shadowbanDate: '2026-06-08', shadowbanStartTime: new Date('2026-06-08T01:41:00+02:00').getTime(), profilePicture: '/avatars/soldier.png' },
]

async function run() {
  const ADMIN_EMAIL = 'info@hondaanzee.be'

  console.log(`\n🎯 Looking up admin: ${ADMIN_EMAIL}`)

  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

  if (listError) {
    console.error('❌ Could not list users:', listError.message)
    process.exit(1)
  }

  const adminUser = users.find((u) => u.email === ADMIN_EMAIL)

  if (!adminUser) {
    console.error(`❌ No user found with email: ${ADMIN_EMAIL}`)
    process.exit(1)
  }

  console.log(`✅ Found admin user: ${adminUser.id}`)

  const { data: currentProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, game_accounts, activision_ids')
    .eq('id', adminUser.id)
    .single()

  if (profileError) {
    console.error('❌ Could not fetch profile:', profileError.message)
    process.exit(1)
  }

  console.log(`📋 Current game_accounts: ${(currentProfile.game_accounts ?? []).length}`)
  console.log(`📋 Seeding ${SEED_ACCOUNTS.length} accounts…`)

  const existingIds = new Set(
    (currentProfile.game_accounts ?? []).map((a) => (a.id ?? '').toLowerCase()),
  )
  const newAccounts = SEED_ACCOUNTS.filter((a) => !existingIds.has(a.id.toLowerCase()))
  const mergedAccounts = [...(currentProfile.game_accounts ?? []), ...newAccounts]
  const activisionIds = mergedAccounts.map((a) => a.id)

  console.log(`➕ ${newAccounts.length} new (${SEED_ACCOUNTS.length - newAccounts.length} already existed)`)

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ game_accounts: mergedAccounts, activision_ids: activisionIds })
    .eq('id', adminUser.id)

  if (updateError) {
    console.error('❌ Failed to update profile:', updateError.message)
    process.exit(1)
  }

  console.log(`\n✅ Done! ${mergedAccounts.length} total accounts on the admin profile.`)
  console.log('🎮 Log in as info@hondaanzee.be and visit /shadowlist to verify.\n')
}

run().catch(console.error)
