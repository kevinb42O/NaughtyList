import { Search, Settings } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import ProfileCard from '../components/ProfileCard.jsx'
import { useIntel } from '../context/useIntel.js'
import { displayProfileName, isProfileOnline } from '../utils/profiles.js'

function Profiles() {
  const { isAuthenticated, profiles, onlineUserIds } = useIntel()
  const [query, setQuery] = useState('')

  const visibleProfiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return [...profiles]
      .filter((nextProfile) => {
        if (!normalizedQuery) {
          return true
        }

        return (
          displayProfileName(nextProfile).toLowerCase().includes(normalizedQuery) ||
          nextProfile.bio?.toLowerCase().includes(normalizedQuery) ||
          nextProfile.clan_tag?.toLowerCase().includes(normalizedQuery) ||
          nextProfile.activision_ids?.some((id) => id.toLowerCase().includes(normalizedQuery))
        )
      })
      .sort((first, second) => {
        return (
          Number(isProfileOnline(second, onlineUserIds)) - Number(isProfileOnline(first, onlineUserIds)) ||
          displayProfileName(first).localeCompare(displayProfileName(second))
        )
      })
  }, [onlineUserIds, profiles, query])

  return (
    <div>
      <PageHeader eyebrow="Profiles" title="Squad Directory">
        See who is online, open operator bios, copy Activision IDs, and find clan tags fast.
      </PageHeader>

      {isAuthenticated ? (
        <div className="mb-5 flex items-center justify-end">
          <Link
            to="/profile"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-xs font-black uppercase tracking-[0.16em] text-gray-300 hover:border-indigo-500/40 hover:text-indigo-100"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
            Edit My Profile
          </Link>
        </div>
      ) : (
        <div className="mb-5 flex items-center justify-end">
          <Link
            to="/auth"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-xs font-black uppercase tracking-[0.16em] text-gray-400 hover:border-indigo-500/40 hover:text-indigo-100"
          >
            Login to set your profile
          </Link>
        </div>
      )}

      <section className="panel mb-5 rounded-[1.8rem] p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-indigo-200" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="field min-h-14 pl-12"
            placeholder="Search name, bio, clan tag, or Activision ID"
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {visibleProfiles.map((nextProfile) => (
          <ProfileCard key={nextProfile.id} profile={nextProfile} onlineUserIds={onlineUserIds} />
        ))}
      </section>
    </div>
  )
}

export default Profiles
