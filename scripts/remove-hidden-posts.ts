// Quarto gone mode emits stubs and copies assets. Remove hidden post outputs
// after rendering so neither stale staging files nor stubs reach publication.
import { join, dirname } from "stdlib/path";
const output = Deno.env.get("QUARTO_PROJECT_OUTPUT_DIR") || "_site";
const hidden: string[] = JSON.parse(Deno.readTextFileSync("generated/hidden-posts.json"));
for (const source of hidden) {
  const directory = join(output, dirname(source));
  try { Deno.removeSync(directory, { recursive: true }); }
  catch (error) { if (!(error instanceof Deno.errors.NotFound)) throw error; }
}
