# TradeLedger

A day trading journal and account tracker. Built with Next.js, Supabase, Tailwind CSS and shadcn/ui.
See [CLAUDE.md](CLAUDE.md) for the full spec and build plan.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase keys (needed from Phase 2)
npm run dev                  # http://localhost:3000
```

## Useful scripts

| Command                              | What it does                                |
| ------------------------------------ | ------------------------------------------- |
| `npm run dev`                        | Start the dev server                        |
| `npm run lint` / `npm run typecheck` | Check code quality and types                |
| `npm run format`                     | Auto-format all files with Prettier         |
| `npm test`                           | Run unit tests (Vitest)                     |
| `npm run test:e2e`                   | Run browser tests (Playwright)              |
| `npm run db:start`                   | Start local Supabase (needs Docker Desktop) |
