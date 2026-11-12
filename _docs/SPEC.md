# Grammars Gone Mental — Technical Specification

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
| Theme | Bootswatch Litera in both modes | Warm paper light palette and warm ink dark palette via local SCSS |
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
├── _nav-posts.yml           # Generated navbar + project draft list (gitignored)
├── _quarto-staging.yml      # Visible drafts for review builds
├── _publish.yml             # Conventional weekday + publication timezone
├── index.qmd                # Home page — auto-generated post listing
├── about.qmd                # About the blog
├── contributors.qmd         # Author profile cards (rendered from authors.yml)
├── search.qmd               # Dedicated Pagefind search page
├── authors.yml              # Author registry
├── CONTRIBUTING.md          # How to write and submit a post
├── scripts/                 # Contributor refresh, guard, and author metadata
│   ├── refresh-contributors.sh
│   ├── authors-hash.sh
│   ├── next-publish-date.py  # Local stdlib date helper
│   └── prepare-authors.ts    # Bundled-Deno identity, date gates, navbar metadata
├── tests/test-prelaunch.py  # Isolated publishing integration checks
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
│   ├── light.scss          # Litera light-mode palette
│   ├── dark.scss           # Litera dark-mode palette
│   ├── listing-home.ejs    # Latest, pinned, and compact archive listing
│   ├── custom.css
│   ├── author-filter.js     # Author/category selector behavior only
│   └── authors/             # Author photos: <slug>.jpg (optional, convention-based)
└── posts/
    ├── _metadata.yml        # Shared defaults applied to every post
    └── YYYY-MM-slug/
        ├── index.qmd        # Post source
        ├── _metadata.yml    # Generated date gate (gitignored, marker-owned)
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
   - Runs `quarto render`; its bundled-Deno pre-render validates all dates/slugs,
     evaluates the publication date in `_publish.yml`'s timezone, maintains
     marker-owned per-post date gates, and regenerates visible listing/navbar metadata
   - Production uses `website.draft-mode: gone`; Netlify deploy-preview and
     branch-deploy contexts set `QUARTO_PROFILE=staging` (`draft-mode: visible`)
   - A pre-AST Lua filter resolves names, URLs, and ORCIDs for post title blocks
   - Quarto renders static HTML and RSS into `_site/`, with display names supplied by generated listing metadata
   - Runs `npx pagefind --site _site` to build the full-text search index
2. Publishes `_site/` to the Netlify CDN

On pull requests targeting the production branch (`main`), Netlify additionally
generates a **deploy preview** — a
live, publicly accessible URL rendering that branch's version of the site. This
is how posts are reviewed before publication. For a PR targeting another base
branch, Netlify requires branch deploys to be enabled for that base.

The Quarto setting `freeze: auto` means code chunks are only re-executed when
their source changes. Frozen output is committed to the repo under `_freeze/`,
so the build remains fast even as the post archive grows. **R code is rendered
locally** and its frozen output committed; the Netlify build does not run R.

---

## Home page

`index.qmd` uses one Quarto listing with `assets/listing-home.ejs`. The generated
rank sorts dates descending, non-featured before featured on equal dates, then
by title. The newest live post is Latest. The newest live featured post is Pinned;
a featured latest appears once in the hero, with a Pinned badge. All posts
contains the remaining eligible posts, and is omitted entirely when empty.

Latest, Pinned, and Draft labels are text-sized `.ggm-badge` spans, not headings
or links. `anchor-sections: false` on the home page prevents stray anchor icons
on listing titles and metadata. Site title (1.9–2.25rem) > hero (1.6–1.75rem) >
pinned (1.35rem) > compact titles (1.15rem), in both modes and on phones.

The quiet Search posts form at the top submits `query` to Pagefind's Search
page; `query` avoids Quarto navbar search's reserved `q` parameter. Navbar search
is explicitly configured as an overlay icon. Pagefind remains the full-text
search engine on the Search page. Categories and RSS are retained; sort/filter
widgets stay disabled. RSS uses the same eligible posts and generated names.

Previews come from opening text, not front-matter descriptions. One-sentence
taglines use `subtitle:`. `max-description-length: 400` supplies hero/pinned
excerpts; compact excerpts are limited to about 160 characters. The origin
story retains `featured: true` for the launch pin. Staging separates drafts and scheduled posts below the live archive; Latest,
Pinned, and the dropdown use live posts in both profiles. Production includes
only approved, due posts.

---

## Navbar

The existing bundled-Deno pre-render script also generates `_nav-posts.yml`.
Top-level `metadata-files` merges that fragment into the project on Quarto 1.9.37;
no generated block rewrites `_quarto.yml`. The fragment also supplies the generated `website.drafts` list for hidden
production posts. It is an ignored build artifact, recreated on a fresh
checkout; unchanged output is not rewritten.

