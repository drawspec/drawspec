import { sequence } from "@drawspec/uml-sequence";
import { sequenceLayout } from "@drawspec/layout";
import { renderSvg } from "@drawspec/renderer-svg";
/**
 * Demonstrates the full pipeline: define -> layout -> render -> write SVG file.
 *
 * Usage: bun run src/compile-and-render.ts
 */
async function compileAndRender() {
  // 1. Define the diagram using the builder API.
  const document = sequence("API Request Flow", (s) => {
    const client = s.actor("Client");
    const gateway = s.participant("API Gateway");
    const service = s.participant("User Service");
    const cache = s.participant("Redis");

    client.to(gateway, "GET /api/users/42");
    gateway.to(cache, "GET user:42");
    cache.to(gateway, "MISS");
    gateway.to(service, "findUser(42)");
    service.to(gateway, "{ id: 42, name: 'Ada' }").note("Persisted to cache");
    gateway.to(client, "200 OK");
  });

  // 2. Run layout to compute positions for all elements.
  const engine = sequenceLayout();
  const positionedDiagram = await engine.layout(document);

  // 3. Render the positioned diagram to an SVG string.
  const svg = await renderSvg(document, { positionedDiagram });

  // 4. Write the SVG to a file.
  const outPath = new URL("./output.svg", import.meta.url);
  await Bun.write(outPath, svg);

  console.log(`Rendered "${document.title}" (${positionedDiagram.width}x${positionedDiagram.height})`);
  console.log(`Output: ${outPath.pathname}`);
}

compileAndRender().catch(console.error);
