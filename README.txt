RESTBR DESIGN SYSTEM V1

Purpose
-------
Make every restaurant's design independent while keeping one shared menu core.

Files
-----
index.html
js/design-runtime.js
migration/platform/RESTBR-DESIGN-SYSTEM-V1.sql

Install
-------
1. Upload index.html to the root of hamodybr/restbr-menu-app.
2. Upload js/design-runtime.js to /js.
3. Wait for GitHub Pages to deploy.
4. In Supabase restbr-platform, run:
   migration/platform/RESTBR-DESIGN-SYSTEM-V1.sql
5. Refresh:
   https://yourcoffee-test.restbr.com
6. Compare:
   https://shorash.restbr.com

Expected
--------
YourCoffee Test gets an obvious Coffee Luxury glass theme.
SHORASH must stay unchanged.

Important
---------
The runtime only applies keys that exist in each restaurant's
ui_design_settings. Restaurants without those keys keep their current look.
