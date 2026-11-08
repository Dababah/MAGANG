# Portal Pernyataan KAI

Next.js App Router application with Prisma/MySQL backend. Use npm and `package-lock.json`; do not introduce a second package manager or a separate Vite app.

## Project Structure

- `app/` contains Next.js pages, route handlers, global CSS, and the authenticated route-group layout.
- `components/` contains shared UI and client-side workflow components.
- `lib/` contains database, auth, scope, validation, and service code.
- `prisma/` contains the data model and migrations/seed support.
- `public/assets/` contains assets served by Next.js.
- `app/figma.css` contains the Figma-originated visual system used by the Next app.

## Commands

- `npm run dev` starts the Next.js application.
- `npm run build` validates and builds the application.
- `npm run lint` runs ESLint.
- `npm run db:generate` generates the Prisma client.
- `npm run db:setup-local` prepares local database data/configuration.

## Conventions

- Keep user-facing pages in Next.js routes and connect interactions to existing server actions/API routes.
- Preserve server-side session checks and role visibility scopes for all data access.
- Use Prisma queries and Zod validators already established in `lib/`.
- Keep shared styling in `app/figma.css`; add route-specific styles there or in the active app stylesheet rather than restoring a Vite entrypoint.
- Keep `.env` local and untracked; document required variables in `.env.example`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
