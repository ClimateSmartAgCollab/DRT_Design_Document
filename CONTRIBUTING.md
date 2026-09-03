# Contributing

This is the Data Hub implementation of DRT (Django + Next.js). Small, reviewable changes with a working local stack beat large mixed PRs.

## Setup

Follow the **Quick start** in the [root README](README.md). You need Python 3.12 or 3.13, Node.js 20+, and Docker (Postgres, Redis, and Mailpit).

Do not commit `.env`, `.env.production`, or `frontend/.env.local`. Copy from `.env.example` / `frontend/env.local.example` and fill values for your machine only.

## Branch naming

Branch from the default branch. Use a short prefix and a kebab-case description:

| Prefix | Use |
| --- | --- |
| `feat/` | New behavior |
| `fix/` | Bug fix |
| `docs/` | Documentation only |
| `chore/` | Tooling, deps, repo hygiene |

Examples: `feat/owner-filter-tags`, `fix/email-timeout`, `docs/architecture-split`.

## Commits

Write in the imperative (“add cache healthcheck”, not “added” or “adds”). Say **why** in the body if the subject is not enough. Do not mix unrelated work in one commit.

## Before you open a PR

```bash
npm run lint
npm --prefix frontend run test
npm --prefix frontend run type-check
npm run manage -- test
```

Husky runs `npm run lint` on commit. Do not skip hooks.

Also:

- If you change system behavior, env vars, or deploy shape, update [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and/or the [Implementation Guide](docs/IMPLEMENTATION_GUIDE.md) in the same PR.
- If you add a required env var, add it to `.env.example` with a comment.
- Do not commit `backend/.venv`, `node_modules`, or collectstatic output.

## Pull requests

- Describe the problem and the approach, not a file list.
- Note how you tested (commands above, plus any manual path: requestor submit, owner approve, etc.).
- Keep PRs focused. Docs-only changes are welcome.

## Where to put work

| Change | Typical location |
| --- | --- |
| Negotiation states, email, licenses | `backend/drt/` |
| GitHub/cache fetches | `backend/datastore/` |
| Requestor / owner UI | `frontend/app/negotiation/` |
| Questionnaire rendering | `frontend/app/components/Form/` and `parser/` |
| Compose, cron, nginx | `infra/` |

Django admin is at `/django-admin/` (not `/admin/`) so it does not collide with Next.js admin routes.

## Questions

`adc@uoguelph.ca`. Security issues: see [SECURITY.md](SECURITY.md) — do not file them as public issues.
