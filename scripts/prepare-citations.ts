// Enhance Quarto's native appendix after rendering; never rewrite post sources.
import { parse } from "stdlib/yaml";
import { dirname, join } from "stdlib/path";
const output = Deno.env.get("QUARTO_PROJECT_OUTPUT_DIR") || "_site";
const config = parse(Deno.readTextFileSync("_quarto.yml")) as { website: { "site-url": string } };
const base = config.website["site-url"].replace(/\/$/, "") + "/";
type Post = { path: string; title: string; date: string; authors: string[]; license: string };
const posts: Post[] = JSON.parse(Deno.readTextFileSync("generated/citation-posts.json"));
const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const decode = (text: string) => text.replace(/&#(x[\da-f]+|\d+);|&(amp|lt|gt|quot|apos);/gi, (_, number, name) => {
  if (number) return String.fromCodePoint(number[0].toLowerCase() === "x" ? parseInt(number.slice(1), 16) : Number(number));
  return ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" } as Record<string, string>)[name.toLowerCase()];
});
Deno.mkdirSync(join(output, "assets"), { recursive: true });
Deno.copyFileSync("assets/cite.js", join(output, "assets/cite.js"));
// Quarto assembles full-text RSS before post-render hooks. Keep its native
// self-citation export consistent with the post and downloadable BibTeX.
const feedPath = join(output, "index.xml");
let feed: string | undefined;
try { feed = Deno.readTextFileSync(feedPath); }
catch (error) { if (!(error instanceof Deno.errors.NotFound)) throw error; }
for (const post of posts) {
  const path = join(output, post.path.replace(/\.qmd$/, ".html"));
  let html: string;
  try { html = Deno.readTextFileSync(path); }
  catch (error) { if (error instanceof Deno.errors.NotFound) continue; throw error; }
  // Only touch complete rendered post pages, never Quarto's hidden stubs.
  if (!html.includes('<main')) continue;
  if (html.includes('id="cite" class="ggm-cite"')) continue;
  const formatted = html.match(/<div[^>]*class="[^"]*quarto-appendix-citeas[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1];
  const originalBibtex = html.match(/<pre[^>]*class="[^"]*quarto-appendix-bibtex[^"]*"[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>/)?.[1];
  if (!formatted || !originalBibtex) throw new Error(`${post.path}: native formatted citation and BibTeX are required`);
  const permalink = new URL(post.path.replace(/index\.qmd$/, ""), base).href;
  const depth = dirname(post.path).split("/").length;
  const relativeRoot = "../".repeat(depth);
  // Preserve exact front-matter title casing in a BibTeX-protected value.
  const title = post.title.replace(/\\/g, "\\textbackslash{}")
    .replace(/[{}]/g, (character) => "\\" + character);
  const bibtexText = decode(originalBibtex).replace(
    /(^\s*title\s*=\s*)\{[\s\S]*?\},(?=\s*\n\s*\w+\s*=)/m,
    (_, prefix) => `${prefix}{{${title}}},`);
  const bibtex = escape(bibtexText);
  if (feed !== undefined) feed = feed.replaceAll(originalBibtex, bibtex);
  const reuse = html.match(/<section[^>]*id="quarto-reuse"[\s\S]*?<div class="quarto-appendix-contents">([\s\S]*?)<\/section>/)?.[1];
  if (!reuse) throw new Error(`${post.path}: native Reuse section is required`);
  const license = html.match(/<a rel="license" href="([^"]+)"/)?.[1] || post.license;
  // Native Reuse's inner wrappers are flattened, while its effective license
  // link (including a per-post override) is retained.
  const licenseLine = reuse.replace(/<\/?div[^>]*>/g, '');
  const panel = `<details id="cite" class="ggm-cite">
<summary>Copyright, reuse and citation</summary>
<div class="ggm-cite-body">
<div id="quarto-reuse">${licenseLine}</div>
<p class="ggm-license-scope">Authors retain copyright. This license covers post text; images and other third-party material are excluded unless noted.</p>
<div id="quarto-citation">
<div id="ggm-citation-text" class="csl-entry quarto-appendix-citeas">${formatted}</div>
<div class="ggm-copy-controls">
<button type="button" data-copy-source="ggm-citation-text" hidden>Copy citation</button>
<button type="button" data-copy-source="ggm-bibtex-text" hidden>Copy BibTeX</button>
<span class="ggm-copy-status" role="status" aria-live="polite" aria-atomic="true"></span>
</div>
<details class="ggm-bibtex"><summary>Show BibTeX</summary>
<pre class="ggm-cite-bibtex quarto-appendix-bibtex"><code id="ggm-bibtex-text">${bibtex}</code></pre>
<a class="ggm-bibtex-download" href="citation.bib" download>Download BibTeX</a>
</details>
</div></div></details>
<section id="comments" class="ggm-comments" aria-label="Comments" tabindex="-1"><h2>Comments</h2></section>
<script src="${relativeRoot}assets/cite.js" defer></script>
`;
  html = html.replace(/<section[^>]*id="quarto-reuse"[\s\S]*?<\/section>/, '');
  html = html.replace(/<section[^>]*id="quarto-citation"[\s\S]*?<\/section>/, '');
  html = html.replace(/<div id="quarto-appendix"[^>]*>\s*<\/div>/, '');
  html = html.replace('</main>', panel + '</main>');
  html = html.replace(/(<header id="title-block-header"[\s\S]*?)(<\/header>)/,
    '$1<p class="ggm-title-cite"><a href="#cite">Cite</a> <span aria-hidden="true">·</span> <a href="#comments">Comments</a></p>$2');
  // This stays inside Quarto's floating margin sidebar as the reader scrolls.
  html = html.replace(/(<nav id="TOC"[^>]*>[\s\S]*?<\/nav>)/,
    '$1<p class="ggm-toc-comments"><span class="ggm-toc-cite"><a href="#cite" class="ggm-floating-cite" title="Copy APA citation">Cite</a><span class="ggm-floating-cite-status" role="status" aria-live="polite" aria-atomic="true"></span></span><a href="#comments">Jump to comments</a></p>');
  html = html.replace('document.getElementById("quarto-content").appendChild(script)',
    'document.getElementById("comments").appendChild(script)');
  const schema = { "@context": "https://schema.org", "@type": "BlogPosting",
    headline: post.title, author: post.authors.map((name) => ({ "@type": "Person", name })),
    datePublished: post.date, url: permalink, license };
  const json = JSON.stringify(schema).replace(/</g, "\\u003c");
  if (!html.includes('property="og:url"')) {
    html = html.replace('</head>', `<meta property="og:url" content="${permalink}">\n</head>`);
  }
  html = html.replace('</head>', `<script type="application/ld+json">${json}</script>\n</head>`);
  Deno.writeTextFileSync(path, html);
  Deno.writeTextFileSync(join(dirname(path), "citation.bib"), bibtexText);
}
if (feed !== undefined) Deno.writeTextFileSync(feedPath, feed);
console.log(`Prepared native citation boxes and BlogPosting metadata for ${posts.length} visible posts.`);
