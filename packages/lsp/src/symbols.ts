import type { DiagramDocument } from "@drawspec/core";
import type { DocumentSymbol, Range } from "vscode-languageserver/node";

const SYMBOL_KIND_NAMESPACE = 3;
const SYMBOL_KIND_CLASS = 5;
const SYMBOL_KIND_FIELD = 8;
const SYMBOL_KIND_INTERFACE = 11;
const SYMBOL_KIND_VARIABLE = 13;

const DEFAULT_RANGE: Range = {
  start: { line: 0, character: 0 },
  end: { line: 0, character: 1 },
};

function sourceRange(source: { line: number; column: number } | undefined): Range {
  if (source === undefined) {
    return DEFAULT_RANGE;
  }
  const line = Math.max(0, source.line - 1);
  const char = Math.max(0, source.column - 1);
  return {
    start: { line, character: char },
    end: { line, character: char + 1 },
  };
}

export function extractDocumentSymbols(document: DiagramDocument): DocumentSymbol[] {
  const symbols: DocumentSymbol[] = [];

  if (document.title !== undefined) {
    symbols.push({
      name: document.title,
      kind: SYMBOL_KIND_NAMESPACE,
      range: DEFAULT_RANGE,
      selectionRange: DEFAULT_RANGE,
      children: [],
    });
  }

  for (const node of document.nodes) {
    const range = sourceRange(node.source);
    symbols.push({
      name: node.label ?? node.id,
      kind: SYMBOL_KIND_CLASS,
      range,
      selectionRange: range,
    });
  }

  for (const group of document.groups) {
    const groupChildren: DocumentSymbol[] = [];
    if (group.childIds !== undefined) {
      for (const childId of group.childIds) {
        const childNode = document.nodes.find((n) => n.id === childId);
        const childRange = childNode !== undefined ? sourceRange(childNode.source) : DEFAULT_RANGE;
        groupChildren.push({
          name: childNode?.label ?? childId,
          kind: SYMBOL_KIND_FIELD,
          range: childRange,
          selectionRange: childRange,
        });
      }
    }
    const groupRange = sourceRange(group.source);
    const groupSymbol: DocumentSymbol = {
      name: group.label ?? group.id,
      kind: SYMBOL_KIND_NAMESPACE,
      range: groupRange,
      selectionRange: groupRange,
    };
    if (groupChildren.length > 0) {
      groupSymbol.children = groupChildren;
    }
    symbols.push(groupSymbol);
  }

  for (const edge of document.edges) {
    const range = sourceRange(edge.source);
    symbols.push({
      name: edge.label ?? `${edge.sourceId} → ${edge.targetId}`,
      kind: SYMBOL_KIND_INTERFACE,
      range,
      selectionRange: range,
    });
  }

  for (const annotation of document.annotations) {
    const range = sourceRange(annotation.source);
    symbols.push({
      name: annotation.label ?? annotation.id,
      kind: SYMBOL_KIND_VARIABLE,
      range,
      selectionRange: range,
    });
  }

  return symbols;
}
