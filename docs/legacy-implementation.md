> Historical implementation notes. Some details describe an earlier portfolio version. Use the root README for the current entry point, theme, ports, and account behavior.

# SARIM / THE IDEA UNIVERSE

A React / TypeScript portfolio and Express / TypeScript API for Sarim Sheikh. The digital studio uses cream, ink, blue, genuine screenshots, and GSAP animations, without a galaxy or WebGL scene. All eleven owner-selected projects are public in the requested order. Nine have reachable live links; Expense Tracker and todo-app currently return 404 and show GitHub source links with a clear unavailable-demo status.

## Deploy the frontend on Vercel

You requested a ZIP to deploy yourself. Nothing has been pushed or deployed.

1. Extract `delivery/sarim-idea-universe.zip` into a new directory. Upload the source to your own GitHub repository, then import that repository into Vercel, or use your preferred Vercel CLI workflow.
2. Use the **repository root** as the Root Directory. The included `vercel.json` sets install to `npm ci`, build to `npm run build`, and Output Directory to `client/dist`. Node 22.12+ or 24 is supported.
3. With no API configured, Vercel serves `client/public/projects.json`. Search, filters, gallery/list, project details, screenshots, live links, process, command palette, motion preferences, and `/contact` work. Email, phone and WhatsApp links use the owner-supplied contact details. Form storage and owner editing require the API and database; they report unavailable storage honestly.
4. For persistent functionality, deploy the Node API separately as described below. Add **`VITE_API_URL=https://api.your-domain.example`** to the Vercel project's build environment and redeploy. This is a public API origin, not a secret. Do not put database, session, SMTP, AWS, or provider credentials in `VITE_*` variables.
5. Configure the API's `PUBLIC_ORIGIN` to your exact Vercel production origin. Prefer `portfolio.your-domain.example` plus `api.your-domain.example` so secure session cookies remain same-site. Cross-site cookies can be blocked by browsers; use same-site domains or a same-origin reverse proxy rather than loosening authentication.
6. `/projects/:slug`, `/contact`, and `/admin` have SPA rewrites. Static assets and `/projects.json` retain normal file serving. The frontend deployment does **not** run a permanent Express server, PostgreSQL service, or screenshot worker.

Netlify is also supported with `netlify.toml` and `client/public/_redirects`: root build `npm run build`, publish `client/dist`, same public API variable and separate API hosting.

## Local setup — Windows PowerShell

Requires Node.js 22.12+ and Docker Desktop with its engine running, or an existing PostgreSQL database. Use `npm.cmd` if PowerShell execution policy blocks `npm.ps1`.

```powershell
npm.cmd ci
Copy-Item .env.example .env
```

Edit `.env`: generate a real session secret and replace the placeholder. One way to print a new random value for your own local environment:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
docker compose up -d db
npm.cmd run db:migrate
npm.cmd run owner:create
npm.cmd run seed:verified
npm.cmd run dev
```

The owner command accepts a username and a hidden password of at least 14 characters. There is no public registration and no default login. The database enforces one owner. Keep credentials private; they are not included in the source or ZIP.

Frontend: `http://127.0.0.1:5173`; API: `http://127.0.0.1:3001`; owner controls: `/admin`. Use the exact configured origin for authentication. The compose database is bound only to loopback, with a named persistent volume. Its sample password is for local development only; managed production databases need their own strong credentials and TLS configuration.

For a visual preview without a database, omit `.env` and run `npm.cmd run dev`. The public API then reads the bundled, verified snapshot. Contact storage and owner login remain unavailable. To enable them, configure PostgreSQL, migrate, create the owner, and seed or import the collection.

## Real project evidence

Discovery on 10 October 2026 returned **69 public GitHub repositories** across all API pages. The connected GitHub search independently returned 69. Public REST metadata, topics, primary languages, language breakdowns where available, descriptions, and README content are recorded in `evidence/github-public.json`. The unauthenticated API hit its rate limit while retrieving optional endpoints; `evidence/github-readmes.json` supplements available README files using the connected GitHub read-only tool. Missing README files and rate-limited language breakdowns are not fabricated. Primary language metadata remains available from the public repository listing.

The public snapshot contains Mardara-Expense-Tracker, SNIPER-SHADOW, TARGET-RUSH, Mardara_Travel_Agent, Mardara-gym-, Mardara_Speed, KINETIQ-STUDIO, AERION-DRIVE, todo-app, ROYALVOWS, and -Nexagen-Solution-website, in that order. `shared/curation.ts` applies selected-name/repository identity and publication rules to API and static responses. Reachable demos use live buttons; repository-only projects use GitHub buttons. Categories and technologies are metadata, not proficiency claims. Raw README is escaped text.

