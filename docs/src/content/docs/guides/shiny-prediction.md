---
title: Personal Shiny Prediction
---

Wild shiny rolls in Pokémon GO are decided per account, and they can be worked out from two
values: the spawn's encounter id and the account's internal player id. With this feature turned
on, users can link their own player ids and then see which spawns would be shiny **for them**:

- a ✨ badge and gold glow on the map marker of every spawn predicted shiny for them (in any filter
  view), plus a "Predicted shiny for you" card in the Pokémon popup
- an **Only predicted shinies for me** toggle in the Pokémon filterset editor. A filterset with it
  on only matches predicted shinies, and can be combined with species/IV/PVP conditions. The
  server keeps an in-memory index of live spawns and only asks Golbat for the species predicted
  shiny in view, so it works zoomed out. The index is fed by the Golbat `pokemon` webhook
  (`/api/custom/webhook/golbat`). While that isn't arriving or is still warming up (first 10
  minutes), the server polls Golbat's scan API instead, on demand, at most every 90 seconds. A map
  load with no recent poll waits for one (a few seconds, capped at 15) rather than showing the
  result-limit notice
- a **Only when predicted shiny for one of my linked accounts** filter on Pokémon notifications
- `predictedShiny` / `predictedShinyAccounts` template tags, plus a preset snippet

This depends on an unofficial, reverse-engineered algorithm that Niantic can change at any time.
It is off by default.

## How it works

For each linked account the server computes
`SHA1(encounter id as uint64 little-endian ‖ player id)`, uses the first 8 bytes (little-endian)
as a `java.util.Random` seed, takes its first `next(31)` and computes `(N × next(31)) >> 31` for
the species' current 1/N shiny odds. A result of 0 means shiny for that account. This is Java's
`nextInt` power-of-two shortcut, which the game applies to every N (Java's real `nextInt` uses a
modulo for odds like 1/25, the game doesn't), so a spawn shiny at 1/512 is shiny at every better
odds too.

The odds N come from the stats DB: each species' last-24h scanner shiny rate is matched to the
closest known odds (1/512, 1/128, 1/64, 1/25, 1/10), with a strong lean toward 1/512 when there
isn't much data. A species with 2000+ all-time encounters and no shinies is treated as
shiny-locked, so nothing is predicted for it. Rates rebuild every 5 minutes.

Player ids never leave the server once they're saved. The profile page only shows the last 4
characters, and predictions are worked out server-side (`/api/custom/shiny-predict`).

## Getting a player id

The id is **not** shown anywhere in the normal game. It is the `invited_player_ids` value seen by
another account that invites this one to a private raid lobby, read with a modified game client.
It is either 16 lowercase hex characters, or 21 digits for Google-signup accounts. The obfuscated
`E:...` id exposed for gym defenders does not work.

Using a modified client is against Niantic's terms of service and puts that account at risk.

## Setup

1. Create the table (don't use `pnpm db:push` on this database):

   ```sql
   CREATE TABLE `shiny_account` (
       `id` int AUTO_INCREMENT NOT NULL,
       `user_id` varchar(255) NOT NULL,
       `label` varchar(64) NOT NULL,
       `player_id` varchar(32) NOT NULL,
       `created_at` timestamp DEFAULT (now()),
       CONSTRAINT `shiny_account_id` PRIMARY KEY(`id`),
       CONSTRAINT `shiny_account_user_player_unique` UNIQUE(`user_id`, `player_id`),
       CONSTRAINT `shiny_account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
   );
   ```

2. Turn it on in `config.toml`:

   ```toml
   [client.general]
   shinyPrediction = true
   ```

3. Event odds. The stats-based estimate uses 24h data, so it lags the first hour or more of a
   boost (it misses shinies then, it never invents them). Two things cover that:

   - **Community Day is automatic**: while the [ScrapedDuck](https://github.com/bigfoott/ScrapedDuck)
     event feed (the same one the events page uses) lists a Community Day as running, its featured
     spawns use 1/25. The feed's times are local wall-clock times, so set your timezone, since
     Docker containers usually run in UTC:

     ```toml
     [server]
     shinyEventTimezone = "America/New_York"
     # shinyAutoCommunityDay = false   # to turn the automatic CD odds off
     ```

   - **Manual overrides** for anything else. Scheduled (times without an offset use
     `shinyEventTimezone`; leave `start`/`end` out for open-ended), and later entries win:

     ```toml
     [[server.shinyOddsOverrides]]
     pokemon = 570
     odds = 25
     start = "2026-10-10T14:00:00"
     end = "2026-10-10T17:00:00"
     ```

     or always-on: `[server.shinyOddsOverrides]` with `570 = 25` (one form or the other, not both).

   Overrides and the feed are re-read every 5 minutes along with the stats. Disguised spawns (Zorua, Ditto) are listed under their disguise species until a scanner
   encounters them, so those only get the right odds once encountered.

4. Users link accounts under **Profile → ✨ Personal shiny prediction** (up to 10 per user).
