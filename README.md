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

## Donations and Supporter Rewards

The app supports quiet project contributions with cosmetic-only rewards:

- `/support` starts Stripe Checkout for logged-in users and shows a bank transfer fallback.
- Stripe webhooks are handled by `supabase/functions/stripe-donations`.
- Admins can manually confirm bank transfers and Ko-fi/support records from `/admin`.
- Rewards are stored on profiles as supporter tier, badge visibility, wall visibility, and cosmetic frame/flair fields.

Required server env for automated Stripe checkout:

```bash
STRIPE_SECRET_KEY=sk_live_or_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SITE_URL=https://your-domain.example
```

Bank transfer fallback shown in the app:

```text
IBAN: BE43 7380 0488 6701
Name: Kevin Bourguignon
Reference: NaughtyList <profile name>
```

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
