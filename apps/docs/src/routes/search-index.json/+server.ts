import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const prerender = true;

export function GET() {
  const indexPath = resolve(
    process.env.DRAWSPEC_DOCS_SEARCH_INDEX ?? "../../docs/dist/search-index.json"
  );

  if (!existsSync(indexPath)) {
    return new Response(JSON.stringify({ version: 1, options: undefined, index: undefined }), {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  return new Response(readFileSync(indexPath, "utf8"), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
