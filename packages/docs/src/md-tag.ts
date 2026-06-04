import type {
  BadgeVariant,
  BlockquoteNode,
  CalloutKind,
  CodeBlockNode,
  DocBlock,
  DocInline,
  HeadingLevel,
  HeadingNode,
  ImageNode,
  ListItemNode,
  ListNode,
  ParagraphNode,
  TableCellNode,
  TableNode,
  TableRowNode,
  ThematicBreakNode,
} from "./types";

// ─── Remark types (subset of mdast) ───────────────────────────────────

interface RemarkRoot {
  type: "root";
  children: RemarkNode[];
}

type RemarkNode =
  | RemarkHeading
  | RemarkParagraph
  | RemarkCode
  | RemarkBlockquote
  | RemarkList
  | RemarkListItem
  | RemarkTable
  | RemarkTableRow
  | RemarkTableCell
  | RemarkThematicBreak
  | RemarkImage
  | RemarkHtml
  | RemarkText
  | RemarkStrong
  | RemarkEmphasis
  | RemarkInlineCode
  | RemarkLink
  | { type: string; children?: RemarkNode[]; value?: string; [key: string]: unknown };

interface RemarkHeading {
  type: "heading";
  depth: number;
  children: RemarkPhrasing[];
}

interface RemarkParagraph {
  type: "paragraph";
  children: RemarkPhrasing[];
}

interface RemarkCode {
  type: "code";
  lang?: string | null;
  meta?: string | null;
  value: string;
}

interface RemarkBlockquote {
  type: "blockquote";
  children: RemarkBlock[];
}

interface RemarkList {
  type: "list";
  ordered?: boolean;
  start?: number | null;
  spread?: boolean;
  children: RemarkListItem[];
}

interface RemarkListItem {
  type: "listItem";
  checked?: boolean | null;
  children: RemarkBlock[];
}

interface RemarkTable {
  type: "table";
  align?: Array<"left" | "center" | "right" | null> | null;
  children: RemarkTableRow[];
}

interface RemarkTableRow {
  type: "tableRow";
  children: RemarkTableCell[];
}

interface RemarkTableCell {
  type: "tableCell";
  children: RemarkPhrasing[];
}

interface RemarkThematicBreak {
  type: "thematicBreak";
}

interface RemarkImage {
  type: "image";
  url: string;
  alt?: string | null;
  title?: string | null;
}

interface RemarkHtml {
  type: "html";
  value: string;
}

interface RemarkText {
  type: "text";
  value: string;
}

interface RemarkStrong {
  type: "strong";
  children: RemarkPhrasing[];
}

interface RemarkEmphasis {
  type: "emphasis";
  children: RemarkPhrasing[];
}

interface RemarkInlineCode {
  type: "inlineCode";
  value: string;
}

interface RemarkLink {
  type: "link";
  url: string;
  title?: string | null;
  children: RemarkPhrasing[];
}

type RemarkPhrasing = RemarkText | RemarkStrong | RemarkEmphasis | RemarkInlineCode | RemarkLink;
type RemarkBlock =
  | RemarkHeading
  | RemarkParagraph
  | RemarkCode
  | RemarkBlockquote
  | RemarkList
  | RemarkTable
  | RemarkThematicBreak
  | RemarkImage
  | RemarkHtml;

// ─── Special directive patterns ───────────────────────────────────────

