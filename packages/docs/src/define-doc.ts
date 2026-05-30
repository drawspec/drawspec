import type {
  BadgeNode,
  BadgeVariant,
  CalloutKind,
  CalloutNode,
  CodeBlockNode,
  DiagramNode,
  DocBlock,
  DocDefinition,
  DocDocument,
  DocInline,
  HeadingLevel,
  HeadingNode,
  ImageNode,
  LinkBlockNode,
  ListItemNode,
  ListKind,
  ListNode,
  TableNode,
} from "./types";

const SCHEMA_VERSION = "0.1.0";

// ─── Validation helpers ───────────────────────────────────────────────

function assertString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string") {
    throw new TypeError(`defineDoc: ${field} must be a string, got ${typeof value}`);
  }
}

function assertOptionalString(value: unknown, field: string): asserts value is string | undefined {
  if (value !== undefined && typeof value !== "string") {
    throw new TypeError(`defineDoc: ${field} must be a string or undefined`);
  }
}

function assertArray(value: unknown, field: string): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`defineDoc: ${field} must be an array, got ${typeof value}`);
  }
}

// Use a map type that allows safe property access without index signature errors
type ObjMap = { [key: string]: unknown };

function isObject(value: unknown): value is ObjMap {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ─── Node validation ──────────────────────────────────────────────────

function validateInline(node: unknown, path: string): DocInline {
  if (!isObject(node)) {
    throw new TypeError(`defineDoc: ${path} must be an object`);
  }
  const n = node;

  switch (n["type"]) {
    case "text": {
      assertString(n["value"], `${path}.value`);
      return { type: "text", value: n["value"] };
    }

    case "bold": {
      assertArray(n["children"], `${path}.children`);
      return {
        type: "bold",
        children: (n["children"] as unknown[]).map((c, i) =>
          validateInline(c, `${path}.children[${i}]`)
        ),
      };
    }

    case "italic": {
      assertArray(n["children"], `${path}.children`);
      return {
        type: "italic",
        children: (n["children"] as unknown[]).map((c, i) =>
          validateInline(c, `${path}.children[${i}]`)
        ),
      };
    }

    case "codeInline": {
      assertString(n["value"], `${path}.value`);
      return { type: "codeInline", value: n["value"] };
    }

    case "link": {
      assertString(n["href"], `${path}.href`);
      assertArray(n["children"], `${path}.children`);
      return {
        type: "link",
        href: n["href"] as string,
        children: (n["children"] as unknown[]).map((c, i) =>
          validateInline(c, `${path}.children[${i}]`)
        ),
      };
    }

    default:
      throw new TypeError(`defineDoc: ${path} has unknown inline type "${String(n["type"])}"`);
  }
}

function validateInlineArray(nodes: unknown[], path: string): DocInline[] {
  return nodes.map((n, i) => validateInline(n, `${path}[${i}]`));
}

function validateBlock(node: unknown, path: string): DocBlock {
  if (!isObject(node)) {
    throw new TypeError(`defineDoc: ${path} must be an object with a "type" field`);
  }
  const n = node;

  if (typeof n["type"] !== "string") {
    throw new TypeError(`defineDoc: ${path}.type must be a string`);
  }

  switch (n["type"] as string) {
    case "heading": {
      const level = n["level"] as number;
      if (!Number.isInteger(level) || level < 1 || level > 6) {
        throw new TypeError(`defineDoc: ${path}.level must be 1-6, got ${level}`);
      }
      assertArray(n["children"], `${path}.children`);
      const result: HeadingNode = {
        type: "heading",
        level: level as HeadingLevel,
        children: validateInlineArray(n["children"] as unknown[], `${path}.children`),
      };
      if (n["id"] !== undefined) {
        assertString(n["id"], `${path}.id`);
        result.id = n["id"];
      }
      return result;
    }

    case "paragraph": {
      assertArray(n["children"], `${path}.children`);
      return {
        type: "paragraph",
        children: validateInlineArray(n["children"] as unknown[], `${path}.children`),
      };
    }

    case "codeBlock": {
      assertString(n["value"], `${path}.value`);
      const result: CodeBlockNode = {
        type: "codeBlock",
        value: n["value"] as string,
      };
      if (n["lang"] !== undefined) {
        assertString(n["lang"], `${path}.lang`);
        result.lang = n["lang"];
      }
      if (n["source"] !== undefined) {
        assertString(n["source"], `${path}.source`);
        result.source = n["source"];
      }
      if (n["meta"] !== undefined) {
        assertString(n["meta"], `${path}.meta`);
        result.meta = n["meta"];
      }
      return result;
    }

    case "diagram": {
      assertString(n["ref"], `${path}.ref`);
      const result: DiagramNode = {
        type: "diagram",
        ref: n["ref"] as string,
      };
      if (n["caption"] !== undefined) {
        assertString(n["caption"], `${path}.caption`);
        result.caption = n["caption"];
      }
      return result;
    }

    case "callout": {
      const validKinds: CalloutKind[] = ["note", "tip", "warning", "important", "caution"];
      const kind = n["kind"] as string;
      if (!validKinds.includes(kind as CalloutKind)) {
        throw new TypeError(
          `defineDoc: ${path}.kind must be one of ${validKinds.join(", ")}, got "${kind}"`
        );
      }
      assertArray(n["children"], `${path}.children`);
      const result: CalloutNode = {
        type: "callout",
        kind: kind as CalloutKind,
        children: validateInlineArray(n["children"] as unknown[], `${path}.children`),
      };
      if (n["title"] !== undefined) {
        assertString(n["title"], `${path}.title`);
        result.title = n["title"];
      }
      return result;
    }

    case "linkBlock": {
      assertString(n["href"], `${path}.href`);
      assertString(n["label"], `${path}.label`);
      const result: LinkBlockNode = {
        type: "linkBlock",
        href: n["href"] as string,
        label: n["label"] as string,
      };
      if (n["description"] !== undefined) {
        assertString(n["description"], `${path}.description`);
        result.description = n["description"];
      }
      return result;
    }

    case "list": {
      const validKinds: ListKind[] = ["ordered", "unordered"];
      const kind = n["kind"] as string;
      if (!validKinds.includes(kind as ListKind)) {
        throw new TypeError(
          `defineDoc: ${path}.kind must be "ordered" or "unordered", got "${kind}"`
        );
      }
      assertArray(n["children"], `${path}.children`);
      const result: ListNode = {
        type: "list",
        kind: kind as ListKind,
        children: (n["children"] as unknown[]).map((rawItem, i) => {
          if (!isObject(rawItem)) {
            throw new TypeError(`defineDoc: ${path}.children[${i}] must be an object`);
          }
          const item = rawItem;
          if (item["type"] !== "listItem") {
            throw new TypeError(
              `defineDoc: ${path}.children[${i}].type must be "listItem", got "${String(item["type"])}"`
            );
          }
          assertArray(item["children"], `${path}.children[${i}].children`);
          const li: ListItemNode = {
            type: "listItem",
            children: (item["children"] as unknown[]).map((b, j) =>
              validateBlock(b, `${path}.children[${i}].children[${j}]`)
            ),
          };
          if (item["checked"] !== undefined) {
            if (typeof item["checked"] !== "boolean") {
              throw new TypeError(`defineDoc: ${path}.children[${i}].checked must be a boolean`);
            }
            li.checked = item["checked"];
          }
          return li;
        }),
      };
      if (n["start"] !== undefined) {
        if (typeof n["start"] !== "number") {
          throw new TypeError(`defineDoc: ${path}.start must be a number`);
        }
        result.start = n["start"];
      }
      if (n["spread"] !== undefined) {
        if (typeof n["spread"] !== "boolean") {
          throw new TypeError(`defineDoc: ${path}.spread must be a boolean`);
        }
        result.spread = n["spread"];
      }
      return result;
    }

    case "table": {
      assertArray(n["children"], `${path}.children`);
      const result: TableNode = {
        type: "table",
        children: (n["children"] as unknown[]).map((rawRow, ri) => {
          if (!isObject(rawRow)) {
            throw new TypeError(`defineDoc: ${path}.children[${ri}] must be an object`);
          }
          const row = rawRow;
          if (row["type"] !== "tableRow") {
            throw new TypeError(`defineDoc: ${path}.children[${ri}].type must be "tableRow"`);
          }
          assertArray(row["children"], `${path}.children[${ri}].children`);
          return {
            type: "tableRow",
            children: (row["children"] as unknown[]).map((rawCell, ci) => {
              if (!isObject(rawCell)) {
                throw new TypeError(
                  `defineDoc: ${path}.children[${ri}].children[${ci}] must be an object`
                );
              }
              const cell = rawCell;
              if (cell["type"] !== "tableCell") {
                throw new TypeError(
                  `defineDoc: ${path}.children[${ri}].children[${ci}].type must be "tableCell"`
                );
              }
              assertArray(cell["children"], `${path}.children[${ri}].children[${ci}].children`);
              return {
                type: "tableCell",
                children: validateInlineArray(
                  cell["children"] as unknown[],
                  `${path}.children[${ri}].children[${ci}].children`
                ),
              };
            }),
          };
        }),
      };
      if (n["align"] !== undefined) {
        if (!Array.isArray(n["align"])) {
          throw new TypeError(`defineDoc: ${path}.align must be an array`);
        }
        result.align = (n["align"] as unknown[]).map((a, i) => {
          if (a !== null && a !== "left" && a !== "center" && a !== "right") {
            throw new TypeError(
              `defineDoc: ${path}.align[${i}] must be "left", "center", "right", or null`
            );
          }
          return a as "left" | "center" | "right" | null;
        });
      }
      return result;
    }

    case "image": {
      assertString(n["src"], `${path}.src`);
      const result: ImageNode = { type: "image", src: n["src"] as string };
      if (n["alt"] !== undefined) {
        assertString(n["alt"], `${path}.alt`);
        result.alt = n["alt"];
      }
      if (n["title"] !== undefined) {
        assertString(n["title"], `${path}.title`);
        result.title = n["title"];
      }
      if (n["width"] !== undefined) {
        if (typeof n["width"] !== "number") {
          throw new TypeError(`defineDoc: ${path}.width must be a number`);
        }
        result.width = n["width"];
      }
      if (n["height"] !== undefined) {
        if (typeof n["height"] !== "number") {
          throw new TypeError(`defineDoc: ${path}.height must be a number`);
        }
        result.height = n["height"];
      }
      return result;
    }

    case "divider":
      return { type: "divider" };

    case "thematicBreak":
      return { type: "thematicBreak" };

    case "tabGroup": {
      assertArray(n["children"], `${path}.children`);
      return {
        type: "tabGroup",
        children: (n["children"] as unknown[]).map((rawTab, i) => {
          if (!isObject(rawTab)) {
            throw new TypeError(`defineDoc: ${path}.children[${i}] must be an object`);
          }
          const tab = rawTab;
          if (tab["type"] !== "tabItem") {
            throw new TypeError(`defineDoc: ${path}.children[${i}].type must be "tabItem"`);
          }
          assertString(tab["label"], `${path}.children[${i}].label`);
          assertArray(tab["children"], `${path}.children[${i}].children`);
          return {
            type: "tabItem",
            label: tab["label"] as string,
            children: (tab["children"] as unknown[]).map((b, j) =>
              validateBlock(b, `${path}.children[${i}].children[${j}]`)
            ),
          };
        }),
      };
    }

    case "badge": {
      assertString(n["label"], `${path}.label`);
      const validVariants: BadgeVariant[] = [
        "default",
        "primary",
        "success",
        "warning",
        "danger",
        "info",
      ];
      const result: BadgeNode = { type: "badge", label: n["label"] as string };
      if (n["variant"] !== undefined) {
        if (!validVariants.includes(n["variant"] as BadgeVariant)) {
          throw new TypeError(
            `defineDoc: ${path}.variant must be one of ${validVariants.join(", ")}`
          );
        }
        result.variant = n["variant"] as BadgeVariant;
      }
      return result;
    }

    case "blockquote": {
      assertArray(n["children"], `${path}.children`);
      return {
        type: "blockquote",
        children: (n["children"] as unknown[]).map((b, i) =>
          validateBlock(b, `${path}.children[${i}]`)
        ),
      };
    }

    default:
      throw new TypeError(`defineDoc: ${path} has unknown block type "${String(n["type"])}"`);
  }
}

function validateContent(content: unknown[], path: string): DocBlock[] {
  return content.map((node, i) => validateBlock(node, `${path}[${i}]`));
}

// ─── defineDoc() ──────────────────────────────────────────────────────

/**
 * Define a document with structured JSON content.
 * Validates all nodes and returns a typed DocDocument.
 */
export function defineDoc(options: DocDefinition): DocDocument {
  if (!isObject(options)) {
    throw new TypeError("defineDoc: options must be an object");
  }

  assertString(options["title"], "title");
  assertOptionalString(options["description"], "description");

  let content: DocBlock[];

  if (typeof options["content"] === "string") {
    throw new TypeError(
      "defineDoc: content is a string — use md`...` tagged template or pass an array of DocBlock nodes"
    );
  }

  if (Array.isArray(options["content"])) {
    content = validateContent(options["content"] as unknown[], "content");
  } else {
    throw new TypeError(
      "defineDoc: content must be an array of DocBlock nodes or use md`...` tagged template"
    );
  }

  const doc: DocDocument = {
    schemaVersion: SCHEMA_VERSION,
    title: options["title"] as string,
    content,
  };

  if (options["description"] !== undefined) {
    doc.description = options["description"];
  }

  if (options["metadata"] !== undefined) {
    if (!isObject(options["metadata"])) {
      throw new TypeError("defineDoc: metadata must be an object");
    }
    doc.metadata = options["metadata"] as Record<string, unknown>;
  }

  return doc;
}
