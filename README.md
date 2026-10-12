# World Agentic

AI-powered portfolio for Sarim Sheikh, Rawalpindi.
Contact: sarimhatif1@gmail.com / WhatsApp 03170046008.

Includes an emerald/ivory theme, dark mode, reduced-motion-aware GSAP animations, six service options, WhatsApp inquiry drafts, a local-rule assistant, and 32 curated projects with inline live demos.

Accounts use the website's own email/password signup. Passwords are hashed with salted PBKDF2; sessions use HttpOnly cookies and hashed database tokens. Project metadata and preview images require a server-validated account. Members cannot access the admin overview. Existing external public apps and GitHub repositories retain their own access policies.

## Local setup

Use Node 22.13 or newer. Run `npm ci`, then `npm run build`.
Apply `drizzle/0000_neat_wiccan.sql` to the local D1 binding `DB` using Wrangler. Start the built preview with `npm start -- --port 8787`.
For first-time admin setup, generate a random secret as `OWNER_SETUP_KEY` in your local environment. Local Wrangler reads secrets from `dist/server/.dev.vars`. Open `/admin#key=<your-private-key>` and choose your password. Setup is single use; the owner email is sarimhatif1@gmail.com. Never commit or package environment files or local databases.

## Hosting

This version requires a Cloudflare Worker-compatible runtime and D1, rather than static hosting alone. `.openai/hosting.json` declares the existing Sites project and DB binding. Configure OWNER_SETUP_KEY as a runtime secret before owner setup. Production data is separate from local test fixtures.

Before uploading a deployment archive, remove any local `.dev.vars` file from `dist/server`. Build artifacts, local secrets, Wrangler state, screenshots and test accounts must not be committed.

Email verification and password reset are not implemented. Contact forms prepare a WhatsApp message for the visitor to send; they do not send email or silently deliver orders. The assistant uses local rules, not an external AI model. Unknown personal details, prices, reviews and certificates are not fabricated.

## Checks

`npx tsc --noEmit`
`node --import tsx --test tests/account.test.ts` (requires tsx)
`node tests/browser.mjs` (requires Playwright, local preview and local-only owner fixture)

Ask the owner which repository, branch and files to commit/push before either action, as recorded in AGENTS.md.
