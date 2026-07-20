# KAPS & Co Office

Internal office management app for KAPS & Co — task assignment and approvals, client
management, billing and revenue tracking, and staff administration.

Built with React + Vite + TypeScript, Tailwind, and Supabase. Deployed on Vercel
(pushes to `main` deploy automatically).

## Getting started

```bash
npm i        # install dependencies
npm run dev  # start the dev server
```

## Project layout

```
src/          Application source (app/, imports/, styles/)
public/       Static assets and the service worker
supabase/     Everything backend:
                config.toml        project + edge function config (CLI-managed)
                functions/         edge functions
                sql/               schema.sql, features.sql — run by hand in the SQL editor
                sql/archive/       one-off migrations and fixes, already applied
utils/        Supabase client helpers
scripts/      Excel → SQL converters and the client CSV template
docs/         Feature and setup guides
```

## Docs

- [Database setup](docs/database-setup.md)
- [Task assignment](docs/task-assignment.md) · [Reassignment](docs/task-reassignment.md) · [Permissions](docs/task-permissions.md)
- [Approval workflows](docs/approval-workflows.md)
- [Billing](docs/billing.md)
- [Client upload](docs/client-upload.md) · [Client inquiries](docs/client-inquiries.md)
- [Location tracking](docs/location-tracking.md)
- [Password features](docs/password-features.md)
- [Testing](docs/testing.md)
- [Design guidelines](docs/design-guidelines.md)

The original Figma design is at
https://www.figma.com/design/7rUg7OMuMilx8X7LmzbetP/KAPS---Co-Office.
