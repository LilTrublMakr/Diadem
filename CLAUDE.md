# PoGo-Map-VT

A custom extension for [Diadem](https://github.com/ccev/diadem) — a SvelteKit-based Pokémon GO map frontend built with MapLibre GL. Connects to Golbat (scanner DB), Koji (geofences), and Dragonite (scout/worker data). Uses Discord OAuth for auth with role-based permissions. This repo adds worker status monitoring, shiny stats, and encounter tracking on top of the Diadem base.

## Commands

- **Dev server:** `pnpm run dev`
- **Build:** `pnpm run build`
- **Type check:** `pnpm run check`
- **Lint (prettier):** `pnpm run lint`
- **Format:** `pnpm run format`
- **DB push schema:** `pnpm run db:push`
- **DB studio:** `pnpm run db:studio`
- **Test:** `pnpm test` — tests are not yet implemented, ignore this.

Node 22+ required. Uses pnpm.

---

## Tech Stack

- **Framework**: Diadem (SvelteKit + Svelte 5 + Tailwind CSS 4 + Bits UI)
- **Svelte 5** with runes (`$state`, `$derived`, `$effect`, `$props`) — NOT legacy stores
- **SvelteKit** with `adapter-node`, SSR disabled globally (`export const ssr = false`)
- **Svelte compiler** has `experimental.async` enabled
- **TypeScript** strict mode
- **Tailwind CSS 4** via PostCSS
- **MapLibre GL** + `svelte-maplibre` for maps
- **Database**: MariaDB — two external databases: Golbat (Pokémon data), Dragonite (worker data)
- **ORM**: Drizzle ORM (internal DB for users/sessions) + raw mysql2 for Golbat/Dragonite
- **Paraglide.js** (inlang) for i18n — translations in `messages/*.json`, generated code in `src/lib/paraglide/`
- **bits-ui** for headless UI components
- **runed** for Svelte reactivity utilities
- **zod** for validation
- **arctic** for Discord OAuth
- **Package manager**: pnpm

---

## Initial Setup

### 1. Clone Diadem into this directory

```powershell
git clone https://github.com/ccev/diadem .
```

Or add Diadem as an upstream remote to merge into an existing repo:

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

```powershell
Copy-Item config/config.example.toml config/config.toml
```

Edit `config/config.toml`:

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

## Architecture

### Route Groups

- `(auth)/` — Discord login flow
- `(main)/` — Main map UI, uses `[[map=map]]` optional param
- `(share)/` — Shareable filter/area links
- `(custom)/` — Custom extension pages (status, shiny); shared layout with nav/footer
- `api/` — REST endpoints; `[queryMapObject=mapObject]` is the dynamic map object query route
- `api/custom/` — Custom extension API endpoints
- `assets/` — UICON proxy with sharp optimization

### Source Organization

- `src/lib/server/` — Server-only: DB, auth, API query logic, config parsing, providers
- `src/lib/services/` — Client/isomorphic services (search, user settings, uicons, masterfile)
- `src/lib/features/` — Feature state (filters, search, scout, coverage)
- `src/lib/mapObjects/` — Map object state management and types
- `src/lib/map/` — MapLibre instance management
- `src/lib/types/mapObjectData/` — Type definitions per map object (pokemon, gym, pokestop, station, nest, route, etc.)
- `src/lib/utils/` — Utility functions per entity type
- `src/components/` — UI components; `components/custom/` are user-overridable via config symlinks
- `src/params/` — SvelteKit param matchers (`map.ts`, `mapObject.ts`)

### Key Patterns

- **Providers** (`src/lib/server/provider/`): TTL-based cached data fetchers for masterfile, uicons index, remote locale, master stats
- **Permissions**: Hierarchical Discord role-based system — `everyone → loggedIn → guildId → roleId`, per-feature and per-area grants
- **State files** use `.svelte.ts` extension for reactive Svelte 5 state (e.g., `mapObjectsState.svelte.ts`, `userSettings.svelte.ts`)
- **Config**: TOML-based (`config/config.toml`, symlinked into `src/lib/server/config.toml` by `setup.sh`)
- **Custom CSS/components**: `config/` directory files symlinked into `src/` by `setup.sh`

### Data Flow

1. Server hooks (`hooks.server.ts`) chain: paraglide i18n → auth/session/permissions → server init
2. Layout load fetches config + user settings
3. Map queries: client POSTs bounds + filters to `/api/[mapObject]` → server queries Golbat DB with permission checks → returns filtered data
4. Map objects stored in reactive `mapObjectsState`, rendered via MapLibre layers

### i18n

- Import translations: `import { m } from "@/lib/paraglide/messages"`
- Use: `m.key_name()`
- Add strings to `messages/en.json` (base), append to the end of file, do not add translations, only english.
- Path alias `@` maps to `./src`

### Database

- **Internal DB** (Drizzle): users + sessions tables in `src/lib/server/db/internal/schema.ts`
- **External DB** (raw queries): Golbat scanner data via `src/lib/server/db/external/`
- **Golbat queries**: use `query<T>()` from `@/lib/server/db/external/internalQuery`; use `fence = 'world'` for global aggregates

### Documentation

An Astro Starlight-based documentation site lives under `/docs`. When adding major features, changing installation steps, or changing the config definition, update the documentation.

---

## Custom Extension Files

All custom code lives in paths that Diadem treats as extension points:

| File | Description |
|------|-------------|
| `src/components/custom/Home.svelte` | Custom home page (replaces default when `customHome = true`) |
| `src/routes/(custom)/+layout.svelte` | Shared layout for custom pages — nav, footer, dark background |
| `src/routes/(custom)/status/+page.svelte` | Live worker status page at `/status` |
| `src/routes/(custom)/shiny/+page.svelte` | Shiny stats page at `/shiny` |
| `src/routes/api/custom/workers/+server.ts` | API endpoint at `/api/custom/workers` |
| `src/routes/api/custom/shiny/+server.ts` | Shiny stats API — queries `pokemon_shiny_stats` from Golbat |
| `src/routes/api/custom/recent-shinies/+server.ts` | Recent shinies API (currently unused — see Data Sources) |
| `src/lib/server/api/dragoniteStatus.ts` | Dragonite admin API client — calls `/status/` and scout queue |
| `src/lib/server/db/dragonite.ts` | Direct Dragonite DB connection for historical `stats_workers` data |

---

## Data Sources

### Worker Status — Dragonite Admin API

Uses `[server.dragonite]` config plus the optional `adminUrl` field (port 7273) to call:

| Endpoint | Returns |
|----------|---------|
| `GET /api/status/` | Areas, worker_managers, per-worker connection_status, route progress |
| `GET /api/scout/queue` | `{ queue: N }` — current scout queue depth |

Auth is via `X-Dragonite-Admin-Secret` header (`secret` field in `[server.dragonite]`).

`connection_status === 'Executing Worker'` means connected. Workers are flattened from `area.worker_managers[].workers[]`.

### Shiny Stats — Golbat `pokemon_shiny_stats`

Table columns: `date`, `area`, `fence`, `pokemon_id`, `form_id`, `count`, `total`

Queried with `fence = 'world'` for global aggregates across all areas. Conditional aggregation produces per-period shiny/total counts (24h, 7d, 1m, 3m, 6m, all-time). Custom date ranges via `?start=&end=` params.

**Important — shiny is per-account**: `pokemon.shiny = 1` means the scanner account encountered a shiny, but shiny rolls are random per account in Pokémon GO. A shiny record in the DB does NOT mean the spawn is shiny for other players. Never gray out, hide, or deprioritize recent shiny records based on despawn status — the spawn being expired is irrelevant because it was never guaranteed for other players anyway. Do not build features that imply a shiny location is actionable for other accounts. The `pokemon_shiny_stats` table is appropriate for aggregate shiny *rates* only.

### Dragonite DB — Historical Stats (future)

For charts/history using `stats_workers`, a direct MariaDB connection is available via `$lib/server/db/dragonite`. Set credentials in `.env`.

`stats_workers` columns: `datetime`, `drago_worker`, `mode`, `api_worker`, `loc_avg`, `loc_count`, `loc_success`, `mons_seen`, `mons_enc`, `stops`, `quests`, `distance`, `retries`, `timeElapsed`, `locationDelay`, `gmos`, `gmoInitialSuccess`, `gmo0fail`–`gmo8fail`, `gmoNoCell`, `gmoGivingUp`, `gmoDelay`

---

## Planned Features

- [x] Live worker status page (`/status`) — summary cards for connected/disconnected/scout queue
- [x] Custom home page with nav and stat cards
- [x] Shiny stats page (`/shiny`) — all-period rates per species with custom date range picker
- [ ] Latest seen panel — recent Pokémon sightings from Golbat `pokemon` table
- [ ] Top encounters widget — most seen species

---

## Svelte MCP

You might be able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

### Available Svelte MCP Tools

**1. list-sections** — Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths. When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

**2. get-documentation** — Retrieves full documentation content for specific sections. After calling list-sections, analyze the returned sections (especially the use_cases field) and fetch ALL sections relevant to the task.

**3. svelte-autofixer** — Analyzes Svelte code and returns issues and suggestions. Use this whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

**4. playground-link** — Generates a Svelte Playground link with the provided code. Only call after user confirmation and NEVER if code was written to files in their project.

---

## Notes (important)

- Do not touch parts of the project unrelated to your current task
- MySQL: cannot reference aggregate aliases in HAVING/ORDER BY — use the actual expression (e.g., `HAVING SUM(\`count\`) > 0`)
- `count` is a reserved word in MySQL — always backtick-escape it in queries
- Masterfile: call `masterfileProvider.get()` before using `getMasterPokemon()` or `getNormalizedForm()`
- Shiny sprites: `getIconPokemon({ pokemon_id, form, shiny: true })` from `$lib/services/uicons.svelte` — wrap in try/catch