After Home, the menu labeled by `POSTS_MENU_LABEL` lists the newest eight
live posts in both profiles, sorted by the same date/featured/title
rank as home, then a divider and All posts link. Titles and
ISO `YYYY-MM-DD` dates are required on every post; failures name the file and
field. Adding a post folder automatically adds an eligible menu entry.

`website.navbar.pinned: true` keeps the slimmer bar visible. Dropdown titles
wrap within 26rem and the phone hamburger menu. Quarto measures the actual
header height for body/TOC offsets; CSS adds clearance for heading and footnote
jumps. The existing light/dark palettes and toggle are retained.

---

## Staging and scheduled publication

`_publish.yml` defines the conventional publication weekday (`tuesday`) and the
IANA timezone (`America/Los_Angeles`). Tuesday is editorial convention, not a
validation restriction. `scripts/next-publish-date.py` (local Python 3.9+,
stdlib only) prints the next matching date strictly after today; `--n 2` prints
the second one. Netlify runs no Python for publication.

A manual `draft: true` is withheld regardless of date. An approved post with a
future ISO date is withheld until a build on or after that date, evaluated by
bundled Deno's `Intl` timezone support. All dates and author slugs are validated,
including hidden posts, and failures name the post. Production's generated
listing and menu contain only approved, due posts; author profile cards read
the registry and contain no post listings.

For a future, non-draft `posts/*/index.qmd`, pre-render writes folder
`_metadata.yml` with the first-line marker `# generated by pre-render date gate`
and `draft: true`, plus resolved citation authors. When due or in staging,
it retains the citation metadata and removes the draft flag.
An unmarked file is never changed; if it conflicts with a needed date gate,
the build fails clearly. These per-folder files are gitignored. Quarto 1.9.37
honors folder draft metadata, but post front matter `draft: false` overrides it.
Therefore `_nav-posts.yml` also supplies `website.drafts` for hidden posts;
this project-level draft list prevents that override from bypassing the gate.

Default/production uses `website.draft-mode: gone`. Tested on Quarto 1.9.37:
it strips hidden post HTML to blank stubs and omits posts from listings, Quarto
search, RSS, and sitemap. The post-render cleanup removes hidden post output
directories, including stubs and copied assets, before Pagefind indexes the site. `visible` renders complete drafts, includes
them in these outputs, and adds Quarto's built-in Draft page banner. The custom
listing supplies its own Draft span badge; the script explicitly filters the
Posts menu because that menu is generated independently of Quarto's listing.

`_quarto-staging.yml` enables visible drafts. Netlify deploy-preview and
branch-deploy contexts select it automatically with `QUARTO_PROFILE=staging`;
production `main` uses the default. Staging skips date gating entirely and
includes all four launch posts. Review with `quarto preview --profile staging`.
Quarto's local preview server forces draft-page visibility, so use an ordinary
`quarto render` without a profile for authoritative production checks.

Preview visibility is an editorial trade-off, not access control: deploy-preview
URLs use guessable sequential PR numbers, and staging search/RSS expose drafts.
To make previews follow production rules, remove both
`QUARTO_PROFILE = "staging"` lines from `netlify.toml`. Neither unpublished
assets nor a public source repository become private through draft mode.

### Manual redeploy routine

Merge an approved post with its intended date and no `draft: true`. On the
scheduled date, use Netlify **Deploys > Trigger deploy > Deploy site** for
`main`. Any deploy on or after that date publishes the post, including an
unrelated deploy; this is expected. An already deployed site does not change
when the clock crosses midnight. No scheduled GitHub Action or build hook is
configured.

Launch front matter: Tim Hunter and the featured origin story are approved for
November 17, 2026; Ellen Lau (November 24) and Brian Dillon (December 1) remain
manual drafts pending sign-off. Before November 17 production has no posts;
on/after November 17 it has Tim as Latest and the origin story as Pinned, with
no empty All posts group. Staging has all four.

`tests/test-prelaunch.py` tests these outputs in an isolated project copy,
including today/future/past boundaries, explicit `draft: false`, profile
transitions, equal-date ordering, featured-latest de-duplication, bad dates,
unknown slugs, and protection of hand-maintained metadata. It changes fixture
front matter only. Real post bodies must remain byte-for-byte unchanged.

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
No R, Python, Node, network imports, or post source rewrites are used by this step.
It also maintains publication gates and visible metadata as described above.

