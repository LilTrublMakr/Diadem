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
- **Database**: MariaDB — three external databases: Golbat (scanner/map data), Dragonite (worker data), pokemon_stats (aggregated encounter/shiny stats)
- **ORM**: Drizzle ORM (internal DB for users/sessions) + raw mysql2 for external DBs
- **Paraglide.js** (inlang) for i18n — translations in `messages/*.json`, generated code in `src/lib/paraglide/`
- **bits-ui** for headless UI components
- **runed** for Svelte reactivity utilities
- **zod** for validation
- **better-auth** for Discord OAuth and session management (replaced `arctic`)
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

STATS_DB_HOST=127.0.0.1
STATS_DB_PORT=3306
STATS_DB_NAME=pokemon_stats
STATS_DB_USER=your_stats_user
STATS_DB_PASSWORD=your_stats_password
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

### Auth

- **Better Auth** (`better-auth` npm package) handles Discord OAuth, session cookies, and token management — replaces the old custom Oslo/arctic-based "rotom auth"
- Auth config: `src/lib/server/auth/betterAuth.ts` — exports `auth`, `signInWithDiscord`, `signOut`, `getAuthSession`, `getDiscordAccessToken`, `isAuthRequired()`
- `isAuthRequired()` lives in `betterAuth.ts`, not `config.server.ts`
- Permissions are computed fresh on every login from config + Discord guild/role data, then TTL-cached in memory (`hooks.server.ts`); they are **not stored in the DB**
- `user` table has no `permissions` column; `account` and `verification` tables added for Better Auth
- Discord OAuth callback path: `/api/auth/callback/discord` (Better Auth built-in) — **not** `/login/discord/callback`; the Discord app's redirect URI must match
- Vite SSR requires `ssr: { noExternal: ["better-auth"] }` in `vite.config.ts`
- Config fields: `[server.auth]` requires `secret` (random 32+ char string) and `baseUrl` (public-facing URL); `[server.auth.discord]` no longer has `redirectUri`

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
- **Golbat DB** (raw queries): map/scanner data via `src/lib/server/db/external/internalQuery` — use `query<T>()`; configured via `[server.db]` in `config.toml`
- **Stats DB** (raw queries): aggregated encounter/shiny stats via `src/lib/server/db/stats` — use `queryStats<T>()`; configured via `STATS_DB_*` in `.env` (read with `$env/static/private`)
- **Dragonite DB** (raw queries): historical worker stats via `src/lib/server/db/dragonite` — use `queryDragonite<T>()`; configured via `DRAGONITE_DB_*` in `.env`
- **`pokemon` table is deprecated** — do not query it; all encounter/shiny data now comes from the `pokemon_stats` database
- Full `pokemon_stats` schema is documented in `DATABASE_REFERENCE.md`

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
| `src/routes/(custom)/seen/+page.svelte` | Seen (encounter) stats page at `/seen` — per-species counts, all time slots |
| `src/routes/(custom)/pokedex/[id]/+page.svelte` | Per-pokemon detail page at `/pokedex/{id}` — base stats, moves, evolutions, buddy dist, scanner stats |
| `src/routes/api/custom/pokedex/[id]/+server.ts` | Per-pokemon stats API — queries all 5 stats tables for a given pokemon_id |
| `src/routes/api/custom/workers/+server.ts` | API endpoint at `/api/custom/workers` |
| `src/routes/api/custom/shiny/+server.ts` | Shiny stats API — queries `pokemon_stats.pokemon_summary` |
| `src/routes/api/custom/seen/+server.ts` | Seen (24h) count — `SUM(total_count)` from `pokemon_summary WHERE time_slot = '1d'` |
| `src/routes/api/custom/seen-species/+server.ts` | Per-species encounter counts across all time slots from `pokemon_summary` |
| `src/routes/api/custom/top-encounters/+server.ts` | Top encounters (24h) + recent rare (24h) from `pokemon_summary` |
| `src/routes/api/custom/hundos/+server.ts` | Top hundo species (24h) from `pokemon_iv_distribution WHERE iv = 100.0` |
| `src/routes/api/custom/recent-shinies/+server.ts` | Unused — still queries deprecated `pokemon` table, no replacement yet |
| `src/routes/api/custom/tracker/[id]/+server.ts` | Per-pokemon tracker API — GET returns `{ shiny, hundo, nundo, shundo }`, POST updates (insert or update); 401 if not logged in |
| `src/routes/api/custom/tracker/+server.ts` | All-tracker GET — returns `{ pokemonId, shiny, hundo, nundo, shundo }[]` for logged-in user |
| `src/routes/(custom)/profile/+page.svelte` | User profile page at `/profile` — shows tracked shundos, hundos, shinies, nundos (in that order) |
| `src/lib/server/db/internal/schema.ts` | Internal DB schema — includes `pokemon_tracker` table (userId, pokemonId, shiny, hundo, nundo, shundo, updatedAt; unique on userId+pokemonId) |
| `src/lib/features/trackerState.svelte.ts` | Global reactive tracker state — `loadTrackers()`, `getTrackers()`, `setTrackerEntry()`, `isTrackerLoaded()`; `TrackerEntry = { shiny, hundo, nundo, shundo }` |
| `src/components/custom/TrackedPokemonImg.svelte` | Drop-in `<img>` wrapper — badge positions: ✨ top-left, 🌟 top-right, 0️⃣ bottom-left, 💯 bottom-right |
| `src/lib/server/db/stats.ts` | Stats DB connection (`queryStats<T>()`) — reads `STATS_DB_*` via `$env/static/private` |
| `src/lib/server/api/dragoniteStatus.ts` | Dragonite admin API client — calls `/status/` and scout queue |
| `src/lib/server/db/dragonite.ts` | Dragonite DB connection for historical `stats_workers` data (future use) |

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

