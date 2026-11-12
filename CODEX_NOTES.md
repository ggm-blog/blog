# Handoff notes: first four drafts

Unzip over the repo root (adds `authors.yml`, four post folders, one script, this note). Then `quarto preview`.

## Ground rule
Post body text is **verbatim from the authors' drafts. Do not edit it.** Only front matter and Markdown formatting were added.

## What is here
| Folder | Source | Date (made up) | Authors |
|---|---|---|---|
| posts/2026-11-ggm-origin-story | Drive "0. Intro the GGM Blog" | 2026-11-16 | all seven founders |
| posts/2026-11-tensor-tension | Drive "1. Lau Tensor Tension" | 2026-11-23 | ellen-lau |
| posts/2026-11-surprising-riposte | Drive "2. Dillon Surprisal Riposte" | 2026-11-30 | brian-dillon |
| posts/2026-12-parser-grammar | gist by Tim Hunter (#4) | 2026-12-07 | tim-hunter |

## TODO 1: Post 4 is a stub (`draft: true`)
The gist was unreachable from the build environment. Run `scripts/import-gist-post.sh` (needs git + network), which pastes the verbatim gist text under the existing front matter and copies its 3 PNGs. Then remove `draft: true` if the result looks right. Title/description/categories for this post were inferred from the gist's filename and summary.

## TODO 2: Things left as the authors wrote them (flagged, not fixed)
- Post 0: placeholders `[link]` (Hornstein's blog), `[email address? form?]`, `[link to commenting page]` remain visible. The Drive Doc also has an open comment about the blog name (GGM vs "Grammars Gone Mental") and empty trailing headings "EllenPost", "Commenting HOWTO", "GrammarAsInformationPost" (not included here, since they have no text). Title "GGM Origin Story" comes from the Doc heading.
- Post 0 and post 2: literal `*asterisks*` in the source (e.g. `*Glot International*`, footnote 1 `*all*`) show as literal asterisks. That is what the Docs export gives; they are probably meant as italics in the authors' source. Decide with the authors.
- Post 1: Babbage gear photo extracted from the .docx as `babbage-gear.png` (510x400, low resolution). Source/credit unknown; the author should confirm rights and supply a caption/credit. Alt text was written by me. Footnote and numbered-list formatting came from the Drive export; check the list renders as intended.
- Post 2: parenthetical citations are plain text (no BibTeX).
- No `references.bib` anywhere: the authors cite in plain text.

## TODO 3: Contributor cards (`authors.yml`)
All seven founders from post 0 are included. **Inferred, please verify:** `status: editor` for everyone (assumed because they are the founding group), affiliations (from my general knowledge, may be out of date, especially Laurel Perkins and Dave Kush), and the short keyword `notes`. No `url`, `orcid`, or photos were added since nothing confirms them. Add photos as `assets/authors/<id>.jpg`. This file replaces the placeholder demo authors; delete any demo posts that reference them.

## Also invented
Dates (Nov/Dec 2026), `categories`, and one-sentence `description` fields.

## Import follow-up — 2026-11-09

- Tim Hunter's gist was imported successfully. The post body is byte-for-byte
  identical to `blogpost-parser-grammar.md`; all three PNGs match the gist.
  `draft: true` was removed after checking the import. The gist's own leading
  title is retained, so the title appears in both the title block and body.
- The source uses three remote gist image URLs, rather than local filenames.
  All three resolve and match the local copies. They are retained verbatim.
- The other three `.qmd` drafts remain byte-for-byte identical to the ZIP.
- Both placeholder/demo post folders and their frozen analysis output were
  removed because their author slugs no longer exist in the registry.
- Contributors and the author fingerprint were refreshed for the seven founders.
  The unused Jane placeholder photo is retained; it matches no registry entry.
- Dates, categories, descriptions, editor roles, and keyword blurbs still need
  editorial approval. The unresolved links, escaped asterisks, and Babbage photo
  credit/rights questions above are unchanged. Future dates do not by themselves
  hide posts from this Quarto site; these are review drafts, not a publication schedule.

### Affiliation checks

Primary pages checked on 2026-11-09 support the supplied affiliations:

- Brian Dillon — [UMass Amherst](https://www.umass.edu/linguistics/about/directory/brian-dillon)
- Tim Hunter — [UCLA](https://linguistics.ucla.edu/person/tim-hunter/)
- Ellen Lau — [University of Maryland](https://ellenlau.net/)
- Dave Kush — [Toronto contact information](https://davewkush.github.io/)
- Laurel Perkins — [UCLA](https://linguistics.ucla.edu/person/laurel-perkins/)
- Matt Wagers — [UC Santa Cruz](https://people.ucsc.edu/~mwagers/)
- Ming Xiang — [University of Chicago](https://linguistics.uchicago.edu/directory/ming-xiang)

Maryland announcements describe Brian's and Matt's moves as beginning in August
2027, so their current affiliations above were retained:
[Brian](https://languagescience.umd.edu/news/brian-dillon-returning-professor),
[Matt](https://linguistics.umd.edu/news/matt-wagers-maryland).
These checks do not establish anyone's editorial role or approve the profile blurbs.
