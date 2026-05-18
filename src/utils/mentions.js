import { clanPrefix, displayProfileName } from './profiles.js'

function normalizeHandle(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_]/g, '')
}

export function mentionHandle(profile) {
  const displayName = normalizeHandle(displayProfileName(profile))
  return displayName || `operator${String(profile?.id ?? '').slice(0, 6)}`
}

export function mentionLabel(profile) {
  return `${clanPrefix(profile)} ${displayProfileName(profile)}`.trim()
}

export function findActiveMentionToken(value) {
  const beforeCursor = String(value ?? '')
  const match = beforeCursor.match(/(^|\s)@([a-zA-Z0-9_]*)$/)

  if (!match) {
    return null
  }

  return {
    start: beforeCursor.length - match[2].length - 1,
    query: match[2],
  }
}

export function insertMentionToken(value, token, profile) {
  const handle = mentionHandle(profile)
  const beforeMention = value.slice(0, token.start)
  const afterMention = value.slice(token.start).replace(/^@[a-zA-Z0-9_]*/, '')
  return `${beforeMention}@${handle} ${afterMention}`.replace(/\s{2,}/g, ' ')
}

export function mentionedProfileIds(value, profiles) {
  const tokens = new Set(String(value ?? '').match(/@[a-zA-Z0-9_]+/g)?.map((token) => token.slice(1).toLowerCase()) ?? [])

  if (!tokens.size) {
    return []
  }

  return profiles
    .filter((profile) => tokens.has(mentionHandle(profile).toLowerCase()))
    .map((profile) => profile.id)
}