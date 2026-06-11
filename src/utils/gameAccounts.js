export const shadowbanStatusOptions = [
  { value: 'unknown', label: 'Unknown' },
  { value: 'clear', label: 'No Shadowban' },
  { value: 'shadowbanned', label: 'Shadowbanned' },
]

function normalizeStatus(status) {
  if (status === 'clear' || status === 'shadowbanned') {
    return status
  }

  return 'unknown'
}

/**
 * Normalize an array of game accounts for storage.
 * Supports the extended Shadowlist fields in addition to the base fields.
 */
export function normalizeGameAccounts(gameAccounts = []) {
  const seenIds = new Set()

  return (Array.isArray(gameAccounts) ? gameAccounts : [])
    .map((account) => {
      const id = typeof account === 'string' ? account.trim() : account?.id?.trim()

      if (!id) {
        return null
      }

      const dedupeKey = id.toLowerCase()
      if (seenIds.has(dedupeKey)) {
        return null
      }

      seenIds.add(dedupeKey)

      const shadowbanStatus = normalizeStatus(account?.shadowbanStatus)
      const shadowbanDate =
        shadowbanStatus === 'shadowbanned' && typeof account?.shadowbanDate === 'string'
          ? account.shadowbanDate.slice(0, 10)
          : ''

      // Extended Shadowlist fields
      const accountName = typeof account?.accountName === 'string' ? account.accountName.trim() : id
      const userLevel = typeof account?.userLevel === 'number' ? account.userLevel : (parseInt(account?.userLevel, 10) || 1)
      const email = typeof account?.email === 'string' ? account.email.trim() : ''
      const password = typeof account?.password === 'string' ? account.password : ''
      const insuredSlot2 = Boolean(account?.insuredSlot2)
      const insuredSlot3 = Boolean(account?.insuredSlot3)
      // shadowbanStartTime: unix timestamp in ms, used for the countdown timer
      const shadowbanStartTime =
        shadowbanStatus === 'shadowbanned' && typeof account?.shadowbanStartTime === 'number'
          ? account.shadowbanStartTime
          : null
      const profilePicture = typeof account?.profilePicture === 'string' ? account.profilePicture : ''

      return {
        id,
        accountName,
        userLevel,
        email,
        password,
        insuredSlot2,
        insuredSlot3,
        shadowbanStatus,
        shadowbanDate,
        shadowbanStartTime,
        profilePicture,
      }
    })
    .filter(Boolean)
}

export function profileGameAccounts(profile) {
  const structuredAccounts = normalizeGameAccounts(profile?.game_accounts)

  if (structuredAccounts.length) {
    return structuredAccounts
  }

  return normalizeGameAccounts(
    (profile?.activision_ids ?? []).map((id) => ({
      id,
      accountName: id,
      userLevel: 1,
      email: '',
      password: '',
      insuredSlot2: false,
      insuredSlot3: false,
      shadowbanStatus: 'unknown',
      shadowbanDate: '',
      shadowbanStartTime: null,
      profilePicture: '',
    })),
  )
}

export function gameAccountIds(gameAccounts) {
  return normalizeGameAccounts(gameAccounts).map((account) => account.id)
}

export function gameAccountStatusMeta(account) {
  if (account?.shadowbanStatus === 'shadowbanned') {
    return {
      label: account.shadowbanDate ? `Shadowbanned ${account.shadowbanDate}` : 'Shadowbanned',
      className: 'border-white/10 bg-white/5 text-gray-100',
    }
  }

  if (account?.shadowbanStatus === 'clear') {
    return {
      label: 'No Shadowban',
      className: 'border-green-400/40 bg-green-400/10 text-green-100',
    }
  }

  return {
    label: 'Status Unknown',
    className: 'border-white/10 bg-white/5 text-gray-300',
  }
}