// Executed by `quarto run` with Quarto's bundled Deno and standard library.
import { parse, stringify } from "stdlib/yaml";

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
function frontMatter(path: string): RecordData {
  const text = Deno.readTextFileSync(path).replace(/^\uFEFF/, "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)(?:\r?\n|$)/);
  if (!match) throw new Error(`${path}: missing YAML front matter`);
  return object(parse(match[1]), path);
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
  for (const path of posts("posts")) {
    const meta = frontMatter(path);
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
  console.log(`Resolved author metadata for ${items.length} posts.`);
} catch (error) {
  console.error(`Author metadata: ${error instanceof Error ? error.message : error}`);
  Deno.exit(1);
}
