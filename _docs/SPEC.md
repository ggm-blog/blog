# Consortium Blog — Technical Specification

## Why This Architecture

The blog is built on [Quarto](https://quarto.org), a scientific publishing system
that treats prose, code, math, and citations as first-class citizens. Posts are
plain text files (`.qmd`) that live in a Git repository, render to a static website,
and deploy automatically when changes are merged. There is no database, no CMS login
screen, and no server to maintain. The entire site is reproducible from the repository
alone. For a scholarly group that already works in R and Python, this means a post is
just a document — the same kind you already write — that happens to become a webpage.
The pipeline stays out of the way when you don't need it and reveals real power when
you do: a post can contain live R or Python output, LaTeX equations, interactive
figures, and properly formatted citations, all from the same file.

---

## Stack

| Layer | Tool | Notes |
|---|---|---|
| Authoring | [Quarto](https://quarto.org) | `.qmd` source files |
| R packages | renv (local only) | `renv.lock` pins packages for local reproducibility; not restored on Netlify |
| Version control | Git + GitHub | Org repo; posts submitted as pull requests |
| Build & deploy | [Netlify](https://netlify.com) | Triggered on merge to `main`; PR previews included |
| Search | Pagefind | Full-text index built by `build.sh` after render |
| Comments | Giscus | Backed by GitHub Discussions; requires GitHub account |
| Author profiles | `authors.yml` + contributors page | Stage 4 complete: profiles, bylines, listing filters, RSS |

---

## Repository Layout

```
/
├── _quarto.yml              # Site-wide config: theme, navbar, format defaults
├── index.qmd                # Home page — auto-generated post listing
├── about.qmd                # About the blog
├── contributors.qmd         # Author profile cards (rendered from authors.yml)
├── search.qmd               # Dedicated Pagefind search page
├── authors.yml              # Author registry
├── CONTRIBUTING.md          # How to write and submit a post
├── scripts/                 # Contributor refresh, guard, and author metadata
│   ├── refresh-contributors.sh
│   ├── authors-hash.sh
│   └── prepare-authors.ts    # Bundled-Deno registry validation and listing metadata
├── filters/
│   └── author-byline.lua     # Resolve title-block author identity before normalization
├── templates/
│   └── posts.ejs.md          # Static listing names and slug-keyed selectors
├── generated/               # Gitignored, regenerated every render
│   └── posts.yml            # Document-backed listing metadata
├── build.sh                 # Netlify build script (installs Quarto, renders, indexes)
├── netlify.toml             # Netlify config (build command, publish dir)
├── renv.lock                # R package lockfile (local use only)
├── .Rprofile                # Activates renv on project open (local use only)
├── _docs/                   # Internal docs (tracked, excluded from Quarto render)
│   └── SPEC.md              # This document
├── assets/
│   ├── custom.css
│   ├── author-filter.js     # Author/category selector behavior only
│   └── authors/             # Author photos: <slug>.jpg (optional, convention-based)
└── posts/
    ├── _metadata.yml        # Shared defaults applied to every post
    └── YYYY-MM-slug/
        ├── index.qmd        # Post source
        ├── references.bib   # Citations (if used)
        ├── thumbnail.png    # Listing image (optional)
        └── data/            # Data files (optional)
```

---

## Build Pipeline

On every push to `main`, Netlify:

1. Runs `build.sh`, which:
   - Checks `_freeze/authors.hash` against `authors.yml` plus sorted author photo filenames; fails on stale metadata
   - Downloads and installs the pinned Quarto version from GitHub releases
   - Runs `quarto render`; its pre-render hook uses bundled Deno to validate registry slugs and regenerate `generated/posts.yml`
   - A pre-AST Lua filter resolves names, URLs, and ORCIDs for post title blocks
   - Quarto renders static HTML and RSS into `_site/`, with display names supplied by generated listing metadata
   - Runs `npx pagefind --site _site` to build the full-text search index
2. Publishes `_site/` to the Netlify CDN

On every pull request, Netlify additionally generates a **deploy preview** — a
live, publicly accessible URL rendering that branch's version of the site. This
is how posts are reviewed before publication.

The Quarto setting `freeze: auto` means code chunks are only re-executed when
their source changes. Frozen output is committed to the repo under `_freeze/`,
so the build remains fast even as the post archive grows. **R code is rendered
locally** and its frozen output committed; the Netlify build does not run R.

---

## Authorship Model

The blog separates three roles:

**Authors** write posts. An author can be anyone — consortium members, invited
guests, or external contributors. An author does not need a GitHub account to
write a post, but one is required to open a pull request directly. Authors who
are not comfortable with Git can deliver their `.qmd` file to an editor or
maintainer who handles the submission on their behalf.

**Editors** commission and approve posts. Approval is signaled by merging the
pull request. Editors need GitHub accounts with write access to the repository.

**Maintainers** manage the repository infrastructure — dependencies, build
configuration, and platform settings. There may be one or more maintainers;
this role may overlap with the editorial board or be held separately.

---

## Author Identity & Profiles

Each author has a persistent slug ID used consistently across posts and the
author registry. The slug is lowercase and hyphenated and should never change
after a contributor's first post.

### Post front matter

`author` is always a list, supporting single and multi-author posts uniformly:

```yaml
author:
  - jane-smith

# co-authored post:
author:
  - jane-smith
  - alex-johnson
```

### Byline and listing mechanism

Posts retain slug lists in source. `scripts/prepare-authors.ts` runs via
`project: pre-render` for both render and preview using the Deno interpreter and
`stdlib/yaml` bundled with pinned Quarto **1.9.37**. It scans `posts/**/*.qmd`,
validates a nonempty list of known slugs on every post (including drafts), rejects
duplicate registry IDs, and reports the post path and unknown slug on failure.
No R, Python, Node, network imports, or source rewrites are used by this step.

`filters/author-byline.lua` runs at `pre-ast`, reads the registry, and supplies
both `author` and `authors` metadata before Quarto normalizes authors. Title
blocks show display names in post order, link to `url` when supplied, and use
Quarto's built-in linked ORCID icon when supplied. Only identity fields are
forwarded; status, notes, and affiliation remain on profile cards.

`generated/posts.yml` contains document-backed listing entries pointing to each
original `.qmd`, with display-name authors, slug arrays, and selector labels.
Quarto merges these over document metadata, preserving titles, dates,
descriptions, images, categories, draft rules, and document links. The index uses
`templates/posts.ejs.md`; the same listing supplies display names to RSS creators.
Generated files are ignored and recreated even on a fresh checkout. Unchanged
generated content is not rewritten, avoiding preview watch loops.

The Author selector uses slug values and display-name labels. Category filtering
is a companion selector; both combine with Quarto's listing search and sorting.
`assets/author-filter.js` filters already-rendered items with List.js. It never
maps slugs to names in the browser: names, links, ORCIDs, and RSS creators exist
in the build output without JavaScript.

### Author registry (`authors.yml`)

All author metadata lives in a single `authors.yml` file at the repo root.
A complete entry looks like:

```yaml
- id: jane-smith
  name: Jane Smith
  status: editor
  url: https://jane-smith.com
  orcid: 0000-0000-0000-0000
  affiliation: UC Santa Cruz
  notes: "Ecologist. Specializes in population dynamics and Bayesian methods."
```

| Field | Required | Notes |
|---|---|---|
| `id` | ✅ | Persistent slug; matches post front matter and photo filename |
| `name` | ✅ | Display name |
| `status` | ✅ | `editor`, `member`, or `guest` |
| `url` | optional | Personal or institutional page |
| `orcid` | optional | Rendered as a linked ORCID badge on the contributor card |
| `affiliation` | optional | Institution or organization |
| `notes` | optional | 1–3 sentences or keyword list; not a full bio paragraph |

At least one of `url` or `orcid` is encouraged but neither is strictly required.
Cards render gracefully regardless of which optional fields are present.

### Photos

Photos are convention-based — no field in `authors.yml` is needed. Place a
file named `<slug>.jpg` in `assets/authors/` and it will appear on the
contributor card. If no matching file exists the card renders without a photo.

```
assets/authors/
  jane-smith.jpg     # appears on Jane's card
  alex-johnson.jpg   # appears on Alex's card
                     # sam-lee has no photo — card renders without one
```

### Contributor card layout

The contributors page (`contributors.qmd`) is rendered by an R code chunk that
reads `authors.yml` and generates Quarto grid markup dynamically.

- **Layout:** wrapping grid, multiple cards per row
- **Grouping:** Editors first, then all others; within each group, sorted
  alphabetically by last name
- **Card content** (rendered only if the field is present):
  - Photo (from `assets/authors/<slug>.jpg`)
  - Name (linked to `url` if provided)
  - Status badge
  - ORCID badge (linked to `https://orcid.org/<orcid>`)
  - Affiliation
  - Notes

### Status display

Status is shown on contributor cards only. It is never shown in post listings
or on the post page itself — all authors are presented identically in the
reading experience. Further visual treatment of `guest` status in the post
listing is a decision deferred to the editorial board.

### Managing author records

Author records are created and maintained by **editors or maintainers**, not
by authors themselves. When a new contributor is added:

1. The commissioning editor or a maintainer adds an entry to `authors.yml`
2. If a photo is provided, it is placed at `assets/authors/<slug>.jpg`
3. These changes are committed alongside (or ahead of) the contributor's first post PR

---

## Comments

Comments are powered by Giscus, which maps each post to a GitHub Discussions
thread in the repo. Readers need a GitHub account to comment. The editorial
board moderates via GitHub Discussions directly.

Comment threads are not indexed by Pagefind (which runs at build time against
static HTML). Comments are searchable via GitHub's native Discussions search —
a link is provided on the search page.

---

## Staged Implementation Plan

The site is being built incrementally. Completed stages are marked ✅.

| Stage | Feature | Status |
|---|---|---|
| 0 | Quarto skeleton + Netlify deploy pipeline | ✅ Complete |
| 1 | R package management via `renv` (local) | ✅ Complete |
| 2 | Full-text search via Pagefind | ✅ Complete |
| 3 | Post comments via Giscus | ✅ Complete |
| 4 | Multi-author system (profiles, registry, contributor page) | ✅ Complete |

---

## Key Configuration Files

### `_quarto.yml`
Controls site-wide settings: title, navigation, themes (light/dark), global
format options (`code-fold`, `toc`, `freeze`). Changes here affect every page.
The `search: true` key enables Quarto's built-in navbar search widget.

### `posts/_metadata.yml`
Inherits into every post without authors needing to repeat themselves. Currently
sets `toc`, `code-fold`, `code-tools`, figure alignment, and suppresses routine
R warnings. Add shared defaults here rather than in individual posts.

### `authors.yml`
Central registry of all contributors. Add a new entry here (and optionally a
photo in `assets/authors/`) when onboarding a new author. The `id` field must
match exactly the slug used in post front matter. See Author Identity & Profiles
for the full field reference.

### `renv.lock`
Pins R package versions for local development reproducibility. Run
`renv::restore()` locally when setting up a new machine or after the lockfile
changes. The Netlify build does not restore R packages — all R output is
pre-rendered and committed to `_freeze/`.

### `netlify.toml`
Pins the Quarto version via `QUARTO_VERSION` environment variable and points
Netlify at `build.sh`. Update `QUARTO_VERSION` here when upgrading Quarto;
`build.sh` reads it automatically.

### Contributor freeze guard

Run `scripts/refresh-contributors.sh` after changing `authors.yml`, author photos,
or contributor rendering. It deletes `_freeze/contributors/`, renders locally,
and records a SHA-256 of registry contents plus sorted filenames (including
`.gitkeep`) in `_freeze/authors.hash`. Commit `_freeze/` with the sources.
`build.sh` checks the same fingerprint without R before rendering. Photo content
replacements retain the same fingerprint; refresh locally for those too.
