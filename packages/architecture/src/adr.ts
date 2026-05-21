import type { ArchitectureDecisionRecord, ArchitectureElement, Workspace } from "./types";

export type CreateAdrInput = Omit<ArchitectureDecisionRecord, "date"> & {
  readonly date?: string;
};

const STATUS_ORDER: readonly ArchitectureDecisionRecord["status"][] = [
  "proposed",
  "accepted",
  "deprecated",
  "superseded",
];

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function workspaceAdrs(workspace: Workspace): readonly ArchitectureDecisionRecord[] {
  return workspace.decisions ?? [];
}

function flattenElements(elements: readonly ArchitectureElement[]): ArchitectureElement[] {
  const result: ArchitectureElement[] = [];
  const stack = [...elements];
  while (stack.length > 0) {
    const element = stack.pop();
    if (!element) break;
    result.push(element);
    for (let i = element.children.length - 1; i >= 0; i--) {
      const child = element.children[i];
      if (child) stack.push(child);
    }
  }
  return result;
}

function findElement(workspace: Workspace, elementId: string): ArchitectureElement | undefined {
  return flattenElements(workspace.model.elements).find((element) => element.id === elementId);
}

function sortedAdrs(adrs: readonly ArchitectureDecisionRecord[]): ArchitectureDecisionRecord[] {
  return [...adrs].sort((left, right) => left.id.localeCompare(right.id));
}

export function createAdr(input: CreateAdrInput): ArchitectureDecisionRecord {
  return {
    id: input.id,
    title: input.title,
    date: input.date ?? todayIsoDate(),
    status: input.status,
    context: input.context,
    decision: input.decision,
    consequences: input.consequences,
    elementIds: [...input.elementIds],
    ...(input.relatedAdrs !== undefined ? { relatedAdrs: [...input.relatedAdrs] } : {}),
    ...(input.supersededBy !== undefined ? { supersededBy: input.supersededBy } : {}),
  };
}

export function linkAdrToElement(
  adr: ArchitectureDecisionRecord,
  elementId: string
): ArchitectureDecisionRecord {
  if (adr.elementIds.includes(elementId)) return adr;
  return { ...adr, elementIds: [...adr.elementIds, elementId] };
}

export function getElementAdrs(model: Workspace, elementId: string): ArchitectureDecisionRecord[] {
  const element = findElement(model, elementId);
  const elementDecisionIds = new Set(element?.decisions ?? []);
  return sortedAdrs(
    workspaceAdrs(model).filter(
      (adr) => adr.elementIds.includes(elementId) || elementDecisionIds.has(adr.id)
    )
  );
}

export function getAdrStatus(
  model: Workspace,
  adrId: string
): ArchitectureDecisionRecord | undefined {
  return workspaceAdrs(model).find((adr) => adr.id === adrId);
}

export function generateAdrReport(model: Workspace): string {
  const lines = [`# Architecture Decision Records`, ""];
  for (const status of STATUS_ORDER) {
    lines.push(`## ${status}`, "");
    const adrs = sortedAdrs(workspaceAdrs(model).filter((adr) => adr.status === status));
    if (adrs.length === 0) {
      lines.push("_No ADRs._", "");
      continue;
    }

    for (const adr of adrs) {
      lines.push(`### ${adr.id}: ${adr.title}`, "");
      lines.push(`- Date: ${adr.date}`);
      lines.push(`- Elements: ${adr.elementIds.length > 0 ? adr.elementIds.join(", ") : "None"}`);
      if (adr.relatedAdrs !== undefined && adr.relatedAdrs.length > 0) {
        lines.push(`- Related ADRs: ${adr.relatedAdrs.join(", ")}`);
      }
      if (adr.supersededBy !== undefined) {
        lines.push(`- Superseded by: ${adr.supersededBy}`);
      }
      lines.push("", `**Context:** ${adr.context}`, "");
      lines.push(`**Decision:** ${adr.decision}`, "");
      lines.push(`**Consequences:** ${adr.consequences}`, "");
    }
  }
  return lines.join("\n").trimEnd();
}

export function exportAdrJson(model: Workspace): string {
  return JSON.stringify(sortedAdrs(workspaceAdrs(model)), null, 2);
}
