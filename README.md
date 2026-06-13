# PoGo Map VT

A Pokémon GO map for Vermont, built as a custom extension on top of [Diadem](https://github.com/ccev/diadem) — a SvelteKit-based map frontend that connects to [Golbat](https://github.com/UnownHash/Golbat) and [Dragonite](https://github.com/UnownHash/Dragonite-Public).

## Features

- **Live map** — Pokémon, gyms, PokéStops, raids, and more via Diadem
- **Worker status** (`/status`) — real-time connected/disconnected worker counts and scout queue depth pulled from the Dragonite admin API
- **Shiny stats** (`/shiny`) — per-species shiny rates across 24h, 7d, 1m, 3m, and all-time windows; Wilson-score weighted ranking; shiny sprites; sortable and searchable
- **Seen stats** (`/seen`) — per-species encounter counts across all time slots, sortable by count or name
- **Pokémon detail** (`/pokemon/{id}`) — base stats, types, moves, evolutions, buddy distance, and scanner encounter/shiny stats
- **Custom home page** — stat cards: top encounters (24h), rarest spawns (24h), top 100% IV species (24h), shiny rates

---

## Requirements

- Node 22+
- pnpm
- MariaDB (Diadem internal DB + Golbat DB + pokemon_stats DB)
- A running [Golbat](https://github.com/UnownHash/Golbat) instance
- A running [Dragonite](https://github.com/UnownHash/Dragonite-Public) instance (optional — for worker status)
- A `pokemon_stats` database populated by your stats aggregator (for encounter/shiny stats pages)

---

## Setup

### 1. Clone this repo

```powershell
git clone <this-repo-url> pogo-map-vt
cd pogo-map-vt
```

### 2. Merge in the Diadem base

This repo is an extension of Diadem. Pull in Diadem's files:

```powershell
git remote add diadem https://github.com/ccev/diadem
git fetch diadem
git merge diadem/main --allow-unrelated-histories
```

Resolve any merge conflicts, then continue.

### 3. Install dependencies

```powershell
pnpm install
```

### 4. Configure the application

Copy the example config and edit it:

```powershell
Copy-Item config/config.example.toml config/config.toml
```

Open `config/config.toml` and fill in the required sections:

**Golbat connection** (external scanner DB — SELECT access only):

```toml
[server.db]
host = "127.0.0.1"
port = 3306
database = "golbat"
user = "your_golbat_user"
password = "your_golbat_password"
```

**Diadem internal DB** (users and sessions — full access):

```toml
[server.internalDb]
host = "127.0.0.1"
port = 3306
database = "diadem"
user = "your_diadem_user"
password = "your_diadem_password"
```

**Dragonite** (for scout and worker status):

```toml
[server.dragonite]
url = "http://127.0.0.1:7272"    # Dragonite scout port
secret = "your_dragonite_secret"
adminUrl = "http://127.0.0.1:7273/api/"  # Dragonite admin panel port
```

**General client options:**

```toml
[client.general]
customHome = true           # show custom home at /; map moves to /map
defaultLat = 44.2601        # starting map position for new users
defaultLon = -72.5754
defaultZoom = 9
# filterCaretStyle = "chevron"  # "chevron" (default, > → v) or "caret" (^ → v)
```

**Default filters** — override the filter state new users start with (saved settings always win):

```toml
# Show Pokémon by default with a 100% IV preset
[client.defaultFilters.pokemon]
enabled = true
[[client.defaultFilters.pokemon.filters]]
title = "100% IV"
emoji = "💯"
iv = { min = 100, max = 100 }
modifiers = { glow = { color = "rgba(251, 44, 54, {})" } }

# Hide gyms by default
[client.defaultFilters.gym]
enabled = false
```

See `config/config.example.toml` for the full `[client.defaultFilters]` reference.

**Discord auth** (optional but recommended):

```toml
[server.auth]
enabled = true
optional = true

[server.auth.discord]
clientId = "your_discord_client_id"
clientSecret = "your_discord_client_secret"
redirectUri = "https://your-domain.com/login/discord/callback"
```

**Permissions** — grant everyone access to everything:

```toml
[[server.permissions]]
everyone = true
features = ["*"]
```

### 5. Set up environment variables

```powershell
Copy-Item .env.example .env
```

Edit `.env`:

```env
# Port the app listens on
DIADEM_PORT=3900

# Diadem internal DB (only needed for Docker deployments)
MARIADB_ROOT_PASSWORD=your_root_password
MARIADB_DATABASE=diadem
MARIADB_USER=your_diadem_user
MARIADB_PASSWORD=your_diadem_password

# Dragonite DB — for historical stats features (optional)
DRAGONITE_DB_HOST=127.0.0.1
DRAGONITE_DB_PORT=3306
DRAGONITE_DB_NAME=dragonite
DRAGONITE_DB_USER=your_dragonite_user
DRAGONITE_DB_PASSWORD=your_dragonite_password

# Stats DB — aggregated encounter/shiny data (required for stats pages)
STATS_DB_HOST=127.0.0.1
STATS_DB_PORT=3306
STATS_DB_NAME=pokemon_stats
STATS_DB_USER=your_stats_user
STATS_DB_PASSWORD=your_stats_password
```

### 6. Run the Diadem setup script

```bash
bash setup.sh
```

This symlinks `config/config.toml` and any custom CSS/components into the right places under `src/`.

### 7. Start the dev server

```powershell
pnpm dev
```

The app will be available at `http://localhost:3900` (or the port set in `.env`).

---

## Production Build

```powershell
pnpm build
pnpm preview   # test the production build locally
```

Or use Docker:

```powershell
Copy-Item docker-compose.example.yml docker-compose.yml
# edit docker-compose.yml to match your setup
docker compose up -d
```

---

## Development Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server with hot reload |
| `pnpm build` | Production build |
| `pnpm preview` | Preview production build locally |
| `pnpm check` | TypeScript type check |
| `pnpm lint` | Run Prettier lint |
| `pnpm format` | Auto-format with Prettier |
| `pnpm db:push` | Push Drizzle schema to internal DB |
| `pnpm db:studio` | Open Drizzle Studio |

---

## Custom Extension Files

| File | Description |
|------|-------------|
| `src/components/custom/Home.svelte` | Custom home page |
| `src/routes/(custom)/+layout.svelte` | Shared layout for custom pages (nav + footer) |
| `src/routes/(custom)/status/+page.svelte` | Worker status page at `/status` |
| `src/routes/(custom)/shiny/+page.svelte` | Shiny stats page at `/shiny` |
| `src/routes/(custom)/seen/+page.svelte` | Seen encounter counts at `/seen` |
| `src/routes/(custom)/pokemon/[id]/+page.svelte` | Per-pokémon detail page at `/pokemon/{id}` |
| `src/routes/api/custom/workers/+server.ts` | Worker status API |
| `src/routes/api/custom/shiny/+server.ts` | Shiny stats API |
| `src/routes/api/custom/seen/+server.ts` | Total seen count (24h) |
| `src/routes/api/custom/seen-species/+server.ts` | Per-species encounter counts |
| `src/routes/api/custom/top-encounters/+server.ts` | Top encounters + recent rare (24h) |
| `src/routes/api/custom/hundos/+server.ts` | Top 100% IV species (24h) |
| `src/routes/api/custom/pokemon/[id]/+server.ts` | Per-pokémon stats (all time slots) |
| `src/lib/server/api/dragoniteStatus.ts` | Dragonite admin API client |
| `src/lib/server/db/stats.ts` | Stats DB connection (`queryStats<T>()`) |

---

## Credits

Built on [Diadem](https://github.com/ccev/diadem) by [ccev](https://github.com/ccev).
Scanner data from [Golbat](https://github.com/UnownHash/Golbat) and [Dragonite](https://github.com/UnownHash/Dragonite-Public) by [UnownHash](https://github.com/UnownHash).
