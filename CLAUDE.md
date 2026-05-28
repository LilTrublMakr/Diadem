# PoGo-Map-VT

A custom extension for [Diadem](https://github.com/ccev/diadem) — a SvelteKit-based Pokémon GO map interface — adding worker status monitoring, shiny stats, and encounter tracking.

## Tech Stack

- **Framework**: Diadem (SvelteKit + Svelte 5 + Tailwind CSS 4 + Bits UI)
- **Database**: MariaDB (two databases: Golbat for Pokémon data, Dragonite for worker data)
- **ORM**: Drizzle ORM (Diadem built-in) + raw mysql2 for Dragonite
- **Package manager**: pnpm

---

## Initial Setup

### 1. Clone Diadem into this directory

```powershell
# Remove existing git tracking if needed, then clone Diadem as the base
git clone https://github.com/ccev/diadem .
```

Or if the repo already has commits you want to keep, add Diadem as an upstream remote:

```powershell
git remote add diadem https://github.com/ccev/diadem
git fetch diadem
git merge diadem/main --allow-unrelated-histories
```

### 2. Install dependencies

```powershell
pnpm install
```

### 3. Set up configuration

Copy and edit the Diadem config:

```powershell
Copy-Item config/config.example.toml config/config.toml
```

Edit `config/config.toml` and set your Golbat DB credentials and enable the custom home page:

```toml
[server.golbatDb]
host = "127.0.0.1"
port = 3306
database = "golbat"
user = "YOUR_GOLBAT_USER"
password = "YOUR_GOLBAT_PASSWORD"

[server.db]
host = "127.0.0.1"
port = 3306
database = "diadem"
user = "YOUR_DIADEM_USER"
password = "YOUR_DIADEM_PASSWORD"

[client.general]
customHome = true
```

### 4. Set up environment variables

Copy `.env.example` to `.env` and fill in your Dragonite DB credentials:

```powershell
Copy-Item .env.example .env
```

Edit `.env`:

```env
DRAGONITE_DB_HOST=127.0.0.1
DRAGONITE_DB_PORT=3306
DRAGONITE_DB_NAME=dragonite
DRAGONITE_DB_USER=your_user
DRAGONITE_DB_PASSWORD=your_password
```

### 5. Run development server

```powershell
pnpm dev
```

---

## Custom Extension Files

All custom code lives in paths that Diadem treats as extension points:

| File | Description |
|------|-------------|
| `src/components/custom/Home.svelte` | Custom home page (replaces default when `customHome = true`) |
| `src/routes/(custom)/status/+page.svelte` | Live worker status page at `/status` |
| `src/routes/api/custom/workers/+server.ts` | API endpoint at `/api/custom/workers` |
| `src/lib/server/api/dragoniteStatus.ts` | Dragonite API client — calls `/status/` and `/accounts/stats` |
| `src/lib/server/db/dragonite.ts` | Direct Dragonite DB connection for historical `stats_workers` data |

---

## Data Sources

### Worker Status — Dragonite HTTP API

The status page uses Diadem's existing Dragonite config (`[server.dragonite]` in `config.toml`) to call two endpoints:

| Endpoint            | Returns                                                                  |
|---------------------|--------------------------------------------------------------------------|
| `GET /status/`      | Areas, per-worker connection status, account name, mode, route progress  |
| `GET /accounts/stats` | Aggregate counts: in_use, cooldown, banned, invalid                    |

Auth is via `X-Dragonite-Admin-Secret` (the `secret` field in `[server.dragonite]`) — same config Diadem already uses for scout.

No extra credentials needed — just make sure `[server.dragonite]` is filled in `config.toml`.

### Dragonite DB — Historical Stats (future)

For charts/history using `stats_workers`, a direct MariaDB connection is available via `$lib/server/db/dragonite`. Set credentials in `.env`.

`stats_workers` columns: `datetime`, `drago_worker`, `mode`, `api_worker`, `loc_avg`, `loc_count`, `loc_success`, `mons_seen`, `mons_enc`, `stops`, `quests`, `distance`, `retries`, `timeElapsed`, `locationDelay`, `gmos`, `gmoInitialSuccess`, `gmo0fail`–`gmo8fail`, `gmoNoCell`, `gmoGivingUp`, `gmoDelay`

### Golbat (future use)

Planned pages will use Diadem's built-in `query()` helper from `$lib/server/db/external/internalQuery` to query the Golbat database for:

- `pokemon_shiny_stats` — shiny encounter rates
- `pokemon` — recent sightings
- `pokemon_stats` — encounter totals and rarity

---

## Planned Features

- [x] Live worker status page (`/status`) — 7-second auto-refresh
- [x] Custom home page with nav and placeholders
- [ ] Shiny stats page — rates per species with 1d/3d/7d filters
- [ ] Latest seen panel — recent Pokémon sightings
- [ ] Top encounters widget — most seen species

---

## Development Commands

```powershell
pnpm dev          # Start dev server (hot reload)
pnpm build        # Production build
pnpm preview      # Preview production build
pnpm check        # Type check
pnpm lint         # Lint
pnpm format       # Format with Prettier
```
