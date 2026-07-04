---
title: User Scan Areas
---

The `/areas` page lets members draw their own scan areas on a map, assign scan workers to them,
and turn them on and off — bounded by a per-Discord-role worker allotment.

## How it works

- Users can save **unlimited** scan areas, but only as many **workers** as their allotment allows
  can be active at once. With an allotment of 2, a user can run two areas with 1 worker each, or
  one area with 2 workers.
- Each area has a hard size limit (default **5 km²**) and a recommended size (default **2.5 km²**,
  shown as a warning above it).
- Areas are private: users only see and manage their own. Pokemon found by these scans appear on
  the map for anyone with the usual map permissions.
- Every area lives permanently in Dragonite (mirror-all lifecycle): idle areas sit at **0 pokemon
  workers**, manually-activated areas run at their worker count, and scheduled areas are scaled by
  Dragonite scheduler docs during their windows. `quest_mode.workers` stays at the area's worker
  count — it's a cap on quest scanning, which only runs via the quest-scan button. A
  reconciliation pass on server start repairs any drift in either direction.

## User flow

1. Open **My Areas** in the profile dropdown (only shown to users with an allotment).
2. **Draw new area** — click the map to place points, click the first point to close the polygon.
   A live size readout shows green/amber/red against the recommended and maximum sizes.
3. Name the area, choose workers, save.
4. Toggle the area **active** to start scanning. Use the quest-scroll button to trigger a quest
   scan on an active area. Edit geometry, rename, change workers, or delete at any time.

## Schedules

Each area is either **Manual** (the on/off toggle) or **Scheduled**. Scheduled areas scan
automatically during their windows and the toggle is disabled.

- **Weekly windows**: days of the week + start/end time. An end time at or before the start wraps
  past midnight (e.g. Fri 22:00–02:00 runs into Saturday).
- **Specific dates**: one-off windows for a calendar date (e.g. Community Day).
- Times are entered in the **user's own timezone** (captured from the browser) and evaluated by
  Dragonite in that timezone.
- **Overlap rule**: at any instant, the summed workers of everything running — manually active
  areas (they count 24/7) plus scheduled areas inside a window — must fit the user's allotment.
  A 1-worker user can hold two 1-worker areas only if their windows never overlap; a 2-worker
  user may overlap them. The editor pre-checks conflicts live and the server enforces them
  (`409 schedule_overlap` with the conflicting day/time and areas).
- Quest scans on a scheduled area only do anything while a window is open (workers exist).

## Configuration

Grant allotments per Discord role with `scanWorkers` on permission sets. The **highest** value
across all matching sets wins; `-1` means unlimited. Users holding the `*` feature (admins) are
always unlimited.

```toml
[[server.permissions]]
guildId = "1359028304128245934"
roleId = "1483326963558653982"
scanWorkers = 2
```

Optional size limits (km²):

```toml
[server.scanAreas]
maxAreaKm2 = 5.0
recommendedAreaKm2 = 2.5
```

Area management uses the Dragonite admin API configured in `[server.dragonite]`
(`adminUrl` + `secret`); no extra setup is needed beyond the existing worker-status integration.

## Operator notes

- User areas appear in Dragonite named `vtscan_{id}_{slug}` and their schedules as
  `vtsched_{id}_r` (recurring) / `vtsched_{id}_d{n}` (dated) — don't manage these by hand;
  they're owned by the map. Idle user areas at 0 workers are **normal** — don't delete them.
  Manual deletions are tolerated (reconciliation recreates or cleans up on next server start).
- Schedule docs scale **pokemon workers only** — Dragonite rejects `scale: quest` (quest workers
  are a cap, not a pool). Each dated doc carries a distinct priority (501+) because Dragonite
  rejects equal-priority same-target docs even for non-coinciding dates.
- Worker allotment enforcement happens server-side on activation, worker changes, mode switches,
  and schedule saves; it is concurrency-safe per user.
- The `scan_area` table lives in the internal (Diadem) database. If you don't use
  `drizzle-kit push`, create it manually:

```sql
CREATE TABLE `scan_area` (
    `id` int AUTO_INCREMENT NOT NULL,
    `user_id` varchar(255) NOT NULL,
    `name` varchar(64) NOT NULL,
    `geofence` json NOT NULL,
    `area_sq_m` int NOT NULL,
    `workers` int NOT NULL DEFAULT 1,
    `active` boolean NOT NULL DEFAULT false,
    `dragonite_area_id` int,
    `created_at` timestamp NOT NULL DEFAULT (now()),
    `updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `scan_area_id` PRIMARY KEY(`id`),
    CONSTRAINT `scan_area_user_name_unique` UNIQUE(`user_id`,`name`),
    CONSTRAINT `scan_area_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
    INDEX `scan_area_user_id_idx` (`user_id`)
);
```

Schedule columns (added later — run if upgrading an existing install):

```sql
ALTER TABLE scan_area
    ADD COLUMN mode VARCHAR(16) NOT NULL DEFAULT 'manual',
    ADD COLUMN schedule JSON NULL,
    ADD COLUMN dragonite_schedule_ids JSON NULL;
```
