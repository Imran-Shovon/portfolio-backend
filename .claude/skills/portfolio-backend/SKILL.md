---
name: portfolio-backend
description: Build and maintain the multi-site Node.js (Express + TypeScript + MongoDB) content API behind Md Shovon Biswas's portfolio and any other portfolio-style websites managed from the admin dashboard. Use when creating or changing sites, models, routes, auth, uploads, seed data, or the public site endpoint in portfolio-backend, or when wiring a website or the admin dashboard to this API.
---

# Portfolio backend guide

The portfolio site (`../portfolio`, Next.js 16) currently hardcodes all content inside its section components. This service moves that content into a database and serves **multiple websites** from one API. Each website is a **Site**; all content belongs to exactly one site.

It exposes:

1. A **public, read-only API** per site that each website fetches at build/revalidate time.
2. An **authenticated admin API**, used by the admin dashboard (`../portfolio-admin`, Next.js), to manage sites and to create, edit, reorder, publish and delete each site's content.
3. A **public contact endpoint** per site that stores messages from that website's Contact form (today the portfolio's form is a demo and sends nothing).

All sites are **portfolio-style**: they share the same set of section types (profile, skills, experience, projects, education, publications). Each site can switch sections off. Sites with completely different content (blogs, shops, menus) are out of scope for this design.

There is one admin user, who can manage every site. There is no public sign-up.

## Workspace layout

```
D:\Personal Project\Portfolio\
├── portfolio\           # first website (Next.js 16) — content consumer, site slug "shovon"
├── portfolio-backend\   # THIS project — Express API for all sites
└── portfolio-admin\     # admin dashboard (Next.js) — content editor for all sites
```

Other websites can live anywhere; they only need the API URL, their site slug and their revalidation endpoint.

## Stack

- **Node.js 20+**, **TypeScript (strict)**, ES modules, run with `tsx` in dev and compiled with `tsc` for prod.
- **Express 5** (async handlers propagate rejected promises to the error middleware, so no `express-async-handler`).
- **MongoDB + Mongoose 8**. Content is document-shaped (arrays of tags, tech, responsibilities), so a document DB fits better than SQL.
- **Zod** for request validation; the same schemas define the TypeScript input types (`z.infer`).
- **Auth:** `bcryptjs` password hash (pure JS: npm 11 here doesn't run install scripts, so native `bcrypt` won't build) + `jsonwebtoken` access token stored in an **httpOnly cookie** (`portfolio_admin`), `SameSite=Lax`, `Secure` in production.
- **Uploads:** `multer` (memory storage) → saved through a `storage` service. Default driver writes to `uploads/<siteId>/` served at `/uploads` (keyed by id so renaming a slug never strands files); a Cloudinary driver can be added behind the same interface.
- **Security/infra:** `helmet`, `cors` (dynamic allowlist, see CORS), `cookie-parser`, `express-rate-limit`, `pino` + `pino-http` for logs.
- Path alias `@/*` → `src/*`.

## Folder structure

```
src/
├── app.ts                 # createApp(): builds the express app (middleware, routes, error handler), no listen(). A factory so each test gets fresh rate-limit counters
├── server.ts              # connects DB, then app.listen()
├── config/env.ts          # zod-parsed process.env, exported as `env`; crash on invalid config
├── db/connect.ts
├── middleware/
│   ├── auth.ts            # requireAdmin: verifies cookie JWT, sets req.admin
│   ├── site.ts            # loadSiteById (admin) / loadSiteBySlug (public): sets req.site or 404
│   ├── validate.ts        # validate({ body?, params?, query? }) using zod
│   ├── error.ts           # notFound + errorHandler (AppError, ZodError, Mongoose errors)
│   └── rateLimit.ts
├── modules/
│   ├── auth/              # login, logout, me, change-password
│   ├── sites/             # Site CRUD, secret rotation, stats; site.routes.ts mounts every /:siteId sub-router; site.cache.ts caches allowed origins for CORS
│   ├── profile/           # per-site singleton: hero, about, contact, socials, SEO, resume, tech badges
│   ├── skills/            # skill categories
│   ├── experience/
│   ├── projects/
│   ├── education/
│   ├── publications/      # research papers
│   ├── messages/          # contact form submissions
│   ├── uploads/
│   └── public/            # aggregated read-only site endpoint
│       modules with logic: <name>.model.ts, <name>.schema.ts (zod), <name>.service.ts, <name>.controller.ts, <name>.routes.ts
│       the five list resources: <name>.model.ts, <name>.schema.ts, <name>.routes.ts (a createCrudRouter call)
├── lib/
│   ├── AppError.ts
│   ├── crud.ts            # createCrudRouter({ model, createSchema, fileFields, derive }) for the list collections
│   ├── listSchema.ts      # createListSchema(): siteId + order + published + timestamps + { siteId, order } index
│   ├── schema.ts          # baseSchemaOptions({ hide }) (id/no _id/no siteId JSON) + shared zod pieces (objectId, hexColor, urlOrPath…)
│   ├── logger.ts          # pino
│   ├── slugify.ts
│   ├── siteScope.ts       # siteScopePlugin for Mongoose (see Site isolation)
│   ├── storage.ts         # saveUpload(siteId, file) / removeUpload(url) / removeReplacedUploads / removeSiteUploads
│   └── revalidate.ts      # pings a site's website after content changes
└── scripts/
    ├── seed.ts            # creates the "shovon" site and imports current hardcoded portfolio content
    └── create-admin.ts
```

