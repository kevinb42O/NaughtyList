import { clanPrefix, displayProfileName } from '../utils/profiles.js'

const roleNameClass = {
  admin: 'profile-name-glow profile-name-glow--admin',
  moderator: 'profile-name-glow profile-name-glow--moderator',
}

function ProfileDisplayName({ profile, fallbackName = 'Unknown Operator' }) {
  const displayName = profile?.display_name || fallbackName
  const displayProfile = { ...(profile ?? {}), display_name: displayName }

  let glowClass = roleNameClass[profile?.role]
  
  if (!glowClass && (profile?.supporter_tier === 'founder' || profile?.supporter_tier === 'colonel')) {
    glowClass = roleNameClass.admin
  }

  return (
    <>
      <span className="profile-clan-tag">{clanPrefix(profile)} </span>
      <span className={glowClass}>{displayProfileName(displayProfile)}</span>
    </>
  )
}

export default ProfileDisplayName
