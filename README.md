# PoGo Map VT

A Pokémon GO map for Vermont, built as a custom extension on top of [Diadem](https://github.com/ccev/diadem) — a SvelteKit-based map frontend that connects to [Golbat](https://github.com/UnownHash/Golbat) and [Dragonite](https://github.com/UnownHash/Dragonite-Public).

## Features

- **Live map** — Pokémon, gyms, PokéStops, raids, and more via Diadem
- **Worker status** (`/status`) — real-time connected/disconnected worker counts and scout queue depth pulled from the Dragonite admin API
- **Shiny stats** (`/shiny`) — per-species shiny rates across 24h, 7d, 1 month, 3 month, 6 month, and all-time windows; custom date range picker; shiny sprites; sortable and searchable
- **Custom home page** — stat cards and navigation hub

---

## Requirements

- Node 22+
- pnpm
- MariaDB (Diadem internal DB + Golbat DB)
- A running [Golbat](https://github.com/UnownHash/Golbat) instance
- A running [Dragonite](https://github.com/UnownHash/Dragonite-Public) instance (optional — for worker status)

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

**Enable the custom home page:**

```toml
[client.general]
customHome = true
```

**Set the map's default position to Vermont:**

```toml
[client.general]
defaultLat = 44.2601
defaultLon = -72.5754
defaultZoom = 9
```

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

# Dragonite DB — for future historical stats features (optional)
DRAGONITE_DB_HOST=127.0.0.1
DRAGONITE_DB_PORT=3306
DRAGONITE_DB_NAME=dragonite
DRAGONITE_DB_USER=your_dragonite_user
DRAGONITE_DB_PASSWORD=your_dragonite_password
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
| `src/routes/api/custom/workers/+server.ts` | Worker status API |
| `src/routes/api/custom/shiny/+server.ts` | Shiny stats API |
| `src/lib/server/api/dragoniteStatus.ts` | Dragonite admin API client |

---

## Credits

Built on [Diadem](https://github.com/ccev/diadem) by [ccev](https://github.com/ccev).
Scanner data from [Golbat](https://github.com/UnownHash/Golbat) and [Dragonite](https://github.com/UnownHash/Dragonite-Public) by [UnownHash](https://github.com/UnownHash).