### Pokemon Stats DB — `pokemon_stats` database

Full schema in `DATABASE_REFERENCE.md`. All encounter and shiny data comes from here. The `pokemon` table (Golbat) is **deprecated** — do not query it.

Key tables:

| Table | Used for |
| ----- | -------- |
| `pokemon_summary` | Total encounters + shiny counts per species, per time slot |
| `pokemon_iv_distribution` | IV histogram per species; `iv = 100.0` for 100% IV encounters |
| `pokemon_move_stats` | Move pair popularity (future) |
| `pokemon_size_stats` | Size distribution (future) |
| `pokemon_gender_stats` | Gender distribution (future) |

**Time slots**: `1d` (last 24h), `1w` (last 7d), `1m` (last 30d), `3m` (last 90d), `all` (all time). Data rebuilds **every 5 minutes** — stats are not real-time. Always filter by `time_slot`.

**Queries**: use `queryStats<T>()` from `@/lib/server/db/stats`. The connection targets `pokemon_stats` as its default database, so no schema prefix is needed (e.g. `FROM pokemon_summary`, not `FROM pokemon_stats.pokemon_summary`).

**Important — shiny is per-account**: shiny records reflect what the scanner account encountered. Shiny rolls are random per account in Pokémon GO — a shiny encounter does NOT mean the spawn is shiny for other players. Never build features that imply a shiny location is actionable for other accounts. Use `shiny_count`/`total_count` for aggregate shiny *rates* only.

### Dragonite DB — Historical Stats (future)

For charts/history using `stats_workers`, a direct MariaDB connection is available via `$lib/server/db/dragonite`. Set credentials in `.env`.

`stats_workers` columns: `datetime`, `drago_worker`, `mode`, `api_worker`, `loc_avg`, `loc_count`, `loc_success`, `mons_seen`, `mons_enc`, `stops`, `quests`, `distance`, `retries`, `timeElapsed`, `locationDelay`, `gmos`, `gmoInitialSuccess`, `gmo0fail`–`gmo8fail`, `gmoNoCell`, `gmoGivingUp`, `gmoDelay`

---

## Planned Features

