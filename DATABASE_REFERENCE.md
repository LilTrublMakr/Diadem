# pokemon_stats Database — Table Reference

This document describes every table in the `pokemon_stats` database for use
by a frontend or API project that reads and displays the aggregated data.

---

## Key Concepts

### Time Slots

Every aggregation table has a `time_slot` column. All queries to these tables
must filter by `time_slot`. Available values:

| Value | Window | How it works |
|---|---|---|
| `1d` | Last 1 day | Rebuilt hourly from daily snapshots |
| `1w` | Last 7 days | Rebuilt hourly from daily snapshots |
| `1m` | Last 30 days | Rebuilt hourly from daily snapshots |
| `3m` | Last 90 days | Rebuilt hourly from daily snapshots |
| `all` | All time | Accumulated permanently, never trimmed |

### Pokemon ID + Form

Every aggregation table is keyed by `(pokemon_id, form)`. `pokemon_id` is the
National Pokédex number (e.g. 25 = Pikachu). `form` is the form index — `0`
is always the default form. A pokemon with no form data is stored as form `0`.

---

## Aggregation Tables

These are the tables your website queries directly. They are always up to date
within one hour.

---

### `pokemon_summary`

The top-level stats card for a pokemon. One row per
`(time_slot, pokemon_id, form)`.

| Column | Type | Description |
|---|---|---|
| `time_slot` | ENUM | Time window (`1d`, `1w`, `1m`, `3m`, `all`) |
| `pokemon_id` | SMALLINT UNSIGNED | National Pokédex number |
| `form` | SMALLINT UNSIGNED | Form index (0 = default) |
| `total_count` | INT UNSIGNED | Total encounters seen |
| `shiny_count` | INT UNSIGNED | Encounters that were shiny |
| `event_count` | INT UNSIGNED | Encounters that were event pokemon |
| `ditto_count` | INT UNSIGNED | Encounters that were secretly Ditto |
| `last_updated` | DATETIME | When this row was last refreshed |

**Example query — summary card for Pikachu default form, last 7 days:**
```sql
SELECT
    total_count,
    shiny_count,
    ROUND(shiny_count / total_count * 100, 2) AS shiny_rate,
    ditto_count
FROM pokemon_stats.pokemon_summary
WHERE time_slot = '1w' AND pokemon_id = 25 AND form = 0;
```

**Example query — list all pokemon seen in the last day with shiny counts:**
```sql
SELECT pokemon_id, form, total_count, shiny_count
FROM pokemon_stats.pokemon_summary
WHERE time_slot = '1d'
ORDER BY total_count DESC;
```

---

### `pokemon_iv_distribution`

IV histogram for a pokemon. One row per unique IV value per
`(time_slot, pokemon_id, form)`. IV is stored as a percentage (0.00–100.00)
rounded to 2 decimal places.

Only encounters where all three IVs (attack, defense, stamina) were known are
counted here. This means `total_count` in `pokemon_summary` will always be
higher than the sum of counts here.

| Column | Type | Description |
|---|---|---|
| `time_slot` | ENUM | Time window |
| `pokemon_id` | SMALLINT UNSIGNED | National Pokédex number |
| `form` | SMALLINT UNSIGNED | Form index |
| `iv` | FLOAT UNSIGNED | IV percentage (e.g. `93.33`, `100.0`) |
| `count` | INT UNSIGNED | Number of encounters at this IV value |

**Example query — full IV histogram for charting:**
```sql
SELECT iv, count
FROM pokemon_stats.pokemon_iv_distribution
WHERE time_slot = '1m' AND pokemon_id = 25 AND form = 0
ORDER BY iv DESC;
```

**Example query — count of 100% IV encounters:**
```sql
SELECT count
FROM pokemon_stats.pokemon_iv_distribution
WHERE time_slot = 'all' AND pokemon_id = 25 AND form = 0 AND iv = 100.0;
```

---

### `pokemon_move_stats`

Move pair popularity. One row per unique `(move_1, move_2)` combination per
`(time_slot, pokemon_id, form)`. Only encounters where both moves were known
are counted.

`move_1` and `move_2` are move IDs from the game data — your display project
will need a move ID → name lookup table to show human-readable names.

| Column | Type | Description |
|---|---|---|
| `time_slot` | ENUM | Time window |
| `pokemon_id` | SMALLINT UNSIGNED | National Pokédex number |
| `form` | SMALLINT UNSIGNED | Form index |
| `move_1` | SMALLINT UNSIGNED | Fast move ID |
| `move_2` | SMALLINT UNSIGNED | Charged move ID |
| `count` | INT UNSIGNED | Number of encounters with this move combo |

