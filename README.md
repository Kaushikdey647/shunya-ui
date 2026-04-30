# shunya-ui

Web front end for **Shunya**: alpha studio, backtests, instrument charts, data coverage dashboards, and a **home dashboard** (macro strip, movers, headlines, recent runs, watchlist, compact health). Built with **React 19**, **TypeScript**, **Vite 8**, and **TanStack Query**. Charts use **Recharts** and **lightweight-charts** (TradingView).

This app expects the repo-local **FastAPI** service from the [`shunya`](https://github.com/Kaushikdey647/shunya) Python project (`backtest_api`). It does not embed business logic for backtests; it calls JSON HTTP APIs.

---

## Requirements

- **Node.js** 20+ (recommended; matches current Vite / toolchain expectations)
- **npm** (or compatible client)
- **Shunya API** running and reachable (see [API and proxy](#api-and-proxy))

---

## Quick start

```bash
cd shunya-ui
npm install
npm run dev
```

Open the URL Vite prints (usually `http://127.0.0.1:5173`). In development, `/api` is **proxied** to `http://127.0.0.1:8000` (see `vite.config.ts`), so start the Python API first, for example from the `shunya` repo:

```bash
cd /path/to/shunya
uv sync --extra api --extra timescale
export DATABASE_URL=postgresql://...   # optional but recommended for full features
shunya-timescale migrate                 # if using Timescale
uv run python -m backtest_api
# or: uv run uvicorn backtest_api.main:app --host 127.0.0.1 --port 8000
```

Full API setup is documented in the **`shunya`** repo: **`backtest_api/README.md`** (clone that repository and follow install, `DATABASE_URL`, migrations, and `uvicorn` / `python -m backtest_api`).

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | `tsc -b` then production Vite build → `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint over the project |

---

## API and proxy

- **Default base URL:** [`src/api/client.ts`](src/api/client.ts) uses `import.meta.env.VITE_API_BASE ?? '/api'`. All [`src/api/endpoints.ts`](src/api/endpoints.ts) paths are relative to that base (e.g. `/health`, `/market/snapshot`).
- **Development:** `vite.config.ts` proxies `/api` → `http://127.0.0.1:8000` and strips the `/api` prefix so the backend receives `/health`, `/backtests`, etc.
- **Production / custom backend:** set `VITE_API_BASE` at build time to your API origin (with or without trailing slash). Example: `VITE_API_BASE=https://api.example.com npm run build` if the UI is served from another host and the API is at `https://api.example.com/health`, etc. If the API is behind the same origin under `/api`, leave the default.

**CORS:** If you serve the UI and API on different origins without a reverse proxy, configure CORS on the FastAPI app for your UI origin.

---

## Features (routes)

All routes below are under the shell layout ([`AppShell`](src/components/AppShell.tsx): top nav, side nav, main outlet).

| Path | Description |
|------|-------------|
| `/` | **Dashboard:** macro ETF/index strip (sparklines), movers (gainers / losers / most active), Yahoo headlines, recent backtests, browser **watchlist** (`localStorage` key `shunya_watchlist_v1`), compact health |
| `/search` | Instrument search results |
| `/instruments/:symbol` | Instrument detail / chart |
| `/studio` | Alpha hub |
| `/studio/new` | Create alpha |
| `/studio/:alphaId` | Alpha Studio workspace (editor, run backtest, etc.) |
| `/backtests` | Backtest job list |
| `/backtests/new` | New backtest form |
| `/backtests/:jobId` | Backtest result + charts |
| `/data` | Data summary / coverage dashboard |

Legacy routes `/alphas`, `/alphas/new`, `/alphas/:alphaId` redirect to `/studio` equivalents.

---

## Project structure (selected)

```
src/
  api/           # apiFetch client, endpoints, DTO types (mirror OpenAPI / FastAPI models)
  components/    # Shared UI (shell, charts, home dashboard widgets, …)
  components/home/
  lib/           # Helpers (e.g. watchlist, macro symbol list)
  pages/         # Route-level screens
  App.tsx        # Router definitions
  main.tsx       # QueryClientProvider, BrowserRouter
  layout.css     # Layout, tables, dashboard/home utilities
  theme.css      # Design tokens
```

---

## Types and OpenAPI

[`src/api/types.ts`](src/api/types.ts) documents that DTOs mirror the Python API; after **breaking** backend schema changes, regenerate or hand-update types (e.g. `openapi-typescript` against `http://127.0.0.1:8000/openapi.json` when the server exposes it).

---

## Stack

- **UI:** React 19, React Router 7
- **Data:** TanStack Query v5
- **Forms / validation:** react-hook-form, zod, `@hookform/resolvers`
- **Charts:** Recharts, lightweight-charts
- **Editor:** Monaco (`@monaco-editor/react`) for alpha source in Studio

---

## Watchlist behavior

The home **Watchlist** card stores tickers only in **this browser** (`localStorage`). It uses **`POST /market/snapshot`** for quotes. It does not sync to the server; a future API-backed watchlist would replace or supplement this.

---

## Related repositories

- **Python library + API + worker:** [`shunya`](https://github.com/Kaushikdey647/shunya) — `shunya` package (panels, alphas, backtrader), `backtest_api` (FastAPI), Timescale tooling (`shunya-timescale` CLI).
- **API reference:** [`backtest_api/README.md`](https://github.com/Kaushikdey647/shunya/blob/main/backtest_api/README.md) (environment variables, migrations, test notes).

---

## License

Align with the parent **shunya** project license (MIT) unless this repository specifies otherwise.
