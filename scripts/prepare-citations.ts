// Enhance Quarto's native appendix after rendering; never rewrite post sources.
import { parse } from "stdlib/yaml";
import { dirname, join } from "stdlib/path";
const output = Deno.env.get("QUARTO_PROJECT_OUTPUT_DIR") || "_site";
const config = parse(Deno.readTextFileSync("_quarto.yml")) as { website: { "site-url": string } };
const base = config.website["site-url"].replace(/\/$/, "") + "/";
type Post = { path: string; title: string; date: string; authors: string[]; license: string };
const posts: Post[] = JSON.parse(Deno.readTextFileSync("generated/citation-posts.json"));
const decode = (text: string) => text.replace(/&#(x[\da-f]+|\d+);|&(amp|lt|gt|quot|apos);/gi, (_, number, name) => {
  if (number) return String.fromCodePoint(number[0].toLowerCase() === "x" ? parseInt(number.slice(1), 16) : Number(number));
  return ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" } as Record<string, string>)[name.toLowerCase()];
});
Deno.mkdirSync(join(output, "assets"), { recursive: true });
Deno.copyFileSync("assets/cite.js", join(output, "assets/cite.js"));
for (const post of posts) {
  const path = join(output, post.path.replace(/\.qmd$/, ".html"));
  let html: string;
  try { html = Deno.readTextFileSync(path); }
  catch (error) { if (error instanceof Deno.errors.NotFound) continue; throw error; }
  // Only touch complete rendered post pages, never Quarto's hidden stubs.
  if (!html.includes('<main')) continue;
  if (html.includes('id="cite-this-post"')) continue;
  const formatted = html.match(/<div[^>]*class="[^"]*quarto-appendix-citeas[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1];
  const bibtex = html.match(/<pre[^>]*class="[^"]*quarto-appendix-bibtex[^"]*"[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>/)?.[1];
  if (!formatted || !bibtex) throw new Error(`${post.path}: native formatted citation and BibTeX are required`);
  const permalink = new URL(post.path.replace(/index\.qmd$/, ""), base).href;
  const depth = dirname(post.path).split("/").length;
  const relativeRoot = "../".repeat(depth);
  const box = `<section id="cite-this-post" class="ggm-cite" aria-labelledby="cite-this-post-heading">
<h2 id="cite-this-post-heading">Cite this post</h2>
<div id="ggm-citation-text" class="ggm-cite-text">${formatted}</div>
<button type="button" data-copy-source="ggm-citation-text" hidden>Copy citation</button>
<pre class="ggm-cite-bibtex"><code id="ggm-bibtex-text">${bibtex}</code></pre>
<button type="button" data-copy-source="ggm-bibtex-text" hidden>Copy BibTeX</button>
<a class="ggm-bibtex-download" href="citation.bib" download>Download BibTeX</a>
<span class="ggm-copy-status" role="status" aria-live="polite" aria-atomic="true"></span>
</section>\n<script src="${relativeRoot}assets/cite.js" defer></script>\n`;
  html = html.replace('</main>', box + '</main>');
  html = html.replace(/(<header id="title-block-header"[\s\S]*?)(<\/header>)/,
    '$1<p class="ggm-title-cite"><a href="#cite-this-post">Cite</a></p>$2');
  html = html.replace(/(<section[^>]*id="quarto-reuse"[\s\S]*?)(<\/section>)/,
    '$1<p class="ggm-license-scope">Authors retain copyright. This license covers post text; images and other third-party material are excluded unless noted.</p>$2');
  const license = html.match(/<a rel="license" href="([^"]+)"/)?.[1] || post.license;
  const schema = { "@context": "https://schema.org", "@type": "BlogPosting",
    headline: post.title, author: post.authors.map((name) => ({ "@type": "Person", name })),
    datePublished: post.date, url: permalink, license };
  const json = JSON.stringify(schema).replace(/</g, "\\u003c");
  if (!html.includes('property="og:url"')) {
    html = html.replace('</head>', `<meta property="og:url" content="${permalink}">\n</head>`);
  }
  html = html.replace('</head>', `<script type="application/ld+json">${json}</script>\n</head>`);
  Deno.writeTextFileSync(path, html);
  Deno.writeTextFileSync(join(dirname(path), "citation.bib"), decode(bibtex));
}
console.log(`Prepared native citation boxes and BlogPosting metadata for ${posts.length} visible posts.`);
