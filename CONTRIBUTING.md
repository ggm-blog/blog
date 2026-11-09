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
description: "A one- or two-sentence summary shown in the listing."
bibliography: references.bib
image: thumbnail.png
---
```

## 5. Local preview

To preview the blog locally before opening a PR:

```bash
quarto preview
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
unused fields. Keep the slug stable. The supplied records and ORCIDs are placeholders.

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
names for the home page and RSS feed. The home page's Author selector uses
persistent slugs internally while displaying names; it works together with the
Category selector, text search, and sorting. JavaScript is used only for the
interactive selectors, not to replace bylines or display names.

After changing author metadata, refresh the contributors page as described above,
then render the whole site to check bylines, listings, and RSS. Posts containing R
chunks still need to be rendered and frozen locally before submitting a PR;
the Netlify build does not execute R.
