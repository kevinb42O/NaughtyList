export function buildClanIntel(players) {
  const clanMap = new Map()

  players.forEach((player) => {
    const clanName = player.clan?.trim()

    if (!clanName) {
      return
    }

    const clanId = clanName.toLowerCase()
    const currentClan = clanMap.get(clanId) ?? {
      id: clanId,
      name: clanName,
      memberCount: 0,
      hostileCount: 0,
      cautionCount: 0,
      friendlyCount: 0,
      evidenceCount: 0,
      totalTrust: 0,
      lastSeen: player.createdAt,
      members: [],
      tagCounts: {},
    }

    currentClan.memberCount += 1
    currentClan.totalTrust += player.trustScore
    currentClan.lastSeen =
      new Date(player.createdAt) > new Date(currentClan.lastSeen)
        ? player.createdAt
        : currentClan.lastSeen

    if (player.threatLevel === 'hostile') {
      currentClan.hostileCount += 1
    } else if (player.threatLevel === 'friendly') {
      currentClan.friendlyCount += 1
    } else {
      currentClan.cautionCount += 1
    }

    if (player.evidenceUrl) {
      currentClan.evidenceCount += 1
    }

    player.tags.forEach((tag) => {
      currentClan.tagCounts[tag] = (currentClan.tagCounts[tag] ?? 0) + 1
    })

    currentClan.members.push(player)
    clanMap.set(clanId, currentClan)
  })

  return Array.from(clanMap.values())
    .map((clan) => ({
      ...clan,
      averageTrust: Math.round(clan.totalTrust / clan.memberCount),
      topTags: Object.entries(clan.tagCounts)
        .sort((first, second) => second[1] - first[1])
        .slice(0, 4)
        .map(([tag, count]) => ({ tag, count })),
      members: [...clan.members].sort(
        (first, second) => new Date(second.createdAt) - new Date(first.createdAt),
      ),
    }))
    .sort((first, second) => {
      return (
        second.hostileCount - first.hostileCount ||
        second.memberCount - first.memberCount ||
        first.averageTrust - second.averageTrust
      )
    })
}
