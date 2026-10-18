-- SIANKAI V7: site-wide aggregate metrics only. No tipster, IP, UA or visitor IDs.
CREATE TABLE IF NOT EXISTS traffic_daily (
  day_utc TEXT NOT NULL,
  metric TEXT NOT NULL CHECK(metric IN (
    'visit_unknown','visit_automation_indicator','visit_verified_automation',
    'click_verified','click_unverified','click_rejected'
  )),
  event_count INTEGER NOT NULL DEFAULT 0 CHECK(event_count >= 0),
  PRIMARY KEY (day_utc, metric)
);
