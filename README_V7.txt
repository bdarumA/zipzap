SIANKAI ALL-IN-ONE V7 — SITE-WIDE TRAFFIC INTELLIGENCE
======================================================

V7 was built from V6. One ZIP has the whole website and Admin dashboard.
Existing Cloudflare Pages project: siankaiss-web (production branch: production)

KEY CHANGE
- Traffic statistics are GLOBAL for the WHOLE WEBSITE, not split by tipster.
- No tipster slug, IP, raw User-Agent or visitor ID is saved in the V7 analytics database.
- Tipster profile pages and branding (up to 80 profiles), LINE link, Meta Pixel settings,
  Cloudflare KV and Turnstile features remain available.
- 7-day and 30-day reports are protected by the existing Admin Token.
- Provider-verified automation and browser automation hints are separated from Unknown.
- "Unknown" does NOT mean confirmed humans. No system claims to identify Meta ad review
  bots with certainty. No visitor is redirected based on the classification.
- Counts before the V7 D1 setup are NOT backfilled from V6 KV counters.

ONE-TIME D1 SETUP — CLOUDFLARE FREE TIER SUPPORTED
1. Extract the ENTIRE ZIP to one folder on Windows.
2. Sign in to Cloudflare with `npx wrangler login` if required.
3. Double-click SETUP_TRAFFIC_D1.cmd to create and initialize new D1 database
   called `siankai-traffic`, OR run manually in PowerShell:
     npx wrangler d1 create siankai-traffic
     npx wrangler d1 execute siankai-traffic --remote --file=schema.sql
   If a D1 database of this name already exists, DO NOT create it again;
   run ONLY the execute command if you need to initialize the schema.
4. Open https://dash.cloudflare.com -> Workers & Pages -> siankaiss-web
   -> Settings -> Bindings -> Add -> D1 database.
   Variable / Binding name: SIANKAI_TRAFFIC_DB
   Select database: siankai-traffic
   Save on PRODUCTION environment. The variable name must match exactly.
5. Verify your existing bindings remain:
     SIANKAI_SETTINGS -> your existing SIANKAI_KV namespace
     SIANKAI_ADMIN_TOKEN -> the existing Production SECRET
6. Double-click DEPLOY_SIANKAI.cmd to deploy the complete V7 package.
   Alternatively from the extracted folder:
     npx wrangler pages deploy public --project-name siankaiss-web --branch production
7. Open https://siankaiss-web.pages.dev/admin.html
   Enter Admin Token, scroll to Traffic Intelligence V7, select 7 or 30 days,
   and click Load Report. Do NOT share your token or screenshots showing it.

OPTIONAL TURNSTILE SETUP (IF NOT ALREADY ENABLED)
- Create Turnstile widget for the PUBLIC published hostname (e.g. siankaiss-web.pages.dev)
- In Pages PRODUCTION variables/secrets add:
    SIANKAI_TURNSTILE_SITE_KEY  [Text]
    SIANKAI_TURNSTILE_SECRET    [Secret]
- Re-deploy. The LINE click flow will perform server-side Siteverify validation.
- If these two variables are not set, LINE clicks can be accepted WITHOUT a challenge.
  This appears as Unverified LINE Clicks, not as Verified Humans.
- If Siteverify fails or the verified hostname/action is wrong, the click is rejected.

METRICS AND IMPORTANT LIMITATIONS
- Visits count successful GET requests for / or /index.html at Cloudflare edge,
  including automation with JavaScript disabled. They are NOT unique people.
  Requests blocked upstream at a firewall are NOT counted.
- Verified automation is recorded ONLY when a genuine Cloudflare `verifiedBot` signal
  reaches the request.cf metadata. This often isn't available on Cloudflare Free.
  It is NOT a designation of Meta Reviewer, and zero does not prove no bots visited.
- Automation indicator means a bot-like User-Agent string; this is spoofable and
  NOT proof that the user is an official crawler of Facebook or any platform.
- Unknown means there was no recorded automation signal. NOT a "likely customer".
- LINE Accepted is a server-accepted outbound attempt, NOT a completed LINE friend add.
- Turnstile passed is a Siteverify token validation, NOT proof of a human customer.
- Rejected is a verification failure, NOT automatically a bot or fraud.
- Historical counts begin only from successful V7 D1 setup and new traffic.
- Global daily buckets are UTC. D1 uses atomic SQLite UPSERT per event, rather than
  non-atomic KV read/modify/write counters. D1 has Free tier quotas; excessive
  traffic could hit limits. The click-to-LINE flow still works when analytics storage
  is temporarily unavailable. Check Cloudflare billing / usage limits.
- No exact Facebook/Meta ad reviewer attribution and NO CLOAKING or alternate-page
  redirection are implemented. All visitors receive the same Sale Page content.
- Privacy notices and applicable tracking-consent requirements remain the site
  operator's responsibility. Meta Pixel is still controlled in Admin.

FILES
  public/index.html                  Landing page (mobile and desktop)
  public/admin.html                  Branding, Pixel, LINE and global Traffic dashboard
  public/dashboard-real.png          Actual Match AI screenshot
  public/_routes.json               Restricts Functions to landing pages + APIs
  functions/api/pixel-config.js      Existing profile/LINE/Pixel API
  functions/api/traffic-check.js     LINE click validation + D1 metrics
  functions/_middleware.js           Site-wide landing-page GET counter
  functions/api/traffic-stats.js     Admin-only global 7/30-day stats
  lib/traffic.js                     Shared D1/auth utility
  schema.sql                         Create aggregate D1 table
  SETUP_TRAFFIC_D1.cmd               One-time D1 initializer
  DEPLOY_SIANKAI.cmd                 One-click V7 deploy

TEST ON PRODUCTION
- Verify existing page, tipster profiles, images and LINE destinations first.
- Open / or /index.html (including different tipster links), then refresh Admin report.
  Requests for /admin.html and image/CSS assets are not counted.
- Click LINE, complete Turnstile if enabled, then check accepted/verified count.
- Try deliberately incorrect Admin Token: /api/traffic-stats must return 401.
- Verify report 7/30-day range and that there are no tipster filter controls.
- If reports give 'Database not initialized', run schema.sql once on REMOTE D1.

Keep the previous working V6 ZIP for rollback if necessary.