Keep controllers thin: parse → call service → send. Business logic and DB access live in services, and **every service function takes `siteId` as its first argument**.

## Data model

### Site

| Field | Type | Notes |
|---|---|---|
| `name` | string | Display name in the dashboard, e.g. "Shovon Portfolio" |
| `slug` | string | Unique, lowercase, `^[a-z0-9-]{2,40}$`. Used in public URLs. Changing it breaks the live website, so the dashboard warns before it does. |
| `siteUrl` | string (url) | Public URL of the website, e.g. `https://shovon.dev`; also used to resolve relative image paths |
| `allowedOrigins` | string[] | Browser origins allowed to POST the contact form (usually just `siteUrl`'s origin; add `http://localhost:3000` for dev) |
| `revalidateUrl` | string (url) \| "" | e.g. `https://shovon.dev/api/revalidate`; empty disables revalidation |
| `revalidateSecret` | string | Generated (32 random bytes, hex) on create; `select: false`; only returned once on create and on rotate |
| `sections` | `{ skills, experience, projects, education, publications: boolean }` | All `true` by default. A disabled section is omitted from the public payload but its data is kept. |
| `active` | boolean | `false` → public endpoints return 404 for this site; admin can still edit |

Deleting a site deletes **all** its content, messages and uploaded files. The service does this in one function (`deleteSiteCascade`) and the API requires `?confirm=<slug>`.

### Shared fields on all content collections

- `siteId: ObjectId` (ref `Site`, required, indexed). **Every query filters by it.**
- List collections also have `order: number` (ascending sort, set by drag-and-drop), `published: boolean` (default `true`; unpublished items are hidden from the public API) and Mongoose `timestamps: true`.
- Compound indexes start with `siteId`: `{ siteId: 1, order: 1 }` on lists, `{ siteId: 1, slug: 1 }` unique on projects, `{ siteId: 1 }` unique on profile, `{ siteId: 1, createdAt: -1 }` on messages. The plugin itself adds **no** index on `siteId`: a plain one clashes with Profile's unique index of the same name.

**Accent colors are always 6-digit hex** (`/^#[0-9a-fA-F]{6}$/`). The sites append alpha suffixes like `${accent}40`, which silently breaks when the value is `var(--color-accent-blue)` (a known bug in today's `Experience.tsx` and `Skills.tsx`). Seed those with the hex equivalents: blue `#3b82f6`, purple `#8b5cf6`, cyan `#06b6d4`.

### Profile (one per site)

Maps to Hero, About, Contact, Footer, PageLoader and `layout.tsx` metadata on the portfolio.

| Field | Type | Current source in `../portfolio` |
|---|---|---|
| `fullName` | string | "Md Shovon Biswas" (About) |
| `shortName` | string | "Shovon" (Hero greeting, PageLoader, Navbar logo) |
| `greeting` | string | "Hi, I'm Shovon" |
| `headline` | string | "Frontend Developer" |
| `subHeadline` | string | "Research Enthusiast" |
| `heroDescription` | string | Hero paragraph |
| `photo` | string (url) | `/image/shovon.jpeg` |
| `resumeUrl` | string (url) \| "" | `/resume.pdf` (file doesn't exist yet) |
| `aboutParagraphs` | string[] | 3 About paragraphs (plain text; no inline HTML) |
| `traits` | string[] | Detail-Oriented, Creative, Research-Driven, Team Player |
| `stats` | `{ value, label, icon }[]` | About `stats`; `icon` is a lucide icon **name** string (`"Briefcase"`) |
| `techBadges` | string[] | Skills ticker words |
| `loaderTagline` | string | PageLoader tagline |
| `footerTagline` | string | Footer text under the logo |
| `availability` | string | Footer line, e.g. "Available for freelance & full-time" |
| `contact` | `{ email, phone, location, heading, blurb }` | Contact.tsx + Footer.tsx |
| `socials` | `{ platform: "github"\|"linkedin"\|"researchgate"\|"email"\|"other", label, url }[]` | Contact, Footer, Research profile link |
| `seo` | `{ title, description }` | `layout.tsx` metadata |

Created empty when the site is created. Update with `findOneAndUpdate({ siteId }, data, { upsert: true, new: true, runValidators: true })`.

### SkillCategory
`title`, `icon` (lucide name: `Code`, `Database`, `Cpu`, `BookOpen`…), `color` (hex), `skills: { name: string, level: number 0–100 }[]`, `order`, `published`.

### Experience
`role`, `company`, `duration` (display string, e.g. "November 2025 – Present"), `type` (`Full-time` \| `Part-time` \| `Contract` \| `Internship` \| `Freelance`), `accent` (hex), `responsibilities: string[]`, `tech: string[]`, `order`, `published`.

### Project
`title`, `slug` (unique within the site, generated from title), `type` (`Professional` \| `Personal`), `duration`, `image` (url), `summary`, `description`, `tech: string[]`, `accent` (hex), `liveUrl` (url or `""`), `githubUrl` (url or `""`), `order`, `published`.
Empty string means "hide the button". Never store `"#"`.

### Education
`degree`, `institution`, `duration?`, `status?`, `grade`, `gradeLabel` (`CGPA` \| `GPA`…), `description`, `accent` (hex), `order`, `published`.

### Publication
`title`, `date` (display string, e.g. "May 2023"), `image` (url), `description`, `publisher` (short, e.g. "IEEE"), `publisherFull` (e.g. "IEEE Xplore", may be ""), `accent` (hex), `tags: string[]` (shown as keywords), `paperUrl`, `order`, `published`.
The ResearchGate profile link comes from `Profile.socials`, not from each paper.

### Message
`siteId`, `name`, `email`, `subject`, `message`, `read: boolean` (default false), `ip?`, `userAgent?`, `createdAt`. No `order`/`published`.

### Admin
`email` (unique, lowercase), `passwordHash`, `name`, `lastLoginAt`. Not site-scoped: the single admin manages every site.

Return JSON with `id` instead of `_id` and no `__v` (set a shared `toJSON` transform). Never return `siteId` in public responses.

## Site isolation (most important rule)

One site's data must never appear in or be changed through another site's routes.

- `siteId` always comes from `req.site` (set by the site middleware), **never from the request body**. Strip `siteId` in every zod schema (`.strict()` rejects it).
- Fetching, updating, deleting or reordering by id always uses `{ _id: id, siteId }`. A document from another site returns **404**, not 403.
- `reorder` checks that every id in `ids` belongs to the site and that the count matches; otherwise it returns 400.
- `siteScopePlugin` adds a guard: `find*`, `update*`, `delete*`, `replaceOne` and `countDocuments` throw in development/test if the filter has no `siteId`, and `aggregate` must start with a `$match` on `siteId`. This catches forgotten filters early. `bulkWrite` and `Model.findById` bypass it, so always build those filters with `siteId` yourself (and don't use `findById` on scoped models).

## API

Base path: `/api/v1`. All responses are JSON.
Success: `{ "data": ... }` (lists add `"meta": { "total" }` when paginated).
Error: `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details"?: [...] } }` with a matching HTTP status.
`details` is a list of zod issues as `{ path: (string | number)[], message: string }` (e.g. `{ path: ["skills", 0, "name"], message: "Required" }`). The dashboard maps these onto form fields by `path.join(".")`, so keep paths identical to the request body. Duplicate-key errors (e.g. a taken slug) also return `details` pointing at the field.
DELETE and reorder return `204` with no body. Wrong login credentials return `401`, rate limits return `429`.

Response shapes the dashboard relies on:
- `GET /admin/sites` → `{ data: Array<Site & { counts: Record<resource, number>, unreadMessages: number }> }`, where `resource` is the five `{resource}` names below.
- `GET /admin/sites/:siteId/stats` → `{ data: { counts: Record<resource, number>, unreadMessages: number } }`.
- `POST /admin/sites/:siteId/rotate-secret` → `{ data: { revalidateSecret } }`.
- `POST /admin/sites/:siteId/revalidate` → `{ data: { ok: boolean, status: number } }` (the website's HTTP status, or `0` if unreachable).
- `GET /admin/sites/:siteId/profile` → `{ data: Profile | null }`.
- `GET .../messages` → `{ data: Message[], meta: { total } }`.

### Public (no auth, site picked by slug)

| Method | Path | Notes |
|---|---|---|
| GET | `/public/sites/:slug` | One aggregated payload: `{ site: { name, slug, sections }, profile, skillCategories, experiences, projects, education, publications }`. Only `published: true`, sorted by `order`. Disabled sections are returned as empty arrays (so consumers needn't null-check). 404 if the site is missing or inactive. Send `Cache-Control: public, max-age=60, stale-while-revalidate=300`. |
| POST | `/public/sites/:slug/messages` | Contact form. Zod-validated, rate-limited (5 / 15 min / IP / site), honeypot field `website`: when filled, answer 201 but store nothing. `Origin` must be in the site's `allowedOrigins` (missing or foreign → 403). Returns 201. |
| GET | `/health` | `{ status: "ok" }` (outside `/api/v1`) |

### Auth

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | `{ email, password }` → sets cookie, returns admin. Rate-limited (10 / 15 min / IP). Same error for wrong email or password. |
| POST | `/auth/logout` | Clears cookie. |
| GET | `/auth/me` | Current admin or 401. |
| PATCH | `/auth/password` | `{ currentPassword, newPassword }` (min 10 chars). |

### Admin: sites (all require `requireAdmin`)

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/sites` | All sites with counts per section and unread messages (dashboard site switcher + Sites page) |
| POST | `/admin/sites` | Creates site + empty profile; returns the site **with** `revalidateSecret` once |
| GET, PATCH | `/admin/sites/:siteId` | |
| DELETE | `/admin/sites/:siteId?confirm=<slug>` | Cascade delete |
| POST | `/admin/sites/:siteId/rotate-secret` | New `revalidateSecret`, returned once |
| POST | `/admin/sites/:siteId/revalidate` | Manually trigger revalidation; returns the website's HTTP status |

### Admin: site content (all require `requireAdmin` + `loadSiteById`)

Prefix: `/admin/sites/:siteId`

| Method | Path |
|---|---|
| GET / PUT | `/profile` |
| GET, POST | `/{resource}` |
| GET, PATCH, DELETE | `/{resource}/:id` |
| PATCH | `/{resource}/reorder`: body `{ ids: string[] }`; sets `order` = index in a `bulkWrite` filtered by `siteId` |
| GET | `/messages?status=unread&page=1&limit=20` |
| PATCH / DELETE | `/messages/:id` (PATCH only toggles `read`) |
| GET | `/stats`: counts per resource and unread messages for this site |
| POST | `/uploads`: `multipart/form-data`, field `file`; returns `{ url }` |

`{resource}` ∈ `skill-categories`, `experiences`, `projects`, `education`, `publications`. Build these five with the shared `createCrudRouter` so behaviour stays identical. Mount the content router with `Router({ mergeParams: true })` so `:siteId` is visible. New items get `order = max(order within site) + 1`. Register `/reorder` before `/:id`.

Admin routes work even when a section is disabled, so content can be prepared before switching it on.

### CORS
- Admin and auth routes: only `ADMIN_ORIGIN`, with credentials. (The dashboard proxies through its own origin, so this is mainly for safety.)
- `GET /public/sites/:slug`: `Access-Control-Allow-Origin: *`, no credentials (read-only, usually fetched server-side).
- `POST /public/sites/:slug/messages`: origin must be in that site's `allowedOrigins`. Use a per-request `cors` options callback that loads the site (cache sites in memory for 60s; clear the cache on site update).

### Uploads
- Images: `image/jpeg|png|webp|avif`, max 5 MB. Resume: `application/pdf`, max 10 MB.
- Saved to `uploads/<siteId>/<nanoid>.<ext>`. Filenames are generated, never taken from the client, and the file's leading bytes must match its declared type (415 otherwise). Store the full url. Served with `Cross-Origin-Resource-Policy: cross-origin` (the websites and dashboard embed them) and `nosniff`.
- When an image/resume field changes or a document is deleted, call `storage.remove(oldUrl)` for files this service owns (urls under `/uploads/`). Never delete root-relative paths like `/image/...`; those live in a website's `public/` folder.

### Revalidation hook
After every successful admin content write **and every site settings update** (sections, active and name change what the website renders), call `scheduleRevalidate(site)` in `lib/revalidate.ts`: `POST site.revalidateUrl` with header `x-revalidate-secret: <site.revalidateSecret>`. Fire-and-forget with a 5s timeout. Log failures, and never fail the admin request because of one. Skip when `revalidateUrl` is empty. Debounce per site (500 ms) so a reorder or a burst of edits sends one request.

## Environment

`.env.example` (keep it in sync with `config/env.ts`):

```
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/portfolio
JWT_SECRET=change-me-at-least-32-chars
JWT_EXPIRES_IN=7d
COOKIE_DOMAIN=
ADMIN_ORIGIN=http://localhost:3001
PUBLIC_BASE_URL=http://localhost:4000
UPLOAD_DIR=uploads
TRUST_PROXY=0              # number of reverse proxies in front (for correct client IPs in rate limits)
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

Per-website settings (URL, origins, revalidation) live on the `Site` document, not in env.
Ports: portfolio `3000`, admin `3001`, backend `4000`. Local MongoDB: `docker compose up -d` (see `docker-compose.yml`).
Upload urls are returned absolute (`${PUBLIC_BASE_URL}/uploads/...`) so every app can render them; add the backend host to each Next app's `next/image` `remotePatterns`.

## Seeding

`npm run seed` creates the site `{ name: "Shovon Portfolio", slug: "shovon", siteUrl: "http://localhost:3000", allowedOrigins: ["http://localhost:3000"], revalidateUrl: "http://localhost:3000/api/revalidate" }`, prints its `revalidateSecret`, and imports the content the portfolio had when it switched to this API:

- `src/scripts/seed-content.json` is a verbatim snapshot of the data arrays that were hardcoded in `../portfolio/src/components` (12 projects, 3 jobs, 3 degrees, 3 papers, 4 skill categories, ticker words, About stats). It was extracted programmatically, so don't hand-edit it to "fix" content. Change content in the dashboard instead.
- `src/scripts/seed-data.ts` maps it onto the API shapes (`var(--color-accent-*)` → hex, `live`/`github` → `liveUrl`/`githubUrl`, `university` → `institution`, papers `duration`/`keywords`/`paper` → `date`/`tags`/`paperUrl`) and holds the text that lived in JSX (Hero, About paragraphs, Contact, Footer, loader, SEO).
- Every item goes through the same zod schemas as the API before insert.
- `order` comes from the array index.
- Idempotent: if the `shovon` site exists, do nothing unless `--force`, which deletes and re-imports **only that site's** content (never its messages, secret, other sites, or admins).

`npm run create-admin` creates or resets the admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Scripts

```json
{
  "dev": "tsx watch src/server.ts",
  "build": "tsc -p tsconfig.json",
  "start": "node dist/server.js",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "seed": "tsx src/scripts/seed.ts",
  "create-admin": "tsx src/scripts/create-admin.ts"
}
```

## Conventions

- Named exports only.
- Throw `new AppError(status, code, message)` for expected failures; let everything else hit the error handler as a 500 (log it, don't leak stack traces outside development).
- Validate `:siteId` and `:id` params as ObjectId in the zod params schema (400, not a Mongoose CastError 500).
- Zod schemas: `createXSchema` (`.strict()`), and `updateXSchema = createXSchema.partial()`. Trim strings; `url` fields accept a valid URL, a root-relative path (`/image/...`), or `""`.
- Never return `passwordHash` or `revalidateSecret` except where stated (`select: false` on both).
- Public endpoints must never expose unpublished items, disabled sections, admin data, messages, secrets or `siteId`.

## Testing

`vitest` + `supertest` + `mongodb-memory-server`. Import `app` from `app.ts` (no listening server). Minimum coverage:
- auth: login success/failure, protected route without cookie → 401.
- one CRUD resource end-to-end incl. reorder.
- **site isolation**: with sites A and B, reading/updating/deleting/reordering B's item through A's routes → 404/400, and A's public payload never contains B's content.
- public endpoint hides `published: false`, disabled sections, and inactive sites.
- contact endpoint: validation, honeypot, origin check, rate limit.
- site delete cascades content, messages and files.

## Verifying changes

```bash
npm run typecheck && npm run lint && npm test
npm run dev   # then: curl http://localhost:4000/api/v1/public/sites/shovon
```

## Website integration (consumer contract)

Done in each website (first `../portfolio`), not here, but keep the API compatible with it:
- Env: `CONTENT_API_URL`, `SITE_SLUG`, `REVALIDATE_SECRET` (copied from the dashboard when the site is created).
- A server-side `getSiteContent()` fetches `/public/sites/${SITE_SLUG}` with a Next cache tag. `app/api/revalidate/route.ts` checks `x-revalidate-secret` and revalidates that tag. Read the Next 16 caching docs in `node_modules/next/dist/docs/` before writing it.
- `page.tsx` fetches once and passes each slice as props; a section whose `site.sections[x]` is `false` is not rendered and is removed from the nav and footer links.
- The Contact form POSTs to `/public/sites/${SITE_SLUG}/messages`.
- Changing a response field name is a breaking change for every website and the dashboard, so update them together.
