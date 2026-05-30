import type {
  BadgeNode,
  BlockquoteNode,
  CalloutKind,
  CalloutNode,
  CodeBlockNode,
  CompiledDocDocument,
  DiagramNode,
  DocBlock,
  DocInline,
  HeadingNode,
  HtmlRenderOptions,
  ImageNode,
  LinkBlockNode,
  LinkInlineNode,
  ListNode,
  ParagraphNode,
  TabGroupNode,
  TableNode,
} from "./types";

// ─── HTML escaping ────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── CSS class helper ─────────────────────────────────────────────────

function cls(base: string, prefix: string): string {
  return `${prefix}-${base}`;
}

// ─── Shiki lazy loader ────────────────────────────────────────────────

interface ShikiHighlighter {
  codeToHtml: (code: string, options: { lang: string; theme: string }) => string;
  getLoadedLanguages: () => string[];
  getLoadedThemes: () => string[];
}

let highlighterPromise: Promise<ShikiHighlighter> | null = null;

async function getHighlighter(): Promise<ShikiHighlighter> {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const shiki = await import("shiki");
      return await shiki.createHighlighter({
        themes: ["github-light", "github-dark"],
        langs: ["typescript", "javascript", "json", "bash", "html", "css", "markdown"],
      });
    })();
  }
  return highlighterPromise;
}

// ─── renderDocHtml() ──────────────────────────────────────────────────

/**
 * Render a compiled DocDocument to HTML with syntax-highlighted code blocks.
 */
export async function renderDocHtml(
  doc: CompiledDocDocument,
  options: HtmlRenderOptions = {}
): Promise<string> {
  const prefix = options.classPrefix ?? "ds";
  const useInlineStyles = options.inlineStyles !== false;

  const parts: string[] = [];

  parts.push(`<article class="${cls("doc", prefix)}">`);
  parts.push(`<h1 class="${cls("title", prefix)}">${escapeHtml(doc.title)}</h1>`);

  if (doc.description) {
    parts.push(`<p class="${cls("description", prefix)}">${escapeHtml(doc.description)}</p>`);
  }

  for (const block of doc.content) {
    parts.push(await renderBlock(block, options, prefix, useInlineStyles));
  }

  parts.push("</article>");

  return parts.join("\n");
}

// ─── Block rendering ──────────────────────────────────────────────────

async function renderBlock(
  block: DocBlock,
  options: HtmlRenderOptions,
  prefix: string,
  useInlineStyles: boolean
): Promise<string> {
  switch (block.type) {
    case "heading":
      return renderHeading(block, prefix);
    case "paragraph":
      return renderParagraph(block, prefix);
    case "codeBlock":
      return await renderCodeBlock(block, options, prefix);
    case "diagram":
      return renderDiagram(block, prefix);
    case "callout":
      return renderCallout(block, prefix, useInlineStyles);
    case "linkBlock":
      return renderLinkBlock(block, prefix);
    case "list":
      return await renderList(block, options, prefix, useInlineStyles);
    case "table":
      return renderTable(block, prefix);
    case "image":
      return renderImage(block, prefix);
    case "divider":
      return renderDivider(prefix);
    case "thematicBreak":
      return renderDivider(prefix);
    case "tabGroup":
      return await renderTabGroup(block, options, prefix, useInlineStyles);
    case "badge":
      return renderBadge(block, prefix);
    case "blockquote":
      return await renderBlockquote(block, options, prefix, useInlineStyles);
    default:
      return "";
  }
}

function renderHeading(node: HeadingNode, prefix: string): string {
  const tag = `h${node.level}`;
  const attrs: string[] = [`class="${cls("heading", prefix)}"`];
  if (node.id) {
    attrs.push(`id="${escapeHtml(node.id)}"`);
  }
  return `<${tag} ${attrs.join(" ")}>${renderInlineChildren(node.children)}</${tag}>`;
}

function renderParagraph(node: ParagraphNode, prefix: string): string {
  return `<p class="${cls("paragraph", prefix)}">${renderInlineChildren(node.children)}</p>`;
}

