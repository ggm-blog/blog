# Contributing to Grammars Gone Mental

Thank you for contributing! Follow the steps below to create and submit a new post.

## 1. Branch naming

Create a new branch for each post using the convention:

```
post/short-description
```

Example: `post/power-analysis-tutorial`

## 2. Post folder naming

Inside `posts/`, create a folder named with the format:

```
YYYY-MM-short-title/
```

Example: `posts/2026-05-power-analysis/`

## 3. Files per post

| File | Required? | Notes |
|---|---|---|
| `index.qmd` | Yes | Main post content |
| `references.bib` | Recommended | BibTeX references |
| `thumbnail.png` | Optional | Listing page preview image |
| `data/` | Optional | Any raw or processed data files |

## 4. Front matter template

Paste this at the top of your `index.qmd` and fill in the fields:

```yaml
---
title: "Your Post Title"
author:
  - jane-smith
date: "YYYY-MM-DD"
categories: [category1, category2]
subtitle: "A one-sentence tagline shown below the post title."
draft: true
bibliography: references.bib
image: thumbnail.png
---
```

## 5. Local preview

To preview the blog locally before opening a PR:

```bash
quarto preview --profile staging
```

This starts a live-reloading server at `http://localhost:4200`.

## 6. Git workflow

```bash
# Stage your new post folder
git add posts/YYYY-MM-short-title/

# Commit with a descriptive message
git commit -m "Add post: your post title"

# Push your branch
git push origin post/short-description
```

Then open a pull request on GitHub. Netlify will automatically post a 
deploy-preview link in the PR comments so reviewers can see a live preview 
before merging.

## 7. Style notes

- **Code folding:** All code chunks are folded by default (`code-fold: true`). 
  You can override this per-chunk with `#| code-fold: false` if a snippet is 
  central to the narrative.
- **Figure labels:** Label figures with `#| label: fig-something` and include 
  a `#| fig-cap:` for cross-referencing with `@fig-something`.
- **Bibliography:** Keep `.bib` files inside the post folder, not at the 
  project root, to avoid namespace collisions.

## Author records and photos

Always use a list of persistent author slugs in post front matter, even for a
single author. For coauthors, add one slug per list item in the desired byline order.
Quarto resolves names, personal links, and ORCIDs from `authors.yml` at render
time. Do not put display names or author metadata in post front matter.

An editor or maintainer adds each contributor to root `authors.yml` before their
first post. Required fields are `id`, `name`, and `status` (`editor`, `member`,
`guest`). Optional fields are `url`, `orcid`, `affiliation`, and `notes`; omit
unused fields. Keep the slug stable. Use confirmed author details.

Add an optional JPEG at `assets/authors/<id>.jpg`. After changing the registry,
adding/removing/renaming a photo, or editing contributor rendering, run:

```bash
scripts/refresh-contributors.sh
git add authors.yml assets/authors/ contributors.qmd _freeze/
```

Commit the frozen output and `_freeze/authors.hash` with the source changes.
Netlify runs no R and rejects stale contributor metadata. The guard tracks photo
filenames, not image contents; also refresh after replacing an existing photo.

## Author bylines, listings, and validation

Use Quarto **1.9.37**, matching `netlify.toml`, for local renders and previews.
Both `quarto render` and `quarto preview` run `scripts/prepare-authors.ts` with
Quarto's bundled Deno. No separate Deno, Node, R, or Python is needed for this step.
The script validates all post author slugs (including drafts) and generates
`generated/posts.yml`. This file is ignored by Git and recreated on each render;
do not edit it. Unknown slugs stop the render with the post path and bad slug.

A Lua filter resolves each post's title-block author names, links, and ORCIDs
before Quarto normalizes its authors. The generated listing metadata supplies
names for the home page and RSS feed. The home page automatically groups posts as Latest, Pinned (`featured: true`),
and All posts. Empty groups are omitted. Category links remain available; the
quiet home search form opens Pagefind on the Search page. The Posts menu is
regenerated at build time. Display names do not depend on browser-side mapping.

After changing author metadata, refresh the contributors page as described above,
then render the whole site to check bylines, listings, and RSS. Posts containing R
chunks still need to be rendered and frozen locally before submitting a PR;
the Netlify build does not execute R.

## Drafts, scheduled dates, and publication

`draft: true` means a post is not approved for publication, regardless of its date.
Once approved, remove `draft: true` and set a valid ISO `YYYY-MM-DD` date. A future
date keeps it out of production until a build on or after that date, using
`America/Los_Angeles` from `_publish.yml`. Post folder names need not change when
the publication date changes. Tuesday is the conventional publication day, not
an enforced restriction; any valid date is allowed.