- [x] Live worker status page (`/status`) — summary cards for connected/disconnected/scout queue
- [x] Custom home page with nav and stat cards
- [x] Shiny stats page (`/shiny`) — per-period rates with Wilson-score weighted ranking
- [x] Top encounters widget — most seen species (24h) from stats DB
- [x] Recent rare encounters — rarest species (24h) from stats DB
- [x] Top 100% IV species widget (24h) from stats DB
- [x] Seen stats page (`/seen`) — per-species encounter counts, all time slots, count/name sort
- [x] Per-pokemon detail page (`/pokedex/{id}`) — base stats, types, moves, evolutions, buddy dist, scanner stats
- [x] Personal shiny/hundo tracker — per-user DB table, checkboxes on pokemon detail page and map popup, badges on all pokemon images, profile page at `/profile`
- [x] Nundo (0% IV) + shundo (shiny 100% IV) tracker — extends tracker with nundo/shundo booleans; badges on pokemon images; DB columns `nundo`/`shundo` on `pokemon_tracker`
- [x] NavBar username → dropdown with avatar, Profile link, Logout
- [ ] Worker history charts — using `stats_workers` from Dragonite DB

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
- `filterCaretStyle` config option (`[client.general]`): `"chevron"` (default, `>` rotates to `v`) or `"caret"` (`^` rotates to `v`) — controls expand indicator in filter sections; type in `configTypes.d.ts` `General`
- `[client.defaultFilters]` config section: overrides the filter state new users start with; deep-merged over built-in defaults; user's saved settings always win. Defined in `configTypes.d.ts` as `DefaultFilters`; normalized by `normalizeConfigFilters()` in `userSettings.svelte.ts`. Filterset fields: `title`, `emoji` or `uicon`, `id`, `enabled`, plus any filter-specific keys (`iv`, `cp`, `levels`, `bosses`, `modifiers`, etc.). Glow/background colors use `rgba(r, g, b, {})` — `{}` is the opacity placeholder.
- `updateUserSettings()` stores only the diff from defaults (via `computeOverrides()`), not the full settings object — reduces localStorage/DB footprint and makes default overrides work correctly for new users
- MySQL: cannot reference aggregate aliases in HAVING/ORDER BY — use the actual expression (e.g., `HAVING SUM(\`count\`) > 0`)
- `count` is a reserved word in MySQL — always backtick-escape it in queries
- Masterfile: call `masterfileProvider.get()` before using `getMasterPokemon()` or `getNormalizedForm()`
- `MasterPokemon` now includes `quickMoves`, `chargedMoves` (with name/type/power), `evolutions` (pokemonId/form/candyCost), `buddyDistance` — parsed from WatWowMap raw JSON
- Bug fixed: raw JSON uses `mythic` not `mythical` — parser now reads the correct field
- Shiny sprites: `getIconPokemon({ pokemon_id, form, shiny: true })` from `$lib/services/uicons.svelte` — wrap in try/catch
- Custom pages using `getIconPokemon` for images: always await `initAllIconSets()` alongside `loadMasterFile()` before rendering (race condition on direct page refresh — masterfile can resolve before icon index loads). Pattern: `Promise.all([loadMasterFile(), initAllIconSets()]).then(() => { ready = true; })`
- Tracker state (`trackerState.svelte.ts`): `loadTrackers()` is called in `(custom)/+layout.svelte`, `(main)/+layout.svelte`, and `Home.svelte` — Home is self-contained (not under custom layout), and the map lives under main layout. All three must call it independently; the function is idempotent (no-ops after first load).
- `TrackedPokemonImg` replaces bare `<img>` tags wherever pokemon images appear — import from `@/components/custom/TrackedPokemonImg.svelte`; pass `pokemonId`, `src`, optional `alt` and `class`; badges: ✨ top-left, 🌟 top-right, 0️⃣ bottom-left, 💯 bottom-right
- Tracker `toggleTracker` type is `'shiny' | 'hundo' | 'nundo' | 'shundo'`; button/section order everywhere: shundo → hundo → shiny → nundo
- `pokemon_tracker` DB migration (run manually if columns missing): `ALTER TABLE pokemon_tracker ADD nundo boolean DEFAULT false NOT NULL; ALTER TABLE pokemon_tracker ADD shundo boolean DEFAULT false NOT NULL;`
- `getBestRank` in `pokemonUtils.ts` casts `data.pvp` to `Record<string, PvpStats[] | undefined>` because `League.MASTER` is not in the typed pvp object — do not remove the cast
- Diadem upstream strategy: do NOT run `git merge diadem/main` (250 file conflicts from native mobile app + duplicate cherry-picks). Use surgical `git cherry-pick <hash>` per commit. Tier order: security → bug fixes → features. After each pick run `pnpm run check`.
- TypeScript cannot import types from parameterized route files (e.g. `../../api/custom/pokemon/[id]/+server`) — inline the type in the consuming file instead
- TypeScript 5.8 DOM lib has incomplete `Highlight` / `HighlightRegistry` types (only `forEach`, no `add`/`delete`/`set`) — cast `highlight` to `Set<AbstractRange>` and `CSS.highlights` to `Map<string, Highlight>` at call sites

<!-- gortex:communities:start -->
## Codebase Overview (generated by Gortex)

- **Languages:** javascript (primary), bash, contract, css, dockerfile, dotenv, gitattributes, gitignore, go, html, image, json, makefile, markdown, mcp_config, svelte, toml, typescript, yaml
- **Most-referenced symbols:** `push` (4164 usages), `push` (4164 usages), `Icon` (1650 usages), `spread_props` (1649 usages), `spread_props` (1649 usages), `Icon` (1641 usages), `sanitize_props` (1637 usages), `slot` (1637 usages), `slot` (1637 usages), `sanitize_props` (1637 usages)
- **Graph size:** 51865 nodes, 163180 edges
- **Breakdown:** 4 config_keys, 64 contracts, 103 docs, 956 files, 32200 functions, 22 generic_params, 18 images, 2647 imports, 22 interfaces, 1442 locals, 50 methods, 60 modules, 1015 params, 2 resources, 31 todos, 1199 types, 12030 variables

## MANDATORY: Use Gortex MCP tools instead of Read/Grep/Glob

Gortex is running as an MCP server. You **MUST** prefer graph queries over file reads on every task in this repo — `search_symbols`, `find_usages`, `get_symbol_source`, `get_editing_context`, `smart_context`, `edit_symbol` / `edit_file` / `rename_symbol` / `batch_edit`. PreToolUse hooks deny `Read` / `Grep` / `Glob` against indexed source; the deny message names the right tool. The full per-tool catalog loads via `tools/list` — not restated here.