async function renderCodeBlock(
  node: CodeBlockNode,
  options: HtmlRenderOptions,
  prefix: string
): Promise<string> {
  const lang = node.lang ?? "text";
  let codeHtml: string;

  if (options.highlightCode) {
    codeHtml = await options.highlightCode(node.value, lang);
  } else {
    try {
      const highlighter = await getHighlighter();
      const supportedLangs = highlighter.getLoadedLanguages();
      const effectiveLang = supportedLangs.includes(lang) ? lang : "text";
      const supportedThemes = highlighter.getLoadedThemes();
      const theme = supportedThemes.includes("github-light") ? "github-light" : supportedThemes[0];
      if (!theme) {
        codeHtml = `<pre><code>${escapeHtml(node.value)}</code></pre>`;
      } else {
        codeHtml = highlighter.codeToHtml(node.value, { lang: effectiveLang, theme });
      }
    } catch {
      codeHtml = `<pre class="${cls("code", prefix)}"><code>${escapeHtml(node.value)}</code></pre>`;
    }
  }

  const langLabel = `<span class="${cls("code-lang", prefix)}">${escapeHtml(lang)}</span>`;
  return `<div class="${cls("code-block", prefix)}">${langLabel}${codeHtml}</div>`;
}

function renderDiagram(node: DiagramNode, prefix: string): string {
  const caption = node.caption
    ? `<p class="${cls("diagram-caption", prefix)}">${escapeHtml(node.caption)}</p>`
    : "";
  return `<div class="${cls("diagram", prefix)}" data-diagram-ref="${escapeHtml(node.ref)}"><div class="${cls("diagram-placeholder", prefix)}">Diagram: ${escapeHtml(node.ref)}</div>${caption}</div>`;
}

function renderCallout(node: CalloutNode, prefix: string, useInlineStyles: boolean): string {
  const kindClass = `${cls("callout", prefix)}-${node.kind}`;
  const titleHtml = node.title
    ? `<div class="${cls("callout-title", prefix)}">${escapeHtml(node.title)}</div>`
    : "";

  const bodyHtml = renderInlineChildren(node.children);
  const styleAttr = useInlineStyles
    ? ` style="border-left: 4px solid ${calloutColor(node.kind)}"`
    : "";

  return `<div class="${cls("callout", prefix)} ${kindClass}"${styleAttr}>${titleHtml}<div class="${cls("callout-body", prefix)}">${bodyHtml}</div></div>`;
}

function calloutColor(kind: CalloutKind): string {
  switch (kind) {
    case "note":
      return "#3b82f6";
    case "tip":
      return "#10b981";
    case "warning":
      return "#f59e0b";
    case "important":
      return "#8b5cf6";
    case "caution":
      return "#ef4444";
  }
}

function sanitizeUrl(href: string): string {
  if (/^javascript:/i.test(href)) {
    return "#";
  }
  return href;
}

function renderLinkBlock(node: LinkBlockNode, prefix: string): string {
  const safeHref = sanitizeUrl(node.href);
  const desc = node.description
    ? `<p class="${cls("link-desc", prefix)}">${escapeHtml(node.description)}</p>`
    : "";
  return `<a href="${escapeHtml(safeHref)}" class="${cls("link-block", prefix)}"><span class="${cls("link-label", prefix)}">${escapeHtml(node.label)}</span>${desc}</a>`;
}

async function renderList(
  node: ListNode,
  options: HtmlRenderOptions,
  prefix: string,
  useInlineStyles: boolean
): Promise<string> {
  const tag = node.kind === "ordered" ? "ol" : "ul";
  const attrs: string[] = [`class="${cls("list", prefix)}"`];
  if (node.kind === "ordered" && node.start !== undefined) {
    attrs.push(`start="${node.start}"`);
  }

  const items = await Promise.all(
    node.children.map(async (item) => {
      const checkbox =
        item.checked !== undefined
          ? `<input type="checkbox" ${item.checked ? "checked" : ""} disabled /> `
          : "";
      const childHtml = (
        await Promise.all(
          item.children.map((b) => renderBlock(b, options, prefix, useInlineStyles))
        )
      ).join("\n");
      return `<li>${checkbox}${childHtml}</li>`;
    })
  );

  return `<${tag} ${attrs.join(" ")}>${items.join("\n")}</${tag}>`;
}

