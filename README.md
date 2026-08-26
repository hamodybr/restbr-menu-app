# RESTBR / YourCoffee Single Restaurant

This branch is the restored single-restaurant version of the project, based on the last stable snapshot before Cloudflare routing and multi-tenant support were introduced.

## Architecture
- One restaurant: YourCoffee
- One public menu
- One admin page: `admin.html`
- Direct Supabase connection from `js/supabase-config.js`
- No Cloudflare Worker
- No tenant router
- No Super Admin / Owner split
- No plans or subscriptions
- No restaurant member accounts

## Important
Do not reintroduce multi-tenant routing, Cloudflare Workers, owner onboarding, or per-restaurant account flows into this branch without creating a separate experimental branch first.

## Main files
- `index.html` — public menu
- `admin.html` — YourCoffee admin dashboard
- `js/app.js` — menu runtime
- `js/cart.js` — cart and WhatsApp checkout
- `js/supabase-config.js` — Supabase browser config
- `data/menu.json` — offline/static fallback
- `sw.js` — PWA cache
