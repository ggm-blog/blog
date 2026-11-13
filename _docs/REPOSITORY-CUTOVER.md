# Repository ownership cutover

The public site repository moved from `mattwagers/roundup-sandbox` to
[`ggm-blog/blog`](https://github.com/ggm-blog/blog) on November 12, 2026
(America/Los_Angeles), using GitHub's repository transfer operation.

The transfer preserved repository ID `R_kgDOSYLa8w`, the `main` commit,
12 pull request records, three Discussions, and all Discussion category IDs.
The Post Comments category remains `DIC_kwDOSYLa884C8oRx` and comments continue
to use pathname mapping. Post folders, dates, text, and publication gates are
unchanged.

Update existing clones with:

```sh
git remote set-url origin https://github.com/ggm-blog/blog
git fetch origin
```

GitHub redirects old repository URLs. Do not create a new repository at the
old `mattwagers/roundup-sandbox` path, which would replace those redirects.
A local Git bundle and before/after metadata snapshots were saved under
`/private/tmp` during the transfer; GitHub remains the authoritative repository.

## Deployment integration

Keep the existing Netlify project `majestic-palmier-4ce0f2` (project ID
`93a07f5e-ad92-42d6-ace9-40ce0b5a361b`). Relink its repository connection to
`ggm-blog/blog`, with the Netlify GitHub App limited to this repository.
Preserve `main` as production, the existing build command/configuration,
`_site` as the output, and staging only for deploy/branch previews.

At preparation time, the organization had no GitHub App installations.
Netlify and Giscus app access must be restored on the organization and verified
before the cutover is considered complete. Giscus needs metadata read and
Discussions write access; Netlify needs the permissions shown in its official
GitHub App installation screen. Limit each installation to `ggm-blog/blog`.

Verify a PR deploy preview, a production rebuild, and the live Giscus widget.
Production must still expose only approved, due posts; staging previews may
show the separate Drafts and scheduled section.

## Domain scope

This operation changes repository ownership and integration links. It does
not change DNS, Netlify project ownership, the Netlify hostname, or the draft
`https://ggmblog.org` site-url. The separate domain cutover checklist remains
in SPEC.md.
