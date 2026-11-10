// Executed by `quarto run` with Quarto's bundled Deno and standard library.
import { parse, stringify, JSON_SCHEMA } from "stdlib/yaml";

const POSTS_MENU_LABEL = "Posts";
const POSTS_MENU_LIMIT = 8;

type RecordData = Record<string, unknown>;
function object(value: unknown, context: string): RecordData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${context}: expected a YAML mapping`);
  }
  return value as RecordData;
}
function requiredString(value: unknown, context: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${context}: expected a nonempty string`);
  return value;
}
function postDate(value: unknown, path: string): number {
  const text = value instanceof Date ? value.toISOString().slice(0, 10) :
    requiredString(value, `${path} date`);
  const timestamp = /^\d{4}-\d{2}-\d{2}$/.test(text) ? Date.parse(`${text}T00:00:00Z`) : NaN;
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== text) {
    throw new Error(`${path}: date must be a valid YYYY-MM-DD date`);
  }
  return timestamp;
}
function frontMatter(path: string): RecordData {
  const text = Deno.readTextFileSync(path).replace(/^\uFEFF/, "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)(?:\r?\n|$)/);
  if (!match) throw new Error(`${path}: missing YAML front matter`);
  // Keep ISO dates as text so impossible dates are not normalized by YAML.
  return object(parse(match[1], { schema: JSON_SCHEMA }), path);
}
function* posts(directory: string): Generator<string> {
  const entries = [...Deno.readDirSync(directory)].sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory) yield* posts(path);
    else if (entry.isFile && entry.name.endsWith(".qmd")) yield path;
  }
}
// Avoid rewriting unchanged generated files: preview must not loop on its own output.
function writeIfChanged(path: string, text: string) {
  try { if (Deno.readTextFileSync(path) === text) return; }
  catch (error) { if (!(error instanceof Deno.errors.NotFound)) throw error; }
  Deno.writeTextFileSync(path, text);
}
try {
  const raw = parse(Deno.readTextFileSync("authors.yml"));
  if (!Array.isArray(raw)) throw new Error("authors.yml: expected a list of authors");
  const registry = new Map<string, RecordData>();
  for (const value of raw) {
    const record = object(value, "authors.yml");
    const id = requiredString(record.id, "authors.yml id");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error(`authors.yml: invalid slug "${id}"`);
    if (registry.has(id)) throw new Error(`authors.yml: duplicate slug "${id}"`);
    requiredString(record.name, `authors.yml ${id} name`);
    requiredString(record.status, `authors.yml ${id} status`);
    registry.set(id, record);
  }
  const items = [];
  const menuPosts: { path: string; title: string; date: number }[] = [];
  for (const path of posts("posts")) {
    const meta = frontMatter(path);
    const title = requiredString(meta.title, `${path} title`);
    const date = postDate(meta.date, path);
    if (meta.draft !== true) menuPosts.push({ path, title, date });
    if (!Array.isArray(meta.author) || !meta.author.length) {
      throw new Error(`${path}: author must be a nonempty list of registry slugs`);
    }
    const authors = meta.author.map((value) => {
      const slug = requiredString(value, `${path} author`);
      const author = registry.get(slug);
      if (!author) throw new Error(`${path}: unknown author slug "${slug}"`);
      return { id: slug, name: author.name };
    });
    // Validation includes drafts; Quarto's document-backed listing handles draft visibility.
    items.push({
      path: `../${path}`,
      author: authors.map((a) => a.name),
      "author-slugs": authors.map((a) => a.id),
      "author-records": authors,
    });
  }
  Deno.mkdirSync("generated", { recursive: true });
  writeIfChanged("generated/posts.yml", stringify(items));
  menuPosts.sort((a, b) => b.date - a.date || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const menu = menuPosts.slice(0, POSTS_MENU_LIMIT).map((post) => ({
    text: post.title, href: post.path,
  }));
  const nav = { website: { navbar: { left: [
    { text: "Home", href: "index.qmd" },
    { text: POSTS_MENU_LABEL, menu: [...menu, { text: "---" }, { text: "All posts", href: "index.qmd" }] },
    { text: "About", href: "about.qmd" },
    { text: "Contributors", href: "contributors.qmd" },
    { text: "Search", href: "search.qmd" },
  ] } } };
  writeIfChanged("_nav-posts.yml", stringify(nav));
  console.log(`Resolved author metadata for ${items.length} posts; generated ${Math.min(menuPosts.length, POSTS_MENU_LIMIT)} navbar post links.`);
} catch (error) {
  console.error(`Site metadata: ${error instanceof Error ? error.message : error}`);
  Deno.exit(1);
}