const DIAGRAM_RE = /^@diagram\s+(\S+)(?:\s+"([^"]*)")?\s*$/;
const SOURCE_RE = /^@source\s+(\S+)\s+(\S+)\s*$/;
const BADGE_RE = /^@badge\s+(.+?)(?:\s+(default|primary|success|warning|danger|info))?\s*$/;
const TAB_GROUP_START_RE = /^@tab-group\s*$|^<tab-group>\s*$/;
const TAB_GROUP_END_RE = /^<\/tab-group>\s*$/;
const TAB_ITEM_RE = /^@tab\s+"([^"]+)"\s*$|^<tab\s+label="([^"]+)">\s*$/;
const CALLOUT_RE = /^@callout\s+(note|tip|warning|important|caution)(?:\s+"([^"]*)")?\s*$/;
const CALLOUT_END_RE = /^@endcallout\s*$|^<\/callout>\s*$/;

// ─── md tagged template ───────────────────────────────────────────────

/**
 * Tagged template literal that parses markdown into Doc IR nodes.
 */
export async function md(strings: TemplateStringsArray, ...values: unknown[]): Promise<DocBlock[]> {
  await initMdParser();
  const raw = strings.reduce(
    (acc, str, i) => acc + str + (i < values.length ? String(values[i]) : ""),
    ""
  );

  const root = parseMarkdown(raw);
  return convertRoot(root);
}

// ─── Markdown parsing ─────────────────────────────────────────────────

let parser: ((markdown: string) => RemarkRoot) | null = null;
let parserInit: Promise<void> | null = null;

function ensureParser(): Promise<void> {
  if (parser) return Promise.resolve();
  if (!parserInit) {
    parserInit = (async () => {
      const { unified } = await import("unified");
      const remarkParseMod = await import("remark-parse");
      const remarkGfmMod = await import("remark-gfm");
      const remarkParse = (remarkParseMod as { default: unknown }).default as never;
      const remarkGfm = (remarkGfmMod as { default: unknown }).default as never;
      const processor = unified().use(remarkParse).use(remarkGfm);
      parser = (md: string) => processor.parse(md) as unknown as RemarkRoot;
    })();
  }
  return parserInit;
}

export async function initMdParser(): Promise<void> {
  await ensureParser();
}

function parseMarkdown(markdown: string): RemarkRoot {
  if (!parser) {
    throw new Error("Parser not initialized. Call initMdParser() first.");
  }
  return parser(markdown);
}

// ─── AST conversion ───────────────────────────────────────────────────

function convertRoot(root: RemarkRoot): DocBlock[] {
  return convertBlocks(root.children);
}

function convertBlocks(nodes: RemarkNode[]): DocBlock[] {
  const result: DocBlock[] = [];

  let i = 0;
  while (i < nodes.length) {
    const node: RemarkNode | undefined = nodes[i];
    if (!node) {
      i++;
      continue;
    }

    const line = extractDirectiveText(node);

    if (line) {
      const diagramMatch = DIAGRAM_RE.exec(line);
      if (diagramMatch) {
        const block: DocBlock = {
          type: "diagram",
          ref: diagramMatch[1] ?? "",
        };
        if (diagramMatch[2]) {
          (block as { caption?: string }).caption = diagramMatch[2];
        }
        result.push(block);
        i++;
        continue;
      }

      const sourceMatch = SOURCE_RE.exec(line);
      if (sourceMatch && sourceMatch[1] && sourceMatch[2]) {
        result.push({
          type: "codeBlock",
          lang: sourceMatch[1],
          source: sourceMatch[2],
          value: "",
        });
        i++;
        continue;
      }

      const badgeMatch = BADGE_RE.exec(line);
      if (badgeMatch) {
        const variant = badgeMatch[2] as BadgeVariant | undefined;
        const block: DocBlock = {
          type: "badge",
          label: badgeMatch[1] ?? "",
        };
        if (variant) {
          (block as { variant?: BadgeVariant }).variant = variant;
        }
        result.push(block);
        i++;
        continue;
      }

      const calloutMatch = CALLOUT_RE.exec(line);
      if (calloutMatch) {
        const kind = calloutMatch[1] as CalloutKind;
        const title = calloutMatch[2] || undefined;
        const calloutChildren: RemarkNode[] = [];
        i++;
        while (i < nodes.length) {
          const inner = nodes[i];
          if (!inner) break;
          const innerLine = extractDirectiveText(inner);
          if (innerLine && CALLOUT_END_RE.test(innerLine)) {
            i++;
            break;
          }
          calloutChildren.push(inner);
          i++;
        }
        const convertedBlocks = convertBlocks(calloutChildren);
        const inlineChildren = blocksToInline(convertedBlocks);
        const block: DocBlock = {
          type: "callout",
          kind,
          children: inlineChildren,
        };
        if (title) {
          (block as { title?: string }).title = title;
        }
        result.push(block);
        continue;
      }

      if (TAB_GROUP_START_RE.test(line)) {
        const tabs: { label: string; children: RemarkNode[] }[] = [];
        i++;
        let currentTab: { label: string; children: RemarkNode[] } | null = null;
        while (i < nodes.length) {
          const inner = nodes[i];
          if (!inner) break;
          const innerLine = extractDirectiveText(inner);
          if (innerLine && TAB_GROUP_END_RE.test(innerLine)) {
            if (currentTab) {
              tabs.push(currentTab);
            }
            i++;
            break;
          }
          if (innerLine) {
            const tabMatch = TAB_ITEM_RE.exec(innerLine);
            if (tabMatch) {
              if (currentTab) {
                tabs.push(currentTab);
              }
              currentTab = { label: tabMatch[1] || tabMatch[2] || "", children: [] };
              i++;
              continue;
            }
          }
          if (currentTab) {
            currentTab.children.push(inner);
          }
          i++;
        }
        result.push({
          type: "tabGroup",
          children: tabs.map((tab) => ({
            type: "tabItem",
            label: tab.label,
            children: convertBlocks(tab.children),
          })),
        });
        continue;
      }
    }

    const converted = convertBlock(node);
    if (converted !== null) {
      result.push(converted);
    }
    i++;
  }

  return result;
}

function extractDirectiveText(node: RemarkNode): string | null {
  if (node.type === "html" && "value" in node && typeof node.value === "string") {
    return node.value.trim();
  }
  if (
    node.type === "paragraph" &&
    "children" in node &&
    Array.isArray(node.children) &&
    node.children.length >= 1 &&
    node.children[0] &&
    node.children[0].type === "text" &&
    typeof node.children[0].value === "string"
  ) {
    const firstLine = node.children[0].value.split("\n")[0]?.trim() ?? "";
    if (firstLine.startsWith("@")) {
      return firstLine;
    }
  }
  return null;
}

function convertBlock(node: RemarkNode): DocBlock | null {
  switch (node.type) {
    case "heading":
      return convertHeading(node as RemarkHeading);
    case "paragraph":
      return convertParagraph(node as RemarkParagraph);
    case "code":
      return convertCode(node as RemarkCode);
    case "blockquote":
      return convertBlockquote(node as RemarkBlockquote);
    case "list":
      return convertList(node as RemarkList);
    case "table":
      return convertTable(node as RemarkTable);
    case "thematicBreak":
      return { type: "thematicBreak" } satisfies ThematicBreakNode;
    case "image":
      return convertImage(node as RemarkImage);
    case "html":
      return null;
    default:
      return null;
  }
}

function convertParagraph(node: RemarkParagraph): ParagraphNode | ImageNode {
  const firstChild = node.children[0];
  if (
    node.children.length === 1 &&
    firstChild &&
    (firstChild as { type: string }).type === "image"
  ) {
    return convertImage(firstChild as unknown as RemarkImage);
  }
  return {
    type: "paragraph",
    children: convertPhrasings(node.children),
  };
}

function convertHeading(node: RemarkHeading): HeadingNode {
  return {
    type: "heading",
    level: node.depth as HeadingLevel,
    children: convertPhrasings(node.children),
  };
}

function convertCode(node: RemarkCode): CodeBlockNode {
  const result: CodeBlockNode = {
    type: "codeBlock",
    value: node.value,
  };
  if (node.lang) {
    result.lang = node.lang;
  }
  if (node.meta) {
    result.meta = node.meta;
  }
  return result;
}

function convertBlockquote(node: RemarkBlockquote): BlockquoteNode {
  return {
    type: "blockquote",
    children: convertBlocks(node.children as RemarkNode[]),
  };
}

function convertList(node: RemarkList): ListNode {
  const result: ListNode = {
    type: "list",
    kind: node.ordered ? "ordered" : "unordered",
    children: node.children.map((item): ListItemNode => {
      const li: ListItemNode = {
        type: "listItem",
        children: convertBlocks(item.children as RemarkNode[]),
      };
      if (item.checked !== undefined && item.checked !== null) {
        li.checked = item.checked;
      }
      return li;
    }),
  };
  if (node.ordered && node.start != null) {
    result.start = node.start;
  }
  if (node.spread !== undefined) {
    result.spread = node.spread;
  }
  return result;
}

function convertTable(node: RemarkTable): TableNode {
  const result: TableNode = {
    type: "table",
    children: node.children.map(
      (row): TableRowNode => ({
        type: "tableRow",
        children: row.children.map(
          (cell): TableCellNode => ({
            type: "tableCell",
            children: convertPhrasings(cell.children as RemarkPhrasing[]),
          })
        ),
      })
    ),
  };
  if (node.align) {
    result.align = node.align;
  }
  return result;
}

function convertImage(node: RemarkImage): ImageNode {
  const result: ImageNode = {
    type: "image",
    src: node.url,
  };
  if (node.alt) {
    result.alt = node.alt;
  }
  if (node.title) {
    result.title = node.title;
  }
  return result;
}

// ─── Inline conversion ────────────────────────────────────────────────

function convertPhrasings(nodes: RemarkPhrasing[]): DocInline[] {
  const result: DocInline[] = [];
  for (const node of nodes) {
    result.push(...convertPhrasing(node));
  }
  return result;
}

function convertPhrasing(node: RemarkPhrasing): DocInline[] {
  switch (node.type) {
    case "text":
      return splitTextOnNewlines(node.value);
    case "strong":
      return [{ type: "bold", children: convertPhrasings(node.children) }];
    case "emphasis":
      return [{ type: "italic", children: convertPhrasings(node.children) }];
    case "inlineCode":
      return [{ type: "codeInline", value: node.value }];
    case "link":
      return [
        {
          type: "link",
          href: node.url,
          children: convertPhrasings(node.children),
        },
      ];
    default:
      return [];
  }
}

function splitTextOnNewlines(value: string): DocInline[] {
  if (!value.includes("\n")) {
    return [{ type: "text", value }];
  }
  const parts = value.split("\n");
  const result: DocInline[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part) {
      result.push({ type: "text", value: part });
    }
    if (i < parts.length - 1) {
      result.push({ type: "text", value: "\n" });
    }
  }
  return result;
}

function blocksToInline(blocks: DocBlock[]): DocInline[] {
  const result: DocInline[] = [];
  for (const block of blocks) {
    if (block.type === "paragraph") {
      result.push(...block.children);
    } else if (block.type === "heading") {
      result.push(...block.children);
    }
  }
  return result;
}
