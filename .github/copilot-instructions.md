# Copilot AI Agent Instructions for Embrace ChoreApp

## Project Overview
- This is a Next.js app (app directory structure) using Prisma for database access and authentication logic in `lib/auth.js`.
- Main app code is in `app/` (pages, API routes, layout, global styles).
- Prisma schema and migrations are in `prisma/`.
- Custom components live in `components/`.
- Utility logic (auth, db, rotation) is in `lib/`.

## Key Workflows
- **Development:**
  - Start dev server: `npm run dev` (from `choreapp/`)
  - DB migration: `npx prisma migrate dev --name <desc>`
- **Editing:**
  - Main entry: `app/page.js`, layout in `app/layout.js`.
  - API endpoints: `app/api/*/route.js` (RESTful, grouped by resource).
- **Prisma:**
  - Edit `prisma/schema.prisma` for model changes, then run migration.
  - Generated client in `generated/prisma/` (do not edit by hand).

## Project Conventions
- Use Next.js app directory routing (`app/`), not legacy `pages/`.
- API routes use `route.js` and follow RESTful patterns.
- Auth logic is centralized in `lib/auth.js` and `components/AuthProvider.jsx`.
- Use `prisma.js` in `lib/` for all DB access.
- Use functional React components and hooks.
- Use `globals.css` for global styles.

## Integration & Patterns
- All DB access should go through Prisma client (`lib/prisma.js`).
- Auth state is provided via React context (`AuthProvider.jsx`).
- Chore rotation logic is in `lib/rotation.js`.
- Use environment variables via `.env` (never commit secrets).

## Examples
- To add a new API endpoint for "tasks":
  - Create `app/api/tasks/route.js` and export REST handlers.
- To add a new page:
  - Create `app/<route>/page.js` and add to navigation if needed.
- To add a new model:
  - Edit `prisma/schema.prisma`, run migration, update `lib/prisma.js` if needed.

## References
- See `README.md` for Next.js basics.
- See `prisma/` for DB schema and migrations.
- See `components/` and `lib/` for reusable logic.

---

Keep instructions concise and up-to-date. Update this file if project structure or conventions change.