function renderTable(node: TableNode, prefix: string): string {
  const rows = node.children.map((row, ri) => {
    const cells = row.children.map((cell, ci) => {
      const tag = ri === 0 ? "th" : "td";
      const align = node.align?.[ci];
      const styleAttr = align ? ` style="text-align: ${align}"` : "";
      return `<${tag}${styleAttr}>${renderInlineChildren(cell.children)}</${tag}>`;
    });
    return `<tr>${cells.join("")}</tr>`;
  });

  return `<table class="${cls("table", prefix)}">${rows.join("\n")}</table>`;
}

function renderImage(node: ImageNode, prefix: string): string {
  const attrs: string[] = [`src="${escapeHtml(node.src)}"`, `class="${cls("image", prefix)}"`];
  if (node.alt) attrs.push(`alt="${escapeHtml(node.alt)}"`);
  if (node.title) attrs.push(`title="${escapeHtml(node.title)}"`);
  if (node.width) attrs.push(`width="${node.width}"`);
  if (node.height) attrs.push(`height="${node.height}"`);
  return `<img ${attrs.join(" ")} />`;
}

function renderDivider(prefix: string): string {
  return `<hr class="${cls("divider", prefix)}" />`;
}

async function renderTabGroup(
  node: TabGroupNode,
  options: HtmlRenderOptions,
  prefix: string,
  useInlineStyles: boolean
): Promise<string> {
  const tabs = node.children;

  const tabPanels = await Promise.all(
    tabs.map(async (tab, i) => {
      const content = (
        await Promise.all(tab.children.map((b) => renderBlock(b, options, prefix, useInlineStyles)))
      ).join("\n");
      const tabId = `${prefix}-tab-${i}`;
      return `<details>
  <summary class="${cls("tab-btn", prefix)}">${escapeHtml(tab.label)}</summary>
  <div class="${cls("tab-panel", prefix)}" id="${tabId}">${content}</div>
</details>`;
    })
  );

  return `<div class="${cls("tab-group", prefix)}">${tabPanels.join("\n")}</div>`;
}

function renderBadge(node: BadgeNode, prefix: string): string {
  const variantClass = node.variant ? ` ${cls("badge", prefix)}-${node.variant}` : "";
  return `<span class="${cls("badge", prefix)}${variantClass}">${escapeHtml(node.label)}</span>`;
}

async function renderBlockquote(
  node: BlockquoteNode,
  options: HtmlRenderOptions,
  prefix: string,
  useInlineStyles: boolean
): Promise<string> {
  const content = (
    await Promise.all(node.children.map((b) => renderBlock(b, options, prefix, useInlineStyles)))
  ).join("\n");
  return `<blockquote class="${cls("blockquote", prefix)}">${content}</blockquote>`;
}

// ─── Inline rendering ─────────────────────────────────────────────────

function renderInlineChildren(children: DocInline[]): string {
  return children.map(renderInline).join("");
}

function renderInline(node: DocInline): string {
  switch (node.type) {
    case "text":
      return escapeHtml(node.value);
    case "bold":
      return `<strong>${renderInlineChildren(node.children)}</strong>`;
    case "italic":
      return `<em>${renderInlineChildren(node.children)}</em>`;
    case "codeInline":
      return `<code>${escapeHtml(node.value)}</code>`;
    case "link":
      return renderLinkInline(node);
    default:
      return "";
  }
}

function renderLinkInline(node: LinkInlineNode): string {
  const safeHref = sanitizeUrl(node.href);
  return `<a href="${escapeHtml(safeHref)}">${renderInlineChildren(node.children)}</a>`;
}
