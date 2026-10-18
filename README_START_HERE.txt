SIANKAI ALL-IN-ONE V7 — START HERE
=================================

THIS IS THE NEW COMPLETE SITE PACKAGE. Do not mix with an older ZIP.

What is included:
- Responsive Sales Page + real dashboard screenshot
- Multi-tipster profile/admin editing (names/images/LINE/Meta Pixel)
- SITE-WIDE ONLY traffic analytics — NOT split by tipster
- D1 daily counters with 7-day and 30-day Admin reports
- Optional Turnstile security for LINE outbound clicks
- Edge pageview counting including non-JavaScript requests
- No cloaking, bot-targeted page swapping or redirects to a game page

IMPORTANT: Do ONE-TIME D1 setup to activate the dashboard:
1. Extract the ZIP into a new folder on your Windows desktop.
2. Read README_V7.txt.
3. Double-click SETUP_TRAFFIC_D1.cmd to create / initialize the D1 database.
   If the database already exists, skip creation and see README_V7.txt.
4. In Cloudflare Pages for project 'siankaiss-web', create the D1 binding:
     SIANKAI_TRAFFIC_DB -> siankai-traffic
5. Run DEPLOY_SIANKAI.cmd from THIS folder.
6. Open https://siankaiss-web.pages.dev/admin.html

Your existing Production bindings must still exist:
  SIANKAI_SETTINGS       KV namespace
  SIANKAI_ADMIN_TOKEN    private Secret
Optional Turnstile bindings:
  SIANKAI_TURNSTILE_SITE_KEY  public key
  SIANKAI_TURNSTILE_SECRET    private Secret

If you skip D1 setup, Sales Page / Admin profile / LINE still work, but
Traffic V7 will report that the D1 database is not configured.

No real live Cloudflare deployment was performed by this package creation.
No User-Agent, IP, tipster ID, or visitor fingerprint is stored in V7 D1.
