export function mapPlayerFromSupabase(row, profileById = new Map()) {
  const createdByProfile = row.created_by ? profileById.get(row.created_by) : null

  return {
    id: row.id,
    name: row.name,
    clan: row.clan ?? '',
    threatLevel: row.threat_level,
    initialTrustScore: row.initial_trust_score,
    trustScore: row.trust_score,
    voteCount: row.vote_count ?? 0,
    tags: row.tags ?? [],
    evidenceUrl: row.evidence_url ?? '',
    notes: row.notes ?? '',
    createdBy: row.created_by,
    createdByProfile,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    moderatedAt: row.moderated_at,
    moderatedBy: row.moderated_by,
  }
}

export function mapPlayerToSupabase(player, userId) {
  return {
    name: player.name.trim(),
    clan: player.clan?.trim() ?? '',
    threat_level: player.threatLevel,
    initial_trust_score: Number(player.trustScore),
    tags: player.tags ?? [],
    evidence_url: player.evidenceUrl?.trim() ?? '',
    notes: player.notes?.trim() ?? '',
    created_by: userId,
  }
}