### Calibration: the graph narrows scope, source confirms behavior

The mandate above stands — but graph queries *narrow scope*, they do not *replace reading the implementation*. The graph tells you **where** the logic lives and **what** connects to it; the source tells you **how** it behaves. For the symbol you are about to change or depend on, read its full body with `get_symbol_source` — do not act on a one-line summary alone.

Be especially deliberate with **behavior-critical code** — database migrations, retry / fallback / error-recovery paths, compatibility shims, concurrency-sensitive sections, and the tests that pin them. For these, call `get_symbol_source` and read the real implementation; never pass `compress_bodies:true`, which elides exactly the branches that carry the risk. Reserve compressed bodies and graph summaries for breadth (surveying many symbols); use full source for the few you are about to commit to.

## Required workflow (every task on this repo)

These are not suggestions — run each step at the trigger.

1. **Always call** `graph_stats` first to confirm the daemon is up and orient (check `per_repo` in multi-repo mode).
2. If `total_nodes` is 0, **call** `index_repository` with `"."` before anything else.
3. In multi-repo mode, **call** `get_active_project` to check scope; use `set_active_project` to switch.
4. For every new task, **call** `smart_context` with the task description before reading any file.
5. Before editing a file, **call** `get_editing_context` on it first.
6. Before changing any function signature, **call** `verify_change` to catch broken callers and interface implementors (cross-repo).
7. For any refactor, **call** `get_edit_plan` then `batch_edit` to apply atomically.
8. After every edit, **call** `check_guards` then `get_test_targets`.

<!-- gortex:skills:start -->
## Community Skills

| Area | Description | Skill |
|------|-------------|-------|
| Svelte Kit Adapter Node Chunks 1 Dirs Push | 9032 symbols | `/gortex-svelte-kit-adapter-node-chunks-1-dirs-push` |
| Svelte Kit Output Server Chunks Push | 9027 symbols | `/gortex-svelte-kit-output-server-chunks-push` |
| Svelte Kit Adapter Node Chunks 7 Dirs | 397 symbols | `/gortex-svelte-kit-adapter-node-chunks-7-dirs` |
| Svelte Kit Output Server Chunks Createvaul | 358 symbols | `/gortex-svelte-kit-output-server-chunks-createvaul` |
| Src Lib Features Filters 14 Dirs | 288 symbols | `/gortex-src-lib-features-filters-14-dirs` |
| Messages | 149 symbols | `/gortex-messages` |
| Svelte Kit Output Server Entries Pages Main Map Map 1 Dirs | 123 symbols | `/gortex-svelte-kit-output-server-entries-pages-main-map-map-1-dirs` |
| Svelte Kit Output Server 1 Dirs | 119 symbols | `/gortex-svelte-kit-output-server-1-dirs` |
| Svelte Kit Adapter Node Entries Pages Main Map Map Questfilterset | 118 symbols | `/gortex-svelte-kit-adapter-node-entries-pages-main-map-map-questfilterset` |
| Svelte Kit Output Server Chunks Getusersettings | 98 symbols | `/gortex-svelte-kit-output-server-chunks-getusersettings` |
| Svelte Kit Adapter Node Chunks Getusersettings | 98 symbols | `/gortex-svelte-kit-adapter-node-chunks-getusersettings` |
| Src Lib Server Api Querymasterstats | 84 symbols | `/gortex-src-lib-server-api-querymasterstats` |
| Src Lib Features 17 Dirs | 83 symbols | `/gortex-src-lib-features-17-dirs` |
| Src Components Menus Filters Filterset 26 Dirs | 82 symbols | `/gortex-src-components-menus-filters-filterset-26-dirs` |
| Src Lib Mapobjects 1 Dirs | 71 symbols | `/gortex-src-lib-mapobjects-1-dirs` |
| Src Lib Services Initsearch | 71 symbols | `/gortex-src-lib-services-initsearch` |
| Svelte Kit Adapter Node Render Response | 62 symbols | `/gortex-svelte-kit-adapter-node-render-response` |
| Svelte Kit Adapter Node Entries Pages Main Map Map Getboundingclientrect | 59 symbols | `/gortex-svelte-kit-adapter-node-entries-pages-main-map-map-getboundingclientrect` |
| Src Lib Features 1 Dirs Setactivesearch | 57 symbols | `/gortex-src-lib-features-1-dirs-setactivesearch` |
| Svelte Kit Output Server Entries Pages Main Map Map Getboundingclientrect | 57 symbols | `/gortex-svelte-kit-output-server-entries-pages-main-map-map-getboundingclientrect` |
<!-- gortex:skills:end -->

<!-- gortex:communities:end -->

