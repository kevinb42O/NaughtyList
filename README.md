# The Naughty List

The Naughty List is a public-read Progressive Web App for tracking Building 21 operator reputation, repeated problem squads, clan-linked behavior, and trust-score votes.

## Tech Stack

- React + Vite
- Tailwind CSS
- React Router
- Lucide React
- Supabase Auth, Postgres, RLS, and RPC policies
- Vite PWA Plugin

## Supabase

The project is linked to Supabase project `qsxhtyjybmfirqvcdtvg`.

Local env:

```bash
VITE_SUPABASE_URL=https://qsxhtyjybmfirqvcdtvg.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Database migrations live in `supabase/migrations/` and create:

- `profiles` with `user`, `moderator`, and single `admin` roles
- `players` for operator records
- `trust_votes` for one trust vote per logged-in user per operator
- `players_with_scores`, where current trust score blends the original score with all votes
- `claim_admin_role()` so the first logged-in account can claim the only admin slot
- `set_profile_role()` so the admin can promote or demote moderators

## Access Model

- Everyone can view the list, clans, leaderboard, and trust scores.
- Logged-in users can add operator names and vote trust scores.
- Moderators can delete bad operator entries and abusive trust votes.
- The single admin can do everything moderators can do and control who is a moderator.

To become admin: create or log into your account, open `/admin`, and claim admin before anyone else does.

## Project Structure

```text
public/
  naughty-list-icon.svg
src/
  components/
    ClanCard.jsx
    Layout.jsx
    PageHeader.jsx
    PlayerCard.jsx
    PlayerRow.jsx
    RoleBadge.jsx
    TrustVote.jsx
  context/
    IntelProvider.jsx
    intelContext.js
    useIntel.js
  data/
    mockPlayers.js
  utils/
    clans.js
    supabaseMappers.js
    threat.js
  views/
    AddPlayer.jsx
    Admin.jsx
    Auth.jsx
    Clans.jsx
    Database.jsx
    Home.jsx
    Leaderboard.jsx
    Moderator.jsx
  App.jsx
  index.css
  main.jsx
vite.config.js
tailwind.config.js
supabase/
  migrations/
```

## Scripts

```bash
npm run dev
npm run build
npm run preview
```

The PWA manifest is configured in `vite.config.js` with `theme_color: #111827` and standalone display mode.
