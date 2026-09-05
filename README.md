# RESTBR Single-Restaurant Master Template

This repository is the clean master template used to create one isolated deployment per restaurant.

## Isolation model

Every restaurant copy must have its own:

- repository/deployment
- Supabase project
- Auth owner account
- database and Storage bucket
- `js/runtime-config.js`
- domain or subdomain

Do not connect two restaurants to the same Supabase project.

## Create a new restaurant

1. Duplicate this repository into a new restaurant repository.
2. Create a new Supabase project for that restaurant.
3. Create the restaurant owner in Supabase Auth.
4. Run `supabase/bootstrap.sql` once in the new project.
5. Edit only the restaurant-specific values at the top of `js/runtime-config.js`.
6. Deploy the new repository and connect its domain/subdomain.
7. Open `/admin.html`, complete branding/settings, then run a full smoke test.

See `SETUP.md` for the detailed checklist.

## Important files

- `index.html` — public menu
- `admin.html` — restaurant dashboard
- `js/app.js` — menu runtime
- `js/cart.js` — cart and WhatsApp checkout
- `js/runtime-config.js` — per-restaurant public configuration
- `js/supabase-config.js` — shared Supabase bootstrap and module loaders
- `supabase/bootstrap.sql` — fresh-project schema, RLS and Storage setup
- `data/menu.json` — empty offline fallback

## Safety

Only a Supabase publishable/anon key belongs in browser code. Never commit a `service_role` key.

The master intentionally contains no customer identity, menu data, phone number, domain, Supabase project, logo or customer media. Optional user-management and destructive reset features stay disabled by default.
