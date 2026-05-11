# 21rats

21rats is a public-read Progressive Web App for tracking Building 21 operator reputation, repeated problem squads, and clan-linked behavior.

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

Database migrations live in `supabase/migrations/`.

## Access Model

- Everyone can view the board.
- Logged-in users can add operator intel.
- Moderators can remove bad entries and abusive public chat.
- The single admin controls moderator access and push tooling.
  migrations/
```

## Scripts

```bash
npm run dev
npm run build
npm run preview
```

The PWA manifest is configured in `vite.config.js` with `theme_color: #111827` and standalone display mode.