Expense Tracker and todo-app returned HTTP 404 during the latest capture checks. Their projects remain visible with source screenshots and GitHub links, but have no active live-demo button. Nine other projects have real live captures. New homepage links for SNIPER-SHADOW, TARGET-RUSH, Travel Agent, and Expense Tracker were read from current public GitHub metadata; links were not guessed. Live links open actual sites, and successful homepage loading does not establish that every backend flow is production-ready.

Refresh imports:

```powershell
npm.cmd run import:github
```

Or use `/admin` → Imports → Preview GitHub import → Commit. New imported records are drafts until explicitly published. Existing owner descriptions, manual categories, slug, technology edits, featured order, uploaded images, publication, and exclusion choices survive imports. Repository identities and canonical homepage URLs are used to match records, with alternate verified deployments retained. Use the owner editor to review public eligibility before publication. You can exclude forks/archived records individually; the admin list also has a visibility filter.

The optional discovery and snapshot scripts are for maintainers, not production request handlers:

```powershell
node scripts/discover.mjs
node --import tsx scripts/prepare-snapshot.ts
```

Snapshot preparation preserves screenshots and the selected collection. Review evidence before regeneration. Update `shared/curation.ts` when adding a selected project. Seeding excludes older records outside the snapshot without deleting owner data. Hosted database changes do not update the static fallback automatically; synchronize and rebuild. A connected public API takes precedence.

## Vercel / Netlify connections

Set `VERCEL_TOKEN` plus the actual `VERCEL_TEAM_ID`, and/or `NETLIFY_TOKEN` plus `NETLIFY_ACCOUNT_SLUG=sarimsheikh1` in the **API server** environment. Use least-privilege read access where the provider supports it and short token lifetimes. No tokens are entered in or returned to the browser.

The admin can inspect production candidates. Known password/SSO-protected Vercel projects and password/basic-auth Netlify projects are excluded from candidate results. Candidate names and URLs are owner-only. A separate public URL check and explicit owner publication are still required; provider metadata alone cannot prove public eligibility. This build had no provider credentials and did not inspect authenticated Vercel/Netlify projects. Manual URL import works without provider tokens and supports attaching alternate deployments to existing records.

## Genuine screenshots and capture worker

**All eleven projects have desktop and mobile screenshots** in `client/public/previews`. Nine are live homepage captures. Expense Tracker and todo-app use explicitly labelled repository HTML captures with scripts disabled, rather than pretending their unavailable deployment works. `scripts/capture-selected.ts` uses a DNS-pinned public HTTP/CONNECT proxy, Chromium proxy restrictions, destination validation, and disabled service workers. No generated project pictures are used.

Working manual fallback: `/admin` → select a project → upload its genuine desktop and mobile PNG, JPEG, or WebP. Content is inspected with Sharp, images larger than 12MB or 35 million input pixels are rejected, SVG is rejected, EXIF is stripped by re-encoding, and 1600px / 640px WebP derivatives are stored with dimensions, timestamps, alt text, and source labels. Images are zoomable in a native accessible dialog. Device tabs clearly show captured/uploaded previews. A live iframe loads only after a user request; it is sandboxed and screenshots/live links remain available if frame protection blocks it. A frame load event is never treated as proof that embedding works.

Automated workflow:

```powershell
npx.cmd playwright install chromium
# Only inside a correctly isolated capture service:
$env:CAPTURE_EGRESS_ISOLATED = 'true'
npm.cmd run capture
```

**Do not set this flag on an unrestricted machine.** It is an operator attestation, not a firewall implementation. Run the worker in a disposable container/VM with public-only HTTP(S) egress enforced outside Chromium. Deny loopback, RFC1918, link-local/cloud metadata, private/reserved IPv4 and IPv6, and non-web ports at the network layer for both browser requests and subresources. Disable service workers as the code does; disallow non-proxy/UDP egress at the container layer. Authentication, protected pages, internal addresses, and website restrictions must not be bypassed. Do not mount secrets or unrelated data into the browser container.

The worker runs one project/device at a time, validates all page/subresource destinations, limits navigation to 20s and screenshots to 10s, captures 1440×1000 desktop and 390×844 mobile homepages, records job outcomes, and retains previous valid previews after failures. Rerun to retry safely. Browser DNS checks alone are insufficient against rebinding; external egress isolation is mandatory. Public URL checks use pinned DNS addresses and independently revalidate each redirect (maximum five), 10s per connection, and bounded response size.

Hosted media requires `S3_BUCKET`, `S3_REGION`, `MEDIA_PUBLIC_URL`, and standard server-side AWS credentials. Use a public read-only media CDN/bucket policy limited to these assets; writes remain API-only. Development images use `uploads/` and are intentionally excluded from Git/ZIP. Do not rely on an ephemeral host disk for production uploads. S3-compatible services may need endpoint adaptation in `server/src/media.ts`; native AWS S3 is directly supported.

