import { Link } from 'react-router-dom'
import ClanCard from '../components/ClanCard.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { useIntel } from '../context/useIntel.js'

function Clans() {
  const { clans, players } = useIntel()

  return (
    <div>
      <PageHeader eyebrow="Clan Section" title="Clan Watch">
        Group repeat squads under one badge so their members stop looking like isolated incidents.
      </PageHeader>

      {clans.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {clans.map((clan) => (
            <ClanCard key={clan.id} clan={clan} />
          ))}
        </div>
      ) : (
        <section className="panel rounded-[1.5rem] p-6 text-center">
          <p className="intel-label mb-3">No clan intel yet</p>
          <h2 className="text-2xl font-black uppercase tracking-[0.04em] text-white">
            Start tagging repeat squads
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-400">
            Add operators with a clan or squad tag and this section will auto-build shared intel.
            Right now you have {players.length} total operator entries recorded.
          </p>
          <Link
            to="/?add=1"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-red-500/50 bg-red-500/12 px-5 text-sm font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20"
          >
            Add the first clan-linked operator
          </Link>
        </section>
      )}
    </div>
  )
}

export default Clans
