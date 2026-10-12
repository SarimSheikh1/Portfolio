# World Agentic Portfolio

A responsive React + TypeScript + Tailwind CSS portfolio with a charcoal/electric-blue dark theme and ivory light theme.

## Run locally

Requires Node.js 22.12 or later.

```sh
npm install
npm run dev
```

On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm`.

```sh
npm run build
npm run preview
```

Vercel and Netlify configuration is included. Import the repository root; `npm run build` produces `dist`.

## Features

- 70 public GitHub projects with search, category filters, and progressive loading.
- 11 public deployments returned successful HTTP responses in the latest availability check. Live demo modals include desktop/mobile widths and a full-app new-tab fallback.
- Genuine existing project screenshots are used where available; other cards clearly show public source artwork.
- Source-only, unavailable, and protected projects do not pretend to have working demos.
- Services, AI workflow, pricing scopes, education/certificates placeholder, testimonials placeholder, studio notes, FAQs, and contact sections.
- A local common-question assistant with Confirm/Cancel request flow and WhatsApp handoff. No model API is connected.
- Contact form prepares a message for the visitor to review and send in WhatsApp. No order is silently sent and no WhatsApp group is created.
- Custom SVG logo, SEO metadata, accessible dialogs, and reduced-motion support.

## Edit content

`src/world-projects.json` stores public project records and availability checks. Update URLs only from confirmed owner/public sources; check public access and iframe headers. Availability may change, and some embedded features may require opening the app in its own tab.

`src/main.tsx` holds the main website and assistant replies. `src/PublicProjects.tsx` holds the gallery and live preview UI. `src/world.css` holds styling.

Phone/WhatsApp: **03170046008**. Exact prices, verified testimonials, education, certificates, address, and other missing owner details remain placeholders. Netlify/Vercel account dashboards were inaccessible; the project collection is based on public GitHub records and discovered deployment URLs, not a claim that every dashboard-only deployment was enumerated.

## Validation

Production TypeScript/build checks passed. Browser checks passed for pagination, categories, search, 11 live-app filtering, correct embedded URLs, mobile preview toggle, GitHub links, dialog Escape, empty results, and mobile overflow. Individual third-party app features have not all been behavior-tested.
