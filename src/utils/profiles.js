export function displayProfileName(profile) {
  return profile?.display_name || 'Unknown Operator'
}

export function clanPrefix(profile) {
  const clanTag = profile?.clan_tag?.trim()
  return clanTag ? `[${clanTag}]` : '[NOCLAN]'
}

export function isProfileOnline(profile, onlineUserIds) {
  if (!profile?.id) {
    return false
  }

  if (onlineUserIds.includes(profile.id)) {
    return true
  }

  if (!profile.last_seen) {
    return false
  }

  return Date.now() - new Date(profile.last_seen).getTime() < 1000 * 60 * 5
}
