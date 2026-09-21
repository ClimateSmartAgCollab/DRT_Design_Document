# Security

## Reporting a vulnerability

Email **adc@uoguelph.ca**. Do not open a public GitHub issue, pull request, or discussion for security reports.

Include what you found, where (URL, endpoint, or file if you have it), and steps to reproduce. We will acknowledge receipt and follow up on a fix.

## What this project handles

Treat the following as sensitive. Do not paste them into issues, logs you share, or chat:

- `DJANGO_SECRET_KEY`, database passwords, SMTP credentials
- GitHub personal access tokens and webhook secrets
- ContextHub API keys (`CONTEXT_HUB_API_KEY` / `X-DRT-API-KEY`)
- Magic-link tokens — they *are* the credential. They live in email and Redis (`magic_token:{token}`) only; HTTP JSON must not echo `?token=`. `Requestor.otp` is leftover and is not the live secret.
- UUID bookmarks (`NLink.requestor_link`, `NLink.owner_link`) — navigation only; they must not grant access without a matching session
- Issued license text stored on `Negotiation` (current-cycle evidence)
- `.env`, `.env.production`, and `frontend/.env.local`

Never copy production secrets onto staging (`drt-test`) and flip `TESTING_MODE`. Each host gets its own derived secrets. See [`.env.example`](.env.example) and the [Implementation Guide](docs/IMPLEMENTATION_GUIDE.md).

## Auth and access (runtime)

- **Row bind.** A logged-in session is not ownership of a case. Fill, owner review (GET/save/decide), history, reopen, archive, delete, license download, and fulfillment require the session email to match that row. Helpers: [`backend/drt/services/access.py`](backend/drt/services/access.py).
- **CSRF.** Mutating endpoints enforce CSRF (`CSRFEnforcedSessionAuthentication` on DRF views; Django middleware on the rest). The SPA sends `X-CSRFToken` after `GET /drt/auth/csrf/`.
- **Datastore dumps.** `GET /datastore/cached-data/…`, license table/template, and questionnaire JSON require an admin session. The GitHub webhook is HMAC-gated and only active when `DATASTORE_BACKEND=github`.
- **Default catalog.** ContextHub is the default datastore (`DATASTORE_BACKEND=contexthub`). GitHub is rollback.

## Scope notes for reporters

Useful reports include: auth bypass around magic links, treating a UUID link as a credential, a logged-in party reading another party’s negotiation (row-bind skip), CSRF bypass on mutations, unauthenticated datastore dumps, SSRF or key exfiltration via the ContextHub or GitHub client, and stored XSS in questionnaire or comment fields.

Out of scope unless you can show impact: issues that require an already-compromised server or a leaked `.env` file.
