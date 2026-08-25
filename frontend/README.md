# Frontend (Next.js)

Requestor, owner, and admin UI for DRT — questionnaires, negotiation workspace, and dashboards. It talks to the Django API only. Global install and `npm run dev` (this app **and** Django) live in the [root README](../README.md).

## Requirements

- Node.js 20+
- npm 10+

## Setup that differs from root

```bash
npm install
cp env.local.example .env.local
```

Edit `.env.local` if you need a different API (`NEXT_PUBLIC_API_URL`). The example file points at the remote host; for laptop work use `http://127.0.0.1:8000`.

## Development

```bash
npm run dev
```

The app listens on `http://127.0.0.1:3001`. From the repository root, `npm run dev` starts this app and Django together (Django uses `backend/.venv`).

Theming: `frontend/theme/tokens.*.ts`. Dynamic questionnaires: [`components/Form`](app/components/Form/README.md) and [`components/parser`](app/components/parser/README.md).

## Production

```bash
npm run build
npm start
```

The Next image is built by `frontend.Dockerfile` (`npm run build`, then `npm start` on port 3000) and served from `infra/docker-compose.prod.yml`. See [`infra/README.md`](../infra/README.md).

## Testing and linting

```bash
npm run lint
npm run test
npm run type-check
```
