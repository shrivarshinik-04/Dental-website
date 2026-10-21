# Retention and deletion

Settings: `RETENTION`, `PROCESSING_RECORD_HOLD` and `MIN_LOG_RETENTION_DAYS` in `src/config/compliance.js`.
Job: `scripts/retention.js` (`npm run retention`, or `npm run retention:dry-run` to see what would change).

| Data | Kept | Then | Source |
|---|---|---|---|
| Booking data not part of a clinical record | 30 days after the requested date, cancellation or consent withdrawal | Appointment deleted; the person's name, phone and email erased once no appointment remains (reference ID and consent ledger kept, anonymised) | SPDI Rule 5(4) now; DPDP s.8(7) from about May 2027 |
| Appointments marked "part of the clinical record" (admin) | 3 years after the visit (**placeholder, needs legal confirmation**) | Deleted | Medical record-keeping law that applies to the clinic |
| Consent records | 3 years; only for anonymous visitors or people erased that long ago | Deleted | Proof of consent |
| Access logs (`AuditLog`) | 1 year (never less) | Deleted | DPDP Rules 6(1)(e), 8(3) from about May 2027; CERT-In (iv) 180 days for all ICT logs now |
| Closed rights requests and grievances | 3 years after closure (never less than 1 year) | Deleted | Design choice |
| One-time codes | 1 day | Deleted | Design choice |
| Analytics events | 90 days, or until analytics consent is withdrawn | Deleted | Design choice (consent-based) |
| Nominee details | Until replaced or the person is erased | Cleared from the request payload | DPDP s.14 from about May 2027 |

**Erasure on request** (Data Rights page) acts immediately on everything not marked as part of the clinical record,
and tells the person what was kept and why.

**DPDP Rules 2025, Rule 8(3) (from about May 2027):** requires keeping personal data, traffic data and logs of
processing for at least one year from the processing. Whether that applies to booking data that a person asks to be
erased needs legal confirmation. `PROCESSING_RECORD_HOLD.enabled` (default `false`) makes the job keep booking data
for that period; erasure requests are not affected yet.

**Processors:** none receives personal data yet. When one does, implement the TODO in `scripts/retention.js`
(`instructProcessorsToErase`) and in `src/lib/notify.js` (`instructProcessors`).

**Backups:** none exist in this test environment. When added, deleted data remains in backups until they expire;
it is never restored for normal use, and erasure requests are re-applied after any restore.

## Scheduling

cron (daily at 02:15 IST):

```cron
CRON_TZ=Asia/Kolkata
15 2 * * * cd /srv/clinic && /usr/bin/env NODE_ENV=production npm run -s retention >> /var/log/clinic-retention.log 2>&1
```

systemd timer:

```ini
# /etc/systemd/system/clinic-retention.service
[Service]
Type=oneshot
WorkingDirectory=/srv/clinic
EnvironmentFile=/srv/clinic/.env
ExecStart=/usr/bin/npm run -s retention

# /etc/systemd/system/clinic-retention.timer
[Timer]
OnCalendar=*-*-* 02:15:00 Asia/Kolkata
Persistent=true
[Install]
WantedBy=timers.target
```
