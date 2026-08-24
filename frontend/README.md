# Frontend (Next.js)

## Requirements
- Node.js 20+
- npm 10+

## Setup
```bash
npm install
cp env.local.example .env.local
```
Edit `.env.local` if you need to point at a different backend API (defaults to `http://127.0.0.1:8000`).

## Development
```bash
npm run dev
```
The app runs at `http://127.0.0.1:3001`. From the repository root, `npm run dev` starts this app and Django together (Django uses `backend/.venv`; see the root README).

## Production
```bash
npm run build
npm start
```
The Next image is built by `frontend.Dockerfile` (`npm run build`, then `npm start` on port 3000) and served from `infra/docker-compose.prod.yml`.

## Testing & Linting
```bash
npm run lint
npm run test
npm run type-check
```
