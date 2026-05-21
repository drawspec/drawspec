# Viewer API — `<drawspec-diagram>`

The `@drawspec/viewer` package provides a web component for embedding DrawSpec diagrams in any HTML page.

## Installation

```bash
bun add @drawspec/viewer
```

## Usage

### Plain HTML

```html
<script type="module" src="node_modules/@drawspec/viewer/drawspec-viewer.js"></script>

<drawspec-diagram id="diagram" theme="light" interactive></drawspec-diagram>

<script type="module">
  const el = document.getElementById("diagram");
  el.svg = "<svg>...</svg>";
</script>
```

### React

```tsx
import "@drawspec/viewer/drawspec-viewer.js";
import { useRef, useEffect } from "react";

export function DiagramViewer({ svg, theme = "light" }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.svg = svg;
    }
  }, [svg]);
  return <drawspec-diagram theme={theme} interactive ref={ref} />;
}
```

### Svelte

```svelte
<script>
  import "@drawspec/viewer/drawspec-viewer.js";
  let el;
  let svg = "";

  $: if (el) el.svg = svg;
</script>

<drawspec-diagram bind:this={el} theme="light" interactive />
```

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `src` | `string` | — | URL to load a `ViewerPayload` from |
| `theme` | `"light" \| "dark"` | `"light"` | Color theme |
| `interactive` | `boolean` | `true` | Enable pan/zoom interactions |

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `svg` | `string` | Raw SVG string to render |
| `diagnostics` | `Diagnostic[]` | Validation diagnostics to display |
| `src` | `string` | URL to fetch diagram payload from |
| `theme` | `DrawspecTheme` | Current theme |
| `interactive` | `boolean` | Whether interactions are enabled |

## Events

Custom events are not yet implemented. Use property changes and polling for state observation for now.

## Viewer Payload

The component accepts data in `ViewerPayload` format:

```typescript
interface ViewerPayload {
  document?: DiagramDocument;
  svg?: string;
  diagnostics?: Diagnostic[];
}
```

When `src` is set, the component fetches this payload from the URL. When using `svg` directly, pass a pre-rendered SVG string.

## Programmatic Rendering

For server-side or build-time rendering without a browser:

```typescript
import { renderDiagramSvg } from "@drawspec/viewer";
import { sequence } from "@drawspec/uml-sequence";

const doc = sequence("Demo", (s) => {
  const a = s.actor("A");
  const b = s.participant("B");
  a.to(b, "Hello");
});

const svg = await renderDiagramSvg(doc, "dark");
```

## Live Preview Server

The CLI's `serve` command hosts a live preview using this component. Changes to diagram files are reflected instantly via WebSocket:

```bash
bunx drawspec serve . --open
```

The preview page at `http://localhost:4173/` uses `<drawspec-diagram>` with WebSocket-driven updates.
