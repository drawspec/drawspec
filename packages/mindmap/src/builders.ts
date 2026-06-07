import { createDeterministicId } from "@drawspec/core";
import type {
  MindmapChildrenBuilder,
  MindmapDomainModel,
  MindmapNode,
  MindmapNodeBuilder,
  MindmapNodeOptions,
  MindmapNodeShape,
} from "./types";

/** Internal mutable node representation during building. */
interface BuilderNode {
  id: string;
  text: string;
  shape: MindmapNodeShape | undefined;
  color: string | undefined;
  children: BuilderNode[];
}

/** Converts a builder node tree to an immutable MindmapNode tree. */
function toImmutable(node: BuilderNode): MindmapNode {
  return {
    id: node.id,
    text: node.text,
    ...(node.shape !== undefined ? { shape: node.shape } : {}),
    ...(node.color !== undefined ? { color: node.color } : {}),
    children: node.children.map(toImmutable),
  };
}

/**
 * Mutable builder context for adding child nodes to a parent.
 * `.node()` adds a child and returns a builder scoped to that child
 * for optional nesting via `.children()`. Subsequent calls from the
 * returned builder add siblings (same parent).
 */
class ChildrenBuilder implements MindmapChildrenBuilder {
  readonly #parent: BuilderNode;
  readonly #counter: { value: number };
  readonly #path: string;

  constructor(parent: BuilderNode, counter: { value: number }, path: string) {
    this.#parent = parent;
    this.#counter = counter;
    this.#path = path;
  }

  node(text: string, options?: MindmapNodeOptions): MindmapNodeBuilder {
    const index = this.#counter.value;
    this.#counter.value += 1;
    const child: BuilderNode = {
      id: createDeterministicId(
        { kind: "mindmap-node", text, index, path: this.#path },
        { prefix: "mm", length: 10 }
      ),
      text,
      shape: options?.shape,
      color: options?.color,
      children: [],
    };
    this.#parent.children.push(child);
    return new NodeBuilder(child, this.#parent, this.#counter, this.#path);
  }
}

/**
 * Builder scoped to a node. `.node()` adds a sibling (same parent),
 * `.children()` adds children to this node.
 */
class NodeBuilder implements MindmapNodeBuilder {
  readonly #node: BuilderNode;
  readonly #parent: BuilderNode;
  readonly #counter: { value: number };
  readonly #path: string;

  constructor(node: BuilderNode, parent: BuilderNode, counter: { value: number }, path: string) {
    this.#node = node;
    this.#parent = parent;
    this.#counter = counter;
    this.#path = path;
  }

  node(text: string, options?: MindmapNodeOptions): MindmapNodeBuilder {
    const index = this.#counter.value;
    this.#counter.value += 1;
    const sibling: BuilderNode = {
      id: createDeterministicId(
        { kind: "mindmap-node", text, index, path: this.#path },
        { prefix: "mm", length: 10 }
      ),
      text,
      shape: options?.shape,
      color: options?.color,
      children: [],
    };
    this.#parent.children.push(sibling);
    return new NodeBuilder(sibling, this.#parent, this.#counter, this.#path);
  }

  children(define: (ctx: MindmapChildrenBuilder) => void): MindmapNodeBuilder {
    define(new ChildrenBuilder(this.#node, this.#counter, `${this.#path}/${this.#node.text}`));
    return this;
  }
}

/**
 * Root builder for a mindmap diagram.
 * `.root()` defines the center node, then `.node()` adds top-level branches.
 */
export class MindmapBuilder {
  readonly #title: string;
  #root: BuilderNode | undefined;
  readonly #counter = { value: 0 };

  constructor(title: string) {
    this.#title = title;
  }

  root(text: string, options?: MindmapNodeOptions): MindmapNodeBuilder {
    const node: BuilderNode = {
      id: createDeterministicId(
        { kind: "mindmap-root", text, title: this.#title },
        { prefix: "mmr", length: 10 }
      ),
      text,
      shape: options?.shape,
      color: options?.color,
      children: [],
    };
    this.#root = node;
    // The root builder uses root as both node and "parent" for top-level branches
    return new NodeBuilder(node, node, this.#counter, text);
  }

  toModel(): MindmapDomainModel {
    if (this.#root === undefined) {
      throw new Error("Mindmap must have a root node. Call .root() before building.");
    }
    return {
      id: createDeterministicId(
        { kind: "mindmap-document", title: this.#title },
        { prefix: "mmdoc", length: 8 }
      ),
      title: this.#title,
      root: toImmutable(this.#root),
    };
  }
}
