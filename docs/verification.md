# Digital studio verification - 10 October 2026

The website now uses cream, ink, and blue colours, a hero with genuine project screenshots, a featured project layout, gallery/list search, and a separate contact page. Galaxy, WebGL, and the intro gate were removed. GSAP animates lateral project entry and exit; reduced motion and the motion toggle keep content static.

## Public collection

All eleven owner-requested projects are public in the requested order. Nine have reachable public deployments, real 1440 x 1000 desktop and 390 x 844 mobile captures, and WebP thumbnails. Expense Tracker and todo-app have genuine scripts-disabled repository HTML screenshots and GitHub buttons, with a clear unavailable-live-demo status. Screenshots were visually inspected.

The public homepages loaded. This does not establish that every external booking, payment, account, form, or backend works. The portfolio opens actual deployments and does not host copies of those applications.

Historical discovery covered 69 public repositories. Current homepage metadata for the missing projects is retained in `evidence/selected-live-metadata.json`. SNIPER-SHADOW, TARGET-RUSH, Travel Agent, and Mardara Speed passed live capture. Expense Tracker and todo-app both returned HTTP 404; their broken deployment links are not exposed as active live buttons. Earlier source renders remain archived in evidence.

## Checks

- TypeScript and the production build passed. The main JavaScript bundle is approximately 424 kB raw / 143 kB gzip. The former Three.js bundle is absent.
- Eight unit tests passed for pagination, provider failures, preserved owner edits, URL/private-address rejection, and image validation.
- Fifteen Chrome UI tests passed: responsive layouts at 320, 360, 390, 430, 768, 1024, and 1440 px; landscape with motion; search/list/detail/history/focus; command dialog; preview tabs/lightbox; blocked frame fallback; static Vercel fallback; loaded real project images/direct live links; and mobile contact details.
- Owner contact links use `sarimhatif1@gmail.com` and `tel:+923228668488`, plus WhatsApp. Form success requires API-confirmed storage.
- QA screenshots are in `docs/qa`. Full-page captures scroll images into view before saving so lazy-loaded previews appear.

## Limits and setup

No deployment was performed. The source ZIP is ready for the owner to deploy on Vercel using the repository root and included configuration. `/contact`, `/projects/:slug`, and `/admin` have SPA rewrites.

PostgreSQL and provider/SMTP credentials were unavailable. Migrations, owner setup, authenticated admin persistence, hosted uploads, provider imports, and email delivery were not tested end to end. Static hosting provides the portfolio and contact links; persistent form storage/admin requires the separate API and database.

Selected captures used a DNS-pinned public HTTP/CONNECT proxy with browser restrictions, destination validation, and disabled service workers. This is not a hostile-network penetration test. The general hosted worker still requires external public-only network isolation; its environment flag is an operator attestation, not a firewall.

Chrome viewport tests are not real-device Safari/Android tests or a complete assistive-technology audit. No Lighthouse or field performance score is claimed.