**Example query — top 5 move combos for Pikachu all time:**
```sql
SELECT move_1, move_2, count
FROM pokemon_stats.pokemon_move_stats
WHERE time_slot = 'all' AND pokemon_id = 25 AND form = 0
ORDER BY count DESC
LIMIT 5;
```

---

### `pokemon_size_stats`

Size distribution for a pokemon. One row per size value per
`(time_slot, pokemon_id, form)`. Only encounters where size was known are
counted.

Size values are integers. Known values:

| Value | Label |
|---|---|
| `1` | XS (Extra Small) |
| `2` | S (Small) |
| `3` | M (Medium / Normal) |
| `4` | L (Large) |
| `5` | XL (Extra Large) |

| Column | Type | Description |
|---|---|---|
| `time_slot` | ENUM | Time window |
| `pokemon_id` | SMALLINT UNSIGNED | National Pokédex number |
| `form` | SMALLINT UNSIGNED | Form index |
| `size` | TINYINT UNSIGNED | Size value (1–5) |
| `count` | INT UNSIGNED | Number of encounters at this size |

**Example query — size breakdown for charting:**
```sql
SELECT size, count
FROM pokemon_stats.pokemon_size_stats
WHERE time_slot = '3m' AND pokemon_id = 25 AND form = 0
ORDER BY size;
```

---

### `pokemon_gender_stats`

Gender distribution for a pokemon. One row per gender value per
`(time_slot, pokemon_id, form)`.

Gender values are integers:

| Value | Label |
|---|---|
| `1` | Male |
| `2` | Female |
| `3` | Genderless |

| Column | Type | Description |
|---|---|---|
| `time_slot` | ENUM | Time window |
| `pokemon_id` | SMALLINT UNSIGNED | National Pokédex number |
| `form` | SMALLINT UNSIGNED | Form index |
| `gender` | TINYINT UNSIGNED | Gender value (1, 2, or 3) |
| `count` | INT UNSIGNED | Number of encounters of this gender |

**Example query — gender ratio:**
```sql
SELECT gender, count
FROM pokemon_stats.pokemon_gender_stats
WHERE time_slot = '1w' AND pokemon_id = 25 AND form = 0
ORDER BY gender;
```

---

### `pokemon_ditto_disguise`

Tracks which species Ditto has been disguised as. One row per
`(time_slot, display_pokemon_id, display_pokemon_form)`.

This table is keyed by the **disguise** species, not by Ditto's own ID (132).
Use this table on Ditto's page to show its disguise history.
Use `ditto_count` in `pokemon_summary` on any other species' page to show how
many of that species were secretly Ditto.

| Column | Type | Description |
|---|---|---|
| `time_slot` | ENUM | Time window |
| `display_pokemon_id` | SMALLINT UNSIGNED | The species Ditto appeared as |
| `display_pokemon_form` | SMALLINT UNSIGNED | The form of that disguise |
| `count` | INT UNSIGNED | Number of times Ditto used this disguise |

**Example query — Ditto's most common disguises all time:**
```sql
SELECT display_pokemon_id, display_pokemon_form, count
FROM pokemon_stats.pokemon_ditto_disguise
WHERE time_slot = 'all'
ORDER BY count DESC;
```

**Example query — how many Dittos appeared as Pidgey (#16):**
```sql
SELECT count
FROM pokemon_stats.pokemon_ditto_disguise
WHERE time_slot = '1m' AND display_pokemon_id = 16 AND display_pokemon_form = 0;
```

---

## Internal / Background Tables

These tables are not intended to be queried by the display project. They are
used internally by the webhook service and the MariaDB EVENT.

---

### `pokemon_daily_summary` / `pokemon_daily_iv` / `pokemon_daily_moves` / `pokemon_daily_size` / `pokemon_daily_gender` / `pokemon_daily_ditto`

Six tables that store one row per calendar date per dimension combination.
They are the source data that the hourly MariaDB EVENT uses to rebuild the
`1d`, `1w`, `1m`, `3m` rows in the aggregation tables above. Rows older than
90 days are automatically deleted since they are no longer needed for any
rolling window.

Your display project should never need to query these directly — use the
aggregation tables instead.

---

### `pokemon_seen_encounters`

Deduplication table used by the webhook receiver to ensure each encounter is
counted exactly once even if Golbat fires the webhook multiple times for the
same encounter. Rows are automatically deleted after a few hours.

Your display project should never query this table.

---

## Recommended Query Pattern

For any pokemon page, fetch all time slots in a single query rather than one
per slot:

```sql
SELECT time_slot, total_count, shiny_count, event_count, ditto_count
FROM pokemon_stats.pokemon_summary
WHERE pokemon_id = 25 AND form = 0
ORDER BY FIELD(time_slot, '1d', '1w', '1m', '3m', 'all');
```

Then use the results to populate whichever time slot tab the user has selected
on the frontend without additional round-trips.
