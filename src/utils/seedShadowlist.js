/**
 * seedShadowlist.js — corrected
 *
 * Migrates original shadowlist data to the 21rats admin account.
 * Source of truth: shadowlist/src/seed.js
 *
 * Usage:
 *   node src/utils/seedShadowlist.js <SUPABASE_URL> <SERVICE_ROLE_KEY>
 */

import { createClient } from '@supabase/supabase-js'

const [, , SUPABASE_URL, SERVICE_ROLE_KEY] = process.argv

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('\n❌ Usage: node src/utils/seedShadowlist.js <SUPABASE_URL> <SERVICE_ROLE_KEY>\n')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── Seed data (ported 1-to-1 from shadowlist/src/seed.js) ────────────────────
// KEY: activisionId = the actual Activision ID (unique key for dedup)
//      isShadowbanned: true  → shadowbanStatus: 'shadowbanned'
//      isShadowbanned: false → shadowbanStatus: 'clear'
const SEED_ACCOUNTS = [
  {
    id: 'Alpha-Q',
    accountName: 'Alpha-Q',
    email: 'joske@almatips.com',
    userLevel: 450,
    password: '',
    shadowbanStatus: 'shadowbanned',
    shadowbanStartTime: new Date('2026-06-08T04:38:00+02:00').getTime(),
    shadowbanDate: '2026-06-08',
    insuredSlot2: false,
    insuredSlot3: false,
    profilePicture: '/avatars/skull.png',
  },
  {
    id: 'canBfriendly#6054722',
    accountName: 'canBfriendly',
    email: 'jossie1914@outlook.com',
    userLevel: 4,
    password: '',
    shadowbanStatus: 'clear',
    shadowbanStartTime: null,
    shadowbanDate: '',
    insuredSlot2: false,
    insuredSlot3: false,
    profilePicture: '/avatars/soldier.png',
  },
  {
    id: 'joske12345#8073724',
    accountName: 'joske12345',
    email: 'Joskeflierefluiter@gmail.com',
    userLevel: 460,
    password: '',
    shadowbanStatus: 'clear',
    shadowbanStartTime: null,
    shadowbanDate: '',
    insuredSlot2: false,
    insuredSlot3: false,
    profilePicture: '/avatars/shield.png',
  },
  {
    id: 'FlameThief#5458858',
    accountName: 'FlameThief',
    email: 'joskejoskejoske1235@outlook.com',
    userLevel: 1,
    password: '',
    shadowbanStatus: 'clear',
    shadowbanStartTime: null,
    shadowbanDate: '',
    insuredSlot2: false,
    insuredSlot3: false,
    profilePicture: '/avatars/skull.png',
  },
  {
    id: 'NeonLoa',
    accountName: 'NeonLoa',
    email: 'josjosjos1235@gmail.com',
    userLevel: 1,
    password: '',
    shadowbanStatus: 'clear',
    shadowbanStartTime: null,
    shadowbanDate: '',
    insuredSlot2: false,
    insuredSlot3: false,
    profilePicture: '/avatars/soldier.png',
  },
  {
    id: 'Alpha-Q#8104748',
    accountName: 'Alpha-Q',
    email: 'Joskevermeulene@gmail.com',
    userLevel: 500,
    password: '',
    shadowbanStatus: 'shadowbanned',
    shadowbanStartTime: new Date('2026-06-11T02:24:00+02:00').getTime(),
    shadowbanDate: '2026-06-11',
    insuredSlot2: false,
    insuredSlot3: false,
    profilePicture: '/avatars/shield.png',
  },
  {
    id: 'Alpha-Q (yousef)',
    accountName: 'Alpha-Q (yousef)',
    email: 'yousefbe01@gmail.com',
    userLevel: 380,
    password: 'Joseph1996!@@',
    shadowbanStatus: 'clear',
    shadowbanStartTime: null,
    shadowbanDate: '',
    insuredSlot2: false,
    insuredSlot3: false,
    profilePicture: '/avatars/skull.png',
  },
  {
    id: 'blackkawk',
    accountName: 'blackkawk',
    email: 'jossiewossie01@outlook.com',
    userLevel: 1,
    password: '',
    shadowbanStatus: 'shadowbanned',
    shadowbanStartTime: new Date('2026-06-09T01:46:00+02:00').getTime(),
    shadowbanDate: '2026-06-09',
    insuredSlot2: false,
    insuredSlot3: false,
    profilePicture: '/avatars/soldier.png',
  },
  {
    id: 'El Negro',
    accountName: 'El Negro',
    email: 'kevinb420@gmail.com',
    userLevel: 1,
    password: '',
    shadowbanStatus: 'shadowbanned',
    shadowbanStartTime: new Date('2026-06-09T05:00:00+02:00').getTime(),
    shadowbanDate: '2026-06-09',
    insuredSlot2: false,
    insuredSlot3: false,
    profilePicture: '/avatars/shield.png',
  },
  {
    id: 'LootyPetooty',
    accountName: 'LootyPetooty',
    email: 'josz1996@outlook.com',
    userLevel: 1,
    password: '',
    shadowbanStatus: 'shadowbanned',
    shadowbanStartTime: new Date('2026-06-11T04:00:00+02:00').getTime(),
    shadowbanDate: '2026-06-11',
    insuredSlot2: false,
    insuredSlot3: false,
    profilePicture: '/avatars/skull.png',
  },
  {
    id: 'ME#9805119',
    accountName: 'ME',
    email: 'jooosssss1@outlook.com',
    userLevel: 1,
    password: '',
    shadowbanStatus: 'shadowbanned',
    shadowbanStartTime: new Date('2026-06-05T02:18:00+02:00').getTime(),
    shadowbanDate: '2026-06-05',
    insuredSlot2: false,
    insuredSlot3: false,
    profilePicture: '/avatars/soldier.png',
  },
  {
    id: 'poiypoihsdgpoi',
    accountName: 'poiypoihsdgpoi',
    email: 'josmos45@outlook.com',
    userLevel: 1,
    password: '',
    shadowbanStatus: 'clear',
    shadowbanStartTime: null,
    shadowbanDate: '',
    insuredSlot2: false,
    insuredSlot3: false,
    profilePicture: '/avatars/shield.png',
  },
  {
    id: 'IwantToBeHabibi',
    accountName: 'IwantToBeHabibi',
    email: 'jossie1111@outlook.com',
    userLevel: 70,
    password: '',
    shadowbanStatus: 'shadowbanned',
    shadowbanStartTime: new Date('2026-06-10T01:40:00+02:00').getTime(),
    shadowbanDate: '2026-06-10',
    insuredSlot2: false,
    insuredSlot3: false,
    profilePicture: '/avatars/skull.png',
  },
  {
    id: 'HolyMoly',
    accountName: 'HolyMoly',
    email: 'joskeu2026@outlook.com',
    userLevel: 1,
    password: '',
    shadowbanStatus: 'shadowbanned',
    shadowbanStartTime: new Date('2026-06-11T04:34:00+02:00').getTime(),
    shadowbanDate: '2026-06-11',
    insuredSlot2: false,
    insuredSlot3: false,
    profilePicture: '/avatars/soldier.png',
  },
  {
    id: 'youAreFkd#9396070',
    accountName: 'youAreFkd',
    email: 'jooos05@outlook.com',
    userLevel: 105,
    password: '',
    shadowbanStatus: 'shadowbanned',
    shadowbanStartTime: new Date('2026-06-08T22:46:00+02:00').getTime(),
    shadowbanDate: '2026-06-08',
    insuredSlot2: false,
    insuredSlot3: false,
    profilePicture: '/avatars/shield.png',
  },
  {
    id: 'hatethisgame#9414410',
    accountName: 'hatethisgame',
    email: 'activisionsucksssss@gmail.com',
    userLevel: 1250,
    password: '',
    shadowbanStatus: 'shadowbanned',
    shadowbanStartTime: new Date('2026-06-07T07:38:00+02:00').getTime(),
    shadowbanDate: '2026-06-07',
    insuredSlot2: false,
    insuredSlot3: false,
    profilePicture: '/avatars/skull.png',
  },
  {
    id: 'Oopsiepoopsi#9574496',
    accountName: 'Oopsiepoopsi',
    email: 'josjos1906@outlook.com',
    userLevel: 1,
    password: '',
    shadowbanStatus: 'shadowbanned',
    shadowbanStartTime: new Date('2026-06-07T05:00:00+02:00').getTime(),
    shadowbanDate: '2026-06-07',
    insuredSlot2: false,
    insuredSlot3: false,
    profilePicture: '/avatars/soldier.png',
  },
  {
    id: 'Alpha-Q-all#7255537',
    accountName: 'Alpha-Q-all',
    email: 'josfliereflosh@gmail.com',
    userLevel: 500,
    password: 'WAS7H <password>',
    shadowbanStatus: 'shadowbanned',
    shadowbanStartTime: new Date('2026-06-08T02:15:00+02:00').getTime(),
    shadowbanDate: '2026-06-08',
    insuredSlot2: false,
    insuredSlot3: false,
    profilePicture: '/avatars/shield.png',
  },
  {
    id: 'LightLowietje',
    accountName: 'LightLowietje',
    email: 'bourguignonphotography@gmail.com',
    userLevel: 1250,
    password: '',
    shadowbanStatus: 'shadowbanned',
    shadowbanStartTime: new Date('2026-06-06T20:08:00+02:00').getTime(),
    shadowbanDate: '2026-06-06',
    insuredSlot2: false,
    insuredSlot3: false,
    profilePicture: '/avatars/skull.png',
  },
  {
    id: 'Joske420#1479701',
    accountName: 'Joske420',
    email: 'kevinb42O@hotmail.com',
    userLevel: 1250,
    password: '',
    shadowbanStatus: 'shadowbanned',
    shadowbanStartTime: new Date('2026-06-08T01:41:00+02:00').getTime(),
    shadowbanDate: '2026-06-08',
    insuredSlot2: false,
    insuredSlot3: false,
    profilePicture: '/avatars/soldier.png',
  },
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

  console.log('\n🔄 REPLACING all accounts with corrected seed data (20 accounts)…')
  console.log('   (Discarding previously seeded data that had wrong IDs)\n')

  // Print what we're writing so it can be verified
  SEED_ACCOUNTS.forEach((a) => {
    const status = a.shadowbanStatus === 'shadowbanned' ? '🔴' : '🟢'
    console.log(`   ${status} ${a.id.padEnd(30)} ${a.accountName}`)
  })

  const activisionIds = SEED_ACCOUNTS.map((a) => a.id)

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      game_accounts: SEED_ACCOUNTS,
      activision_ids: activisionIds,
    })
    .eq('id', adminUser.id)

  if (updateError) {
    console.error('\n❌ Failed to update profile:', updateError.message)
    process.exit(1)
  }

  console.log(`\n✅ Done! ${SEED_ACCOUNTS.length} accounts written to admin profile.`)
  console.log('🎮 Log in as info@hondaanzee.be and visit /shadowlist to verify.\n')
}

run().catch(console.error)