## API, security, and contact

Versioned endpoints live under `/api/v1`. PostgreSQL persists projects, owner authentication, settings, inquiries, sessions, and import/upload/capture history. Argon2id hashes passwords. Owner sessions use HttpOnly cookies, eight-hour expiry, secure cookies in production, and server-stored CSRF tokens. Login is throttled; every owner API is authorized. No auth secrets are stored in localStorage. Display preferences use localStorage only.

Contact validates name/email/message server-side, checks a honeypot, rate-limits abuse, and responds with success only after PostgreSQL storage. SMTP is optional: set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`, and `MAIL_TO`. Stored inquiries remain available if email delivery fails. Owner-supplied public contacts are `sarimhatif1@gmail.com` and `+92 322 866 8488`. Instagram, LinkedIn, and creator profile URLs remain absent until configured. No CV, testimonial, employment, or proficiency score has been invented.

The built-in rate limiter is process-local. Run one API instance or add a shared limiter store before scaling horizontally. Restrict production ingress to your trusted reverse proxy because secure session handling trusts one proxy hop. Use HTTPS, exactly one allowed `PUBLIC_ORIGIN`, database TLS as required by your managed provider, and environment secrets. Back up PostgreSQL and media. Never expose provider tokens, password hashes, or environment files in static hosting.

## Build and production

```powershell
npm.cmd run build
npm.cmd start
```

Production requires `NODE_ENV=production`, `DATABASE_URL`, and a random `SESSION_SECRET` of at least 48 characters. Set `PORT` to your platform-provided port. Express binds `0.0.0.0` in production and serves the built React application with direct-route support; alternatively host the frontend separately on Vercel/Netlify and point it to this API. Run from the repository root so the migration/evidence/media paths resolve correctly. Host Node on a persistent application/container service that supports a long-running process; provision managed PostgreSQL separately. Run migrations once in a release job, create the first owner securely, and seed verified records or import through admin. Run capture as a separate isolated worker, never in a Vercel static deployment.

Optional audio is off by default and starts only after a click. Motion preference persists and honors reduced motion. GSAP moves project cards in from one side and out toward the other during scrolling; the reduced-motion and motion-off modes keep content static. Essential content is HTML with normal scrolling and a visible system cursor. Gallery/list share the project collection.

## Verification and delivery

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:ui
npm.cmd run package
```

Browser tests use installed Google Chrome via Playwright's `chrome` channel. Install Chrome or change the channel to a downloaded Chromium browser. UI fixture data is confined to intercepted test responses and never appears in the shipped collection. See `docs/verification.md` for measured results and explicit environment limits.

The ZIP includes source, lockfile, environment placeholders, SQL migration, secure owner setup, public evidence, hosting configuration, tests, and documentation. It excludes dependencies, actual environments, credentials, database contents, uploads, test runtime output, and build artifacts. QA images in `docs/qa` show the portfolio itself; they are not project interface previews.

Documentation verified during implementation: [Vite setup](https://vite.dev/guide/), [Tailwind Vite plugin](https://tailwindcss.com/docs/installation/using-vite), [Express 5](https://expressjs.com/en/5x/api/), [GitHub repositories API](https://docs.github.com/en/rest/repos/repos), [Zod](https://zod.dev/), [GSAP context cleanup](https://gsap.com/docs/v3/GSAP/gsap.context/), [React Three Fiber](https://r3f.docs.pmnd.rs/getting-started/introduction), and [Netlify API](https://docs.netlify.com/api-and-cli-guides/api-guides/get-started-with-api/). Exact installed versions are locked in `package-lock.json`.

## Project account access

Project demos, source links, and overviews require a server session. Run `npm.cmd run db:migrate` to create the viewers table before using Login / Create account. Accounts use PostgreSQL and Argon2id; registration never grants owner permissions. With no API/database configured, projects remain locked. Vercel frontend hosting requires a separately hosted API with `VITE_API_URL` and an exact `PUBLIC_ORIGIN`; use same-site domains for cookies. Public external deployments and GitHub repositories still require their own access restrictions to prevent direct visits. The full project catalogue is stored in `server/data/world-projects.json`; the frontend catalogue contains no deployment or repository URLs.

Local development can use DATABASE_MODE=pglite in .env. This starts a persistent embedded PostgreSQL database in data/local-postgres, applies the schema, and configures the owner from private OWNER_LOGIN/OWNER_PASSWORD_HASH. It requires no Docker. Production continues to use DATABASE_URL and managed PostgreSQL. Stop the API before running database CLI commands against the embedded data directory.
