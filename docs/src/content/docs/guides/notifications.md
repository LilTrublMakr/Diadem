---
title: Personal Discord Notifications
---

The `/notifications` page lets members configure their own Discord DM alerts — pick what to be
notified about (species/IV/CP/gender/PVP rank/area filters) and design their own embed template
with a live preview, click-to-insert variable tags, and sample test data — gated by a plain
per-Discord-role `notifications` feature flag (unlimited subscriptions once granted, no quota).

This is a **from-scratch, self-service pipeline** independent of any existing PoracleNG
deployment. It reads real-time events straight from Golbat's own webhook system and delivers via
a Discord bot's DM API — nothing here reads from, writes to, or otherwise touches an existing
Poracle instance.

## How it works

- Golbat POSTs a batch of `{type, message}` event envelopes to every configured `[[webhooks]]`
  target on its own flush interval. This app registers as one additional target — any existing
  target (e.g. one feeding a Poracle bot) is untouched.
- The webhook receiver (`/api/custom/webhook/golbat`) dedupes re-fired events, matches them against
  every user's enabled subscriptions (in-memory index by species for speed), renders the matching
  subscription's template with Handlebars, and DMs the user via the Discord bot REST API
  (`POST /users/@me/channels` then `POST /channels/{id}/messages`) — no gateway/bot-framework
  connection needed, since the bot only ever sends.
- Phase 1 supports the `pokemon` event type only. Golbat's other event types (raid, quest,
  invasion, pokestop/lure, gym, weather, fort_update, max_battle) are a planned follow-up using the
  same infrastructure.

## Setup

1. **Discord bot token** — enable a Bot user on the Discord Application already used for OAuth (or
   create a new one), grab its token. The bot needs no special permissions to DM users, just to
   share a guild with them.
2. **Config** — add to `[server.auth.discord]` in `config/config.toml` (same block as the OAuth
   `clientId`/`clientSecret`):
   ```toml
   [server.auth.discord]
   clientId = "..."
   clientSecret = "..."
   botToken = "your-bot-token"
   webhookSecret = "some-shared-secret"
   ```
3. **Golbat webhook** — add one additional `[[webhooks]]` block to Golbat's `config.toml`:
   ```toml
   [[webhooks]]
   url = "https://your-map-domain/api/custom/webhook/golbat"
   types = ["pokemon"]
   headers = ["X-Diadem-Secret:some-shared-secret"]
   ```
   Any existing `[[webhooks]]` block (e.g. one feeding Poracle) is left exactly as-is.
4. **Permissions** — grant the `notifications` feature per Discord role (plain on/off, same as any
   other feature — not a quota like `scanWorkers`):
   ```toml
   [[server.permissions]]
   guildId = "..."
   roleId = "..."
   features = ["notifications"]
   ```

## Database

Run manually (raw SQL — do not use `pnpm db:push`, drizzle-kit sees drift on this DB's
pre-existing tables and wants to truncate them):

```sql
CREATE TABLE `notification_template` (
    `id` int AUTO_INCREMENT NOT NULL,
    `user_id` varchar(255) NOT NULL,
    `name` varchar(64) NOT NULL,
    `type` varchar(32) NOT NULL,
    `embed` json NOT NULL,
    `created_at` timestamp NOT NULL DEFAULT (now()),
    `updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `notification_template_id` PRIMARY KEY(`id`),
    CONSTRAINT `notification_template_user_type_name_unique` UNIQUE(`user_id`,`type`,`name`),
    CONSTRAINT `notification_template_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);

CREATE TABLE `notification_subscription` (
    `id` int AUTO_INCREMENT NOT NULL,
    `user_id` varchar(255) NOT NULL,
    `type` varchar(32) NOT NULL,
    `template_id` int,
    `name` varchar(64) NOT NULL,
    `enabled` boolean NOT NULL DEFAULT true,
    `filters` json NOT NULL,
    `mode` varchar(16) NOT NULL DEFAULT 'manual',
    `schedule` json,
    `created_at` timestamp NOT NULL DEFAULT (now()),
    `updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `notification_subscription_id` PRIMARY KEY(`id`),
    CONSTRAINT `notification_subscription_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
    CONSTRAINT `notification_subscription_template_id_fk` FOREIGN KEY (`template_id`) REFERENCES `notification_template`(`id`) ON DELETE SET NULL,
    INDEX `notification_subscription_user_id_idx` (`user_id`),
    INDEX `notification_subscription_type_idx` (`type`)
);
```

If `notification_subscription` already exists from before scheduling was added, run instead:

```sql
ALTER TABLE `notification_subscription` ADD `mode` varchar(16) NOT NULL DEFAULT 'manual';
ALTER TABLE `notification_subscription` ADD `schedule` json;
```

### Schedules

A subscription is either **Always** (active whenever `enabled`) or **On a schedule** — active only
during weekly and/or one-off date windows, entered in the browser's own timezone. Unlike scan-area
schedules, notification schedules have no shared worker allotment to protect, so overlapping
windows — within one schedule, or across a user's subscriptions — are explicitly allowed; there's
no conflict check. Active-ness is evaluated per-event at delivery time
(`isScheduleActiveNow` in `src/lib/features/notifications/scheduleActive.ts`), not cached.

### Notification areas

`notification_area` is a second, independent table for area-scoping subscriptions — separate from
`scan_area` (which exists to drive Dragonite worker scanning/allotment). A notification area is
just a named polygon: no workers, mode, schedule, or Dragonite mirroring, and no size limit tied to
scanning cost (500 km² cap, generous on purpose). Manage them at `/notifications/areas`; a
subscription's `filters.areaSource` can be `"own"` (a `scan_area` row), `"koji"` (a Koji "coverage
map" geofence), or `"notificationArea"` (one of these) — `filters.areaId` means a different table
depending on which.

```sql
CREATE TABLE `notification_area` (
    `id` int AUTO_INCREMENT NOT NULL,
    `user_id` varchar(255) NOT NULL,
    `name` varchar(64) NOT NULL,
    `geofence` json NOT NULL,
    `area_sq_m` int NOT NULL,
    `created_at` timestamp NOT NULL DEFAULT (now()),
    `updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `notification_area_id` PRIMARY KEY(`id`),
    CONSTRAINT `notification_area_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
    CONSTRAINT `notification_area_user_name_unique` UNIQUE(`user_id`,`name`),
    INDEX `notification_area_user_id_idx` (`user_id`)
);
```
