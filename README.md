# portfolio-backend

Content API for the portfolio websites and the admin dashboard (`../portfolio-admin`).
Express 5 + TypeScript + MongoDB. One API serves many sites; each site's content is isolated.

## Deploy

Render + MongoDB Atlas + Cloudinary, step by step: see [DEPLOY.md](DEPLOY.md).

## Run locally

```bash
docker compose up -d          # MongoDB on :27017 (or point MONGODB_URI at any MongoDB)
cp .env.example .env          # then set JWT_SECRET (32+ chars), ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npm run create-admin          # creates the dashboard login, then remove ADMIN_PASSWORD from .env
npm run seed                  # creates site "shovon" with the portfolio's current content
npm run dev                   # http://localhost:4000
```

`npm run seed` prints the `REVALIDATE_SECRET` for the portfolio's `.env`. Run it with `-- --force`
to re-import the content (messages and the secret are kept).

Check it: `curl http://localhost:4000/api/v1/public/sites/shovon`

## Scripts

| Script | |
|---|---|
| `npm run dev` | Watch mode with `tsx` |
| `npm run build` / `npm start` | Compile to `dist/` and run it |
| `npm test` | Vitest + Supertest against an in-memory MongoDB (first run downloads a `mongod` binary) |
| `npm run lint` / `npm run typecheck` | |
| `npm run seed` / `npm run create-admin` | See above |

## API

All under `/api/v1`. Full contract: `.claude/skills/portfolio-backend/SKILL.md`.

- `GET /public/sites/:slug`: everything a website renders
- `POST /public/sites/:slug/messages`: contact form (allowed origins only, rate-limited)
- `POST /auth/login`, `/auth/logout`, `GET /auth/me`, `PATCH /auth/password`
- `/admin/sites[/:siteId[/profile|/messages|/uploads|/stats|/{resource}]]`: dashboard CRUD
