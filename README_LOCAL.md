# Running Locally on Mac (Apple Silicon)

Three steps to get a live preview on your machine.

---

## Prerequisites

| Tool | Install |
|------|---------|
| Node.js 20+ | [nodejs.org](https://nodejs.org) or `brew install node` |
| pnpm 9+ | `npm install -g pnpm` |
| PostgreSQL 15+ | `brew install postgresql@15` |

---

## Step 1 — Install dependencies

```bash
pnpm install
```

This fetches all packages (including the native darwin-arm64 binaries for
Vite, Rollup, esbuild, and Tailwind that are pre-configured in the workspace).

---

## Step 2 — Set up your environment

Copy the example file and fill in your PostgreSQL connection string and a
random session secret:

```bash
cp .env.example .env
```

Open `.env` and set:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/tailoring_dev
SESSION_SECRET=<any long random string>
```

Generate a secret quickly:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

Then push the database schema (first time only):
```bash
cd lib/db && pnpm run push && cd ../..
```

---

## Step 3 — Start the dev server

```bash
pnpm run dev
```

This starts two services in parallel:

| Service | URL |
|---------|-----|
| Web app (Vite) | http://localhost:3000 |
| API server (Express) | http://localhost:8080 |

The web app automatically proxies all `/api/*` requests to the API server, so
you only need to open **http://localhost:3000** in your browser.

---

## Demo accounts

| Role | Username | Password |
|------|----------|----------|
| Owner | `owner` | `owner123` |
| Manager | `manager1` | `manager123` |
| Reception | `reception1` | `manager123` |
| Tailor | `tailor1` | `tailor123` |

---

## Notes

- The Replit-specific UI plugins (`@replit/vite-plugin-*`) are automatically
  disabled when `REPL_ID` is not set, so they won't interfere locally.
- The `.replit` file and Replit workflows are left unchanged — the Replit
  deployment continues to work exactly as before.
- To stop both services press **Ctrl+C**.
