# robertfirth.co.uk — Project Specification

## Overview

Personal professional website for Dr Rob Firth, AI Researcher at the STFC Hartree Centre. Replaces a legacy Jekyll site (academic-era, circa 2016–2018) with a lightweight Hugo static site.

**Live URL:** https://robertfirth.co.uk
**Repository:** https://github.com/RobFirth/RobFirth.github.io
**Hosting:** GitHub Pages (via GitHub Actions)
**Domain:** Custom domain `robertfirth.co.uk` (CNAME configured)

---

## Site Structure

| Page | Route | Purpose |
|------|-------|---------|
| Home | `/` | Hero with name, title, intro, headshot, contact links. Tile grid of focus areas. Featured photo. |
| Interests | `/interests/` | Expanded descriptions of five focus areas with photos. Anchor links from homepage tiles. |
| Contact | `/contact/` | Email, GitHub, LinkedIn, ORCID as styled cards. Featured photo. |

---

## Content Summary

### Identity & Bio
- **Name:** Dr Rob Firth
- **Title:** AI Researcher · Hartree Centre, STFC
- **Intro:** AI researcher and certified data ethics professional. Applied AI and responsible innovation. Background in astrophysics.

### Focus Areas (in display order)
1. **Ethical AI & Responsible Innovation** — ODI-certified Data Ethics Professional. Lead interest.
2. **NLP & Large Language Models** — Applied NLP for technical domains, document processing on HPC.
3. **AI for Science** — Co-initiated the Intelligent Observatory programme with SAAO. Links to UKRI press release.
4. **Astrophysics** — PhD at Southampton on Type Ia supernovae.
5. **Open Source & Software** — Python, scientific tooling, research software sustainability.

### External Links
- GitHub: https://github.com/RobFirth
- LinkedIn: https://www.linkedin.com/in/robfirth
- ORCID: https://orcid.org/0000-0002-9427-1850
- Email: contact@robertfirth.co.uk
- UKRI SAAO press release: https://www.ukri.org/news/uk-south-africa-partnership-uses-ai-to-make-telescopes-smarter/
- AI in Healthcare Symposium: https://www.healthinnovationnwc.nhs.uk/news/AI-in-healthcare-symposium

---

## Technical Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Static site generator | Hugo | Fast builds (~45ms), single binary, no dependency management. Scales well if pages are added later. |
| Hosting | GitHub Pages | Free, already in use, supports custom domains. |
| Deployment | GitHub Actions | Hugo builds on push to `main`, deploys via `actions/deploy-pages`. |
| CSS | Custom, no framework | ~280 lines. CSS custom properties for theming. Responsive. |
| Fonts | Google Fonts | Archivo (display/titles), JetBrains Mono (UI/code), Source Serif 4 (body). |
| Images | WebP, self-hosted in repo | 5 images, 230KB total after compression. Stored in `static/img/`. |

---

## Design Specification

### Theme
- **Mode:** Dark (`#0f0f0f` background)
- **Accent:** Amber `#f59e0b` (used for links, section headings, tile icons)
- **Tone:** Developer-style, minimal. No gradients, rounded corners, or decorative elements.

### Typography
| Role | Font | Weight | Usage |
|------|------|--------|-------|
| Display / Titles | Archivo | 700 (Bold) | h1, h2, tile headings, site name. Closest free match to Moderat. |
| UI / Labels | JetBrains Mono | 400, 700 | Nav links, footer, captions, tile labels, tagline. |
| Body text | Source Serif 4 | 400, 600 | Paragraphs, intro text. |

### Layout
- **Max content width:** 680px (`--measure`)
- **Tile grid:** `auto-fill, minmax(280px, 1fr)` with 1px border gaps
- **Hero:** Flexbox with headshot (120×120px) right-aligned
- **Photos:** Full-width with monospace captions

### Colour Palette
| Variable | Value | Usage |
|----------|-------|-------|
| `--bg` | `#0f0f0f` | Page background |
| `--bg-raised` | `#171717` | Cards, hover states |
| `--border` | `#2a2a2a` | Dividers, tile grid |
| `--text` | `#d4d4d4` | Body text |
| `--text-dim` | `#737373` | Secondary text, captions |
| `--text-bright` | `#f5f5f5` | Headings, emphasis |
| `--accent` | `#f59e0b` | Links, active states |
| `--accent-dim` | `#b47008` | Tile labels (default) |

---

## Images

| Filename | Content | Placement | Dimensions | Size |
|----------|---------|-----------|------------|------|
| `headshot.webp` | Professional portrait (Hartree Centre) | Homepage hero | 400×400 | 11KB |
| `hartree-talk.webp` | Presenting on responsible AI | Homepage footer | 800×559 | 57KB |
| `bosc-panel.webp` | Business of Science Conference panel | Interests (Ethical AI section) | 800×529 | 39KB |
| `bosc-closeup.webp` | Panel close-up | Interests (bottom) | 800×514 | 26KB |
| `ai-summit-panel.webp` | Liverpool AI Summit 2024 | Contact page | 800×1129 | 97KB |

---

## File Structure

```
.
├── .github/workflows/hugo.yml    # CI/CD pipeline
├── .gitignore
├── hugo.toml                     # Site config
├── content/
│   ├── _index.md                 # Homepage (content handled by template)
│   ├── interests/index.md        # Interests page content
│   └── contact/index.md          # Contact page content
├── layouts/
│   ├── _default/
│   │   ├── baseof.html           # Base HTML shell
│   │   ├── single.html           # Single page template
│   │   └── list.html             # List/section template
│   ├── index.html                # Homepage template
│   └── partials/
│       ├── header.html           # Nav
│       └── footer.html           # Footer
└── static/
    ├── CNAME                     # Custom domain
    ├── css/style.css             # Stylesheet
    └── img/                      # Compressed images (webp)
```

---

## Future Plans (Not Yet Implemented)

- **Family apps** — Private section (`/family/` or subdomain) with Google OAuth. Recipe storage, crossword score dashboard, etc. Likely Firebase backend or small Flask/FastAPI API.
- **Old content archival** — Publications, blog posts, posters from academic era. To be moved to an `archive` branch.
- **Moderat font** — Display font preference is Moderat Bold by TIGHTYPE (€30). Currently using Archivo as a free alternative. Could self-host if purchased.
