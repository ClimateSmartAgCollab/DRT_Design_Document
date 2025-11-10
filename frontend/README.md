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
The app runs at `http://127.0.0.1:3000`.

## Production Build
```bash
npm run build
npm start
```

## Testing & Linting
```bash
npm run lint
npm run test
npm run type-check
```

## Deployment (Netlify)
Netlify builds are configured via the repository-level `netlify.toml` with `base = "frontend"` so that only this directory is installed and built. Ensure any new environment variables are added to Netlify’s UI as well.
