# Architecture Decision Records

## ADR-001: Replace Jekyll with Hugo

**Status:** Accepted
**Date:** 2026-03-21

### Context
The existing site used Jekyll (Ruby-based, Cayman theme). Content was outdated (described a postdoc role from 2016). The site included locally stored images, university logos, conference posters, and multiple content sections no longer relevant.

### Decision
Replace the entire site with a Hugo static site built from scratch with a custom theme (no third-party theme dependency).

### Rationale
- Hugo is a single Go binary — no Ruby, no Bundler, no gem dependency issues.
- Builds in ~45ms vs seconds for Jekyll.
- Better positioned for future growth (family apps, additional pages).
- Provides useful devops familiarity (GitHub Actions pipeline, Go templating).
- Jekyll's ecosystem has stagnated; Hugo is actively maintained.

### Consequences
- Old content must be archived (separate branch) before replacing.
- Hugo templating syntax differs from Liquid (Jekyll) — minor learning curve.
- No theme marketplace dependency; full control but full responsibility for layout/styling.

---

## ADR-002: GitHub Pages with GitHub Actions deployment

**Status:** Accepted
**Date:** 2026-03-21

### Context
The existing site deployed via GitHub Pages' built-in Jekyll support (push to `master`, auto-build). Hugo is not natively supported by GitHub Pages.

### Decision
Use GitHub Actions to build Hugo on push to `main` and deploy via `actions/deploy-pages`.

### Rationale
- GitHub Pages only auto-builds Jekyll sites. Any other SSG requires a CI pipeline.
- GitHub Actions is free for public repos and integrates natively with Pages.
- The workflow is a standard pattern well-documented by Hugo.
- Keeps everything in one platform (repo + CI + hosting).

### Consequences
- Deployment source in repo settings must be changed from "branch" to "GitHub Actions".
- Default branch renamed from `master` to `main` to match workflow trigger.
- Build failures are visible in the Actions tab.

---

## ADR-003: Custom CSS, no framework

**Status:** Accepted
**Date:** 2026-03-21

### Context
Needed a dark theme with specific design requirements (amber accent, developer aesthetic, no generic AI look). Frameworks like Tailwind or Bootstrap were considered.

### Decision
Write custom CSS (~280 lines) using CSS custom properties for theming.

### Rationale
- The site is small (3 pages, ~20 unique elements). A framework would be overhead.
- Custom properties make the colour scheme trivially changeable.
- No build step for CSS (no PostCSS, no purging, no config).
- Full control over the design with no framework opinions to override.

### Consequences
- Responsive design is manually handled (one `@media` breakpoint at 520px).
- No utility classes; styles are semantic (`.tile`, `.hero`, `.contact-item`).
- If the site grows significantly, migrating to a framework may be warranted.

---

## ADR-004: Archivo as Moderat font substitute

**Status:** Accepted
**Date:** 2026-03-21

### Context
The preferred display font is Moderat Bold by TIGHTYPE — a geometric sans-serif with a large x-height and angular details. It is a commercial font (~€30 for regular + bold).

### Decision
Use Archivo Bold from Google Fonts as a free alternative for display/title use.

### Rationale
- Archivo is the closest free geometric sans-serif to Moderat (angular, similar x-height, clean weight in bold).
- Available on Google Fonts CDN — no self-hosting needed.
- Can be swapped for Moderat later by purchasing the licence and hosting the woff2 files in `static/fonts/`.

### Alternatives considered
- **Inter** — rated as 85% match by FontAlternatives, but too neutral/rounded for the developer aesthetic.
- **Work Sans** — similar proportions but softer character.
- **Space Grotesk** — good match but flagged as overused in AI-generated designs.

### Consequences
- Titles won't match the exact Moderat aesthetic. Archivo is a close but not identical substitute.
- Font swap is a single CSS change (`--display` variable) if Moderat is purchased later.

---

## ADR-005: Images compressed and stored in repo

**Status:** Accepted
**Date:** 2026-03-21

### Context
The old site stored numerous images (logos, posters, photos) in the repo, contributing to bloat. The goal was to avoid storing photos on the server. However, the new site uses only 5 curated photos.

### Decision
Compress all images to WebP format and store them in `static/img/` within the repo.

### Rationale
- 5 images total at 230KB is negligible (the old repo had megabytes of assets).
- Self-hosting avoids external dependencies (CDN accounts, broken links, CORS).
- WebP provides excellent compression: originals totalled 5.3MB, compressed to 230KB.
- External hosting (S3, Google Cloud Storage) would add complexity for minimal benefit at this scale.

### Consequences
- Images are versioned in Git (any change to an image increases repo size permanently).
- If many more images are added, external hosting should be reconsidered.
- Google Cloud Storage was discussed as a future option if the image count grows.

---

## ADR-006: Single-page preview, multi-page Hugo site

**Status:** Accepted
**Date:** 2026-03-21

### Context
The site was initially discussed as a single-page layout with tiles/carousel. However, Hugo was chosen for its multi-page capabilities and future extensibility.

### Decision
Build as a multi-page Hugo site (Home, Interests, Contact) but design the homepage to function as a near-complete single-page experience with tile navigation and inline photos.

### Rationale
- The homepage tiles link to anchored sections on the Interests page, giving a single-page feel.
- Separate pages allow for independent content management and clean URLs.
- Hugo's templating (partials, base templates) prevents duplication across pages.
- Future pages (family apps, blog) can be added without restructuring.

### Consequences
- Navigation exists but is lightweight (3 items).
- The homepage is self-contained enough to serve as a landing page on its own.

---

## ADR-007: Defer family apps and old content archival

**Status:** Accepted
**Date:** 2026-03-21

### Context
Two additional workstreams were identified: (1) private family apps with Google Auth (recipes, crossword scores), and (2) archiving old academic content (publications, blog posts, posters, pyresid).

### Decision
Defer both to future phases. Focus Phase 1 entirely on the public professional site.

### Rationale
- Shipping a clean, working site is the immediate priority.
- Family apps require backend decisions (Firebase vs Flask/FastAPI) that benefit from separate consideration.
- Old content is preserved in Git history and can be branched at any time.
- Mixing concerns would slow delivery of the core site.

### Future direction
- **Family apps:** Likely Firebase (Auth + Firestore) or a small Python API. Google OAuth for access control, whitelisted to family email addresses. Could live at `/family/` or a subdomain.
- **Archive:** Create `archive/old-site` branch from current `master` before deploying new site.