To print the next Tuesday strictly after today (Python 3.9+, stdlib only):

```bash
python3 scripts/next-publish-date.py
python3 scripts/next-publish-date.py --n 2
```

The helper reads `_publish.yml`; no Python is used on Netlify. The bundled-Deno
pre-render script checks all post dates and authors, including drafts. Missing
or impossible dates fail with the post path. Never edit generated
`posts/*/_metadata.yml`, `generated/posts.yml`, or `_nav-posts.yml`. These files
are ignored, rebuilt, and safe across profile switches. Generated folder
metadata now also provides citation authors for every post. Hand-maintained
folder metadata is never overwritten; move its settings into post front matter.

Review every post, including drafts and future dates, with:

```bash
quarto preview --profile staging
```

Staging also runs automatically on Netlify deploy-preview and branch-deploy
contexts. Drafts have text-sized Draft badges in the home listing and Quarto's
built-in Draft banner on their page. Staging includes them in search, RSS, and sitemap, with a separate home section
for drafts and scheduled posts. Latest, Pinned, and the Posts menu use only live
posts in both profiles. These are public previews: URLs use guessable,
sequential PR numbers. To make previews follow production visibility instead,
remove both `QUARTO_PROFILE = "staging"` lines from `netlify.toml`.

To check the actual production output locally, use `quarto render` with no
`QUARTO_PROFILE` set, then `npx pagefind --site _site`. Quarto's local preview
server itself makes draft pages visible; a production render is the authority
for publication checks. Production excludes hidden posts from listings, the
Posts menu, search, RSS, and sitemap. A post-render cleanup removes hidden post output directories, including
Quarto's blank `gone` stubs and copied assets. Author profile cards still show the registry;
they contain no staged-post listings.

### Manual publishing routine

1. Merge the approved post with its intended date and without `draft: true`.
2. On that date (Los Angeles time), open Netlify for the site and choose
   **Deploys > Trigger deploy > Deploy site** for `main`.
3. Check the home page, Posts menu, search, and RSS after the deploy finishes.

Any deploy on or after the date publishes a due, approved post. An unrelated
deploy after the date also publishes it; this is expected. The date alone does
not change an already deployed site. There is no scheduled Action or build hook.

The initial schedule is Tim Hunter and the pinned origin story on November 17,
2026; Ellen Lau on November 24 and Brian Dillon on December 1 remain drafts
until author sign-off. Equal dates sort non-featured posts first, then by title,
so Tim is Latest and the origin story is Pinned when those two are live.

Run the isolated publication regression checks with pinned Quarto:

```bash
python3 tests/test-prelaunch.py /path/to/quarto-1.9.37/bin/quarto
```

## Licensing, citations, and stable URLs

Submitting a post means agreeing to publish its **text under CC BY 4.0**.
Authors retain copyright. Check the rights for every image and other third-party
item, and state its credit and applicable terms in the post. The text license
does not automatically cover those materials.

The shared default is `license: "CC BY"` in `posts/_metadata.yml`. An editor may
approve a different license for an individual post; add a `license:` line to
that post's front matter and record the approval in its PR. The rendered Reuse
section and structured metadata reflect the override. Do not change the default
for a single exception.

Keep `author:` as registry slugs and set the post's actual publication `date:`.
The pre-render script supplies resolved citation names in generated folder
metadata, alongside publication gating. Never edit `posts/*/_metadata.yml`.
If a name needs explicit parsing, an editor adds both `family:` and `given:` to
its `authors.yml` record; otherwise the last Latin-script word is the family
name and preceding Latin-script words are the given names. The full `name:`
remains the byline and RSS display name. Unresolvable names fail the build.

The local `assets/apa.csl` supplies APA 7 for reference lists and each post's
native citation appendix. Use the shared default rather than a remote CSL URL.
Every post has readable citation/BibTeX text, copy buttons, a BibTeX download,
and a small title-block Cite link. No DOI is required or registered at launch.

**Never rename or move a published post folder.** Its URL is part of its citation.
If a move is unavoidable, retain the original publication date, add `aliases:`
to the destination post's front matter for the old URL, and test the redirect in
both production and a deploy preview before merging. For example:

```yaml
aliases:
  - /posts/2026-11-old-slug/
```

After publication, use Git commits to record corrections and explain substantive
changes in the PR. Do not silently repurpose an existing post URL for new work.