`filters/author-byline.lua` runs at `pre-ast`, reads the registry, and supplies
both `author` and `authors` metadata before Quarto normalizes authors. Title
blocks show display names in post order, link to `url` when supplied, and use
Quarto's built-in linked ORCID icon when supplied. Only identity fields are
forwarded; status, notes, and affiliation remain on profile cards.

`generated/posts.yml` contains document-backed listing entries pointing to each
original `.qmd`, with display-name authors, slug arrays, and selector labels.
Quarto merges these over document metadata, preserving titles, dates,
descriptions, images, categories, draft rules, and document links. The index uses
`assets/listing-home.ejs`; the same listing supplies display names to RSS creators.
Generated files are ignored and recreated even on a fresh checkout. Unchanged
generated content is not rewritten, avoiding preview watch loops.

The home listing groups posts as described under Home page. Category links filter
already-rendered items through Quarto; names, links, ORCIDs, and RSS creators exist
in the build output without browser-side slug mapping.

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
The `website.search` overlay configuration enables Quarto's navbar search icon.

### Theme layers and shared styling

Both modes use Bootswatch Litera: `light: [litera, assets/light.scss]` and
`dark: [litera, assets/dark.scss]`. The Quarto navbar light/dark toggle remains.
The SCSS files define the palette once, retaining warm paper (`#fffdf8`) and
charcoal (`#1c1b19`) backgrounds. Primary indigo is `#4f46e5` light / `#8b85ff`
dark, with hover shades `#4338ca` / `#a6a1ff`. Shared CSS aliases Bootstrap
colors as `--ggm-accent` and `--ggm-accent-2`; other semantic tokens come from SCSS.
Indigo supplies underlined content links, navbar title/active underline, Latest,
categories, focus outlines, active TOC markers, editor badges, and ORCID borders.

Secondary amber `#fbbf24` is restricted to small Pinned fills, a thin title rule,
and a narrow search-result hover/focus highlight. Light-mode rule/edge amber
is `#b45309` for contrast; dark mode uses `#fbbf24`. Pinned text is dark ink.
Editor badges use paper text in light mode and charcoal text in dark mode.
The existing green ORCID icon is unchanged; its ID text and border use indigo.
Member/guest badges retain their existing styling. Inline code uses body text.

Shared CSS retains an 860px content cap, limits essay text to 78ch, uses 1.7
line spacing, small category labels, rounded code blocks, and responsive images.
Contributor cards receive semantic status classes; frozen output must be refreshed
when the generator changes. Site and shared post defaults use `code-tools: false`.
Pagefind retains its Default UI and indexing pipeline. Giscus theme messages,
photos, icons, and post text are unchanged by the accent refresh.

Palette checks target 4.5:1 for normal text and 3:1 for UI outlines in both modes.
Indigo text has at least 5.53:1 light / 5.16:1 dark on body, navbar, and card
surfaces. Editor badge text has 6.19:1 / 5.65:1; Pinned text has 8.56:1 / 10.31:1.
Light amber edges have 3.01:1 against the Pinned fill and 4.94:1 against paper.
These are color-pair checks, not a complete accessibility audit.

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


## Deferred

- A scheduled daily rebuild via a GitHub Action calling a Netlify build hook,
  to adopt once publication volume is steady. Not implemented.
- Making the site repository private. Giscus requires a public repository with
  Discussions; a private site repository would need Giscus pointed at a
  separate public comments repository. No repository or Giscus settings changed.

## Licensing, citation, and permanence

Post text defaults to **CC BY 4.0**, with copyright retained by its authors.
Images and other third-party material are excluded unless explicitly noted;
authors check and document their rights and credits. Submitting a post accepts
this text license. Editors may approve a per-post `license:` override in front
matter. `posts/_metadata.yml` uses `license: "CC BY"`, which Quarto 1.9.37 renders
as a Reuse section linked to CC BY 4.0. The appendix scope note explains the text
boundary; the schema license follows the post's effective Reuse link.

The draft stable origin is **https://ggmblog.org**, which is not live yet.
Canonical, Open Graph, sitemap, RSS, Scholar, citation, and JSON-LD URLs use this
origin before cutover; navigation and cite-box asset/download links stay
relative so deploy previews work. The public repository URL, derived from
`git remote get-url origin`, is https://github.com/mattwagers/roundup-sandbox.
The footer attributes copyright to the authors and links the text license.

### Citation and author identity

