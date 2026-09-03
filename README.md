# RESTBR Single-Restaurant Template

A reusable menu and admin dashboard for one restaurant per deployment.

## Isolation model

Every sold copy gets its own:

- Supabase project and restaurant owner account
- database, Auth users, and Storage bucket
- deployment and domain/subdomain
- copy of `js/runtime-config.js`

There is no tenant table, shared restaurant database, tenant router, subscription
system, or browser-side service key.

## Start a restaurant

Follow [SETUP.md](SETUP.md). The files changed for each customer are:

- `js/runtime-config.js` — restaurant name, order prefix, Supabase URL, publishable key, and optional legacy aliases
- Supabase `restaurant_settings` — logo, phone, WhatsApp, location, colors, and text
- optional PWA icons in `manifest.webmanifest`

## Main files

- `index.html` — public menu
- `admin.html` — restaurant dashboard
- `js/app.js` — menu runtime
- `js/cart.js` — cart and WhatsApp checkout
- `js/runtime-config.js` — this restaurant's public connection values
- `js/supabase-config.js` — shared Supabase client bootstrap
- `supabase/bootstrap.sql` — fresh project schema, RLS, functions, and Storage
- `data/menu.json` — empty offline fallback

## Safety

Only a Supabase publishable/anon key belongs in browser code. Never commit or
paste a `service_role` key into this repository.

The optional user-management and full-reset features are disabled by default.
The core menu and single administrator do not need either feature.
