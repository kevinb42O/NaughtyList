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

      return {
        id,
        shadowbanStatus,
        shadowbanDate,
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
      shadowbanStatus: 'unknown',
      shadowbanDate: '',
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
      className: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-100',
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