Shared citation metadata uses `type: post-weblog` and
`container-title: Grammars Gone Mental`. A citation mapping enables Quarto's
native appendix (equivalent to `citation: true`, with additional fields).
`canonical-url: true` generates canonical links from `site-url`, and
`website.open-graph: true` supplies Open Graph metadata; the post-render
step adds `og:url` because Quarto 1.9.37 omits it here.
`google-scholar: true` supplies scholarly HTML meta tags;
`appendix-cite-as: [display, bibtex]` explicitly includes both representations.
The post's front-matter publication date is its citation date. No DOI is minted
or fabricated. The vendored APA 7 style in `assets/apa.csl` is used for both the
self-citation and reference lists; posts two levels below the root inherit
`csl: ../../assets/apa.csl`. Its upstream source is the official CSL styles
repository (`https://github.com/citation-style-language/styles`, `apa.csl`),
retrieved November 12, 2026. The style retains its embedded attribution and
CC BY-SA 3.0 license. A root-relative `/assets/apa.csl` does not work for Pandoc
in Quarto 1.9.37; remote Zotero paths fail Quarto's appendix citation renderer.

`authors.yml` may contain optional **both `family` and `given`** fields for
names requiring explicit handling (particles, compound surnames, non-Latin-only
names). By default, the last Latin-script word in `name` becomes `family` and
preceding Latin-script words become `given`, ignoring non-Latin characters:
`Ming Xiang 向明` becomes `family: Xiang`, `given: Ming`. A name without at least
two Latin-script words must supply explicit parts. Missing/empty parts fail
with the registry slug and an actionable error. Display names remain the full
registry `name` in bylines, feed creators, and schema Person entries.

The pre-render script validates these parts and writes
`generated/author-names.yml` for the byline filter. More importantly, it writes
`citation.author` structured name parts into the ignored, marker-owned
`posts/*/_metadata.yml` **for every post**, together with `draft: true` only when
needed by the production date gate. Quarto's JS-side appendix and Scholar
metadata are constructed outside the Lua author filter, so the filter alone
cannot fix their author slugs. Folder citation metadata fixes them before
rendering without rewriting source. These generated files now remain when a
post is due or in staging; only the draft flag is removed. Unmarked folder
metadata is never overwritten: move its settings into post front matter.

`assets/cite.js` enhances a static **Cite this post** box after the native
appendix. `scripts/prepare-citations.ts` reuses Quarto's formatted citation and
BibTeX, adds a title-block Cite link, and exports `citation.bib`. It fails clearly
if either native representation is missing. Both texts are readable with JS
disabled; native buttons support keyboard activation. Copy first tries
`navigator.clipboard`, then a temporary textarea and `execCommand('copy')`.
An aria-live status reports success or explains manual copying on failure.
Colors follow the shared light/dark indigo and amber variables.

### Discoverability, feed, and archiving

The listing explicitly sets `feed.type: full` and a large item limit, yielding
public full-text RSS at `/index.xml` with title, registry display-name authors,
publication date, and stable permalink in each entry. Quarto adds feed
autodiscovery in the home page head. Production includes only approved, due
posts. Staging feeds include editorial drafts and scheduled posts, as before;
those preview feeds are not the future archiving submission endpoint.

Every visible post has its own landing page, Google Scholar citation meta tags,
a schema.org **BlogPosting** JSON-LD object (headline, Person authors,
datePublished, canonical URL, effective license), a native APA/BibTeX appendix,
and a downloadable BibTeX record. These support discoverability; they do not
guarantee indexing or archive enrollment. Git version history and reproducible
sources provide the present preservation approach. Netlify serves the rendered
site; no independent archival deposit or DOI registration has occurred.

Published post folders must never be renamed or moved. If unavoidable, preserve
the old address with Quarto `aliases:` on the destination post and verify the
redirect in production and previews. Keep original publication dates stable and
record corrections through Git and PRs.

### Deferred

- Apply to Rogue Scholar after roughly **5–10 published posts**, once publishing
  is steady. No application, account registration, DOI minting, or archive
  submission is performed by this change. At application time, verify its
  current eligibility requirements against the production feed and landing
  pages. After a DOI is actually assigned, add it per post, for example:

  ```yaml
  citation:
    doi: 10.xxxx/assigned-identifier
  ```

  Retain the shared type/container and generated author defaults; verify the
  resulting appendix, BibTeX, Scholar metadata, and feed after rendering.
- **ggmblog.org cutover checklist:** add and verify the custom domain in Netlify;
  configure registrar/DNS records and the primary hostname; provision HTTPS and
  verify renewal; confirm `_quarto.yml` `site-url`; rebuild production; inspect
  canonical and Open Graph URLs, RSS autodiscovery/full-text entries, and
  sitemap; test landing pages, relative navigation, comments, and old-host
  redirects. Do not advertise the draft origin as live before these checks.
- Independent scholarly archiving begins only after acceptance by the service;
  Git history and hosting currently provide the available permanence measures.

No step-4 metadata or feed feature is deferred: full-text feed, Scholar tags,
BlogPosting JSON-LD, and BibTeX export are implemented.
