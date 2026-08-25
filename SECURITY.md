# Security

## Reporting a vulnerability

Email **adc@uoguelph.ca**. Do not open a public GitHub issue, pull request, or discussion for security reports.

Include what you found, where (URL, endpoint, or file if you have it), and steps to reproduce. We will acknowledge receipt and follow up on a fix.

## What this project handles

Treat the following as sensitive. Do not paste them into issues, logs you share, or chat:

- `DJANGO_SECRET_KEY`, database passwords, SMTP credentials
- GitHub personal access tokens and webhook secrets
- ContextHub (or other datastore) API keys
- Magic-link UUIDs (`NLink.requestor_link`, `NLink.owner_link`) and OTP values — they *are* the credential
- `.env`, `.env.production`, and `frontend/.env.local`

Never copy production secrets onto staging (`drt-test`) and flip `TESTING_MODE`. Each host gets its own derived secrets. See [`.env.example`](.env.example) and the [Implementation Guide](docs/IMPLEMENTATION_GUIDE.md).

## Scope notes for reporters

Useful reports include: auth bypass around magic links or OTP, leakage of another party’s negotiation, SSRF or token exfiltration via the GitHub datastore client, and stored XSS in questionnaire or comment fields.

Out of scope unless you can show impact: issues that require an already-compromised server or a leaked `.env` file.
