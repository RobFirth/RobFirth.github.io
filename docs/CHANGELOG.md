# Changelog

All notable changes to robertfirth.co.uk will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

---

## [1.0.0] — 2026-03-21

### Summary
Complete rebuild of robertfirth.co.uk. Replaces the legacy Jekyll/Cayman site (last meaningfully updated ~2018) with a modern Hugo static site reflecting Dr Rob Firth's current role as an AI researcher at the STFC Hartree Centre.

### Added
- Hugo static site generator with custom theme (no third-party theme dependency)
- GitHub Actions CI/CD pipeline for automated build and deploy
- Dark theme with amber accent (`#f59e0b`)
- Three-page structure: Home, Interests, Contact
- Homepage hero with professional headshot and contact links
- Tile grid showcasing five areas of focus
- Interests page with anchor-linked sections
- Contact page with styled cards for Email, GitHub, LinkedIn, ORCID
- Five compressed WebP photos (230KB total):
  - Professional headshot (Hartree Centre)
  - AI in Healthcare Symposium presentation (Liverpool, June 2025)
  - Business of Science Conference panel (×2)
  - Liverpool City Region AI Summit 2024
- Typography system: Archivo (titles), JetBrains Mono (UI), Source Serif 4 (body)
- CNAME file for custom domain `robertfirth.co.uk`
- Project documentation: SPEC.md, ADR.md, CHANGELOG.md

### Removed
- Jekyll site and Cayman theme
- All legacy content (publications, blog posts, posters, code snippets, photos page)
- Locally stored university/institutional logos (~10+ images)
- `pyresid` Python package documentation
- Bundled fonts directory
- `Gemfile`, `Gemfile.lock`, `.gemspec`
- `jekyll-cayman-theme-master.zip`

### Changed
- Bio updated from postdoctoral researcher (Southampton, 2016) to AI researcher (Hartree Centre, STFC)
- Contact links updated: removed Twitter (`@astro_berto`), added ORCID and current LinkedIn
- Default branch will change from `master` to `main` (required by GitHub Actions workflow)
- GitHub Pages deployment source changes from built-in Jekyll to GitHub Actions

---

## [0.x] — 2016–2018 (Legacy)

The original Jekyll site, based on the Cayman theme. Described academic work at the University of Southampton including Type Ia supernova research, the Isaac Physics project, publications, conference posters, code snippets, and personal photography. Last substantive commit circa 2018.

---

# Release Notes — v1.0.0

## What's new

This is a ground-up rebuild of robertfirth.co.uk as a clean, professional site reflecting Rob's current work in AI research.

**Highlights:**
- Modern dark theme with a developer aesthetic
- Ethical AI & Responsible Innovation is the lead focus area, reflecting ODI Data Ethics Professional certification
- Five areas of focus presented as an interactive tile grid
- Photos from recent speaking engagements (AI in Healthcare Symposium, Business of Science Conference, Liverpool AI Summit)
- Links to ORCID, the UKRI Intelligent Observatory press release, and the AI in Healthcare Symposium
- Fast: Hugo builds in ~45ms, site loads with zero JavaScript dependencies
- Lightweight: entire site including images is under 300KB

**Deployment:**
1. Archive the old site to an `archive/old-site` branch
2. Push the new Hugo site to `main`
3. Change GitHub Pages source to "GitHub Actions" in repo settings
4. Custom domain continues via CNAME

**What's next:**
- Family apps section with Google OAuth (recipes, dashboards) — deferred to a future phase
- Old content archival decisions (publications, posts) — at owner's discretion
- Potential font upgrade to Moderat Bold (commercial, currently using Archivo as substitute)
