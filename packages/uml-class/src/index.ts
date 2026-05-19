import { createDeterministicId } from "@drawspec/core";
import { class_ } from "./class";
import { compileClassDocument } from "./compile";
import { enum_ } from "./enum";
import { interface_ } from "./interface";
import type {
  ClassDiagramDocument,
  ClassDiagramElement,
  ClassDomainModel,
  ClassRelationship,
} from "./types";

export { class_, MutableClassBuilder } from "./class";
export { compile, compileClassDocument } from "./compile";
export { enum_, MutableEnumBuilder } from "./enum";
export { interface_, MutableInterfaceBuilder } from "./interface";
export type {
  ClassBuilder,
  ClassDiagramDocument,
  ClassDiagramElement,
  ClassDomainModel,
  ClassElement,
  ClassField,
  ClassFieldOptions,
  ClassMemberOptions,
  ClassMethod,
  ClassMethodOptions,
  ClassMethodParameter,
  ClassRelationship,
  ClassVisibility,
  EnumBuilder,
  EnumElement,
  InterfaceBuilder,
  InterfaceElement,
} from "./types";

function relationship(
  kind: ClassRelationship["kind"],
  sourceName: string,
  targetName: string
): ClassRelationship {
  return {
    id: createDeterministicId(["class-relationship-builder", kind, sourceName, targetName], {
      prefix: "rel",
      length: 8,
    }),
    kind,
    sourceName,
    targetName,
  };
}

export function implementsRelationship(sourceName: string, targetName: string): ClassRelationship {
  return relationship("implements", sourceName, targetName);
}

export function uses(sourceName: string, targetName: string): ClassRelationship {
  return relationship("uses", sourceName, targetName);
}

export { implementsRelationship as implements };

export interface ClassDiagramBuilderApi {
  class_: typeof class_;
  interface_: typeof interface_;
  enum_: typeof enum_;
  implements: typeof implementsRelationship;
  uses: typeof uses;
}

export function classDiagram(
  title: string,
  callback: (api: ClassDiagramBuilderApi) => readonly (ClassDiagramElement | ClassRelationship)[]
): ClassDiagramDocument {
  const entries = callback({ class_, interface_, enum_, implements: implementsRelationship, uses });
  const elements = entries.filter((entry): entry is ClassDiagramElement => "name" in entry);
  const relationships = entries.filter(
    (entry): entry is ClassRelationship => "sourceName" in entry
  );
  const model: ClassDomainModel = {
    id: createDeterministicId(["class-document", title], { prefix: "classdoc", length: 8 }),
    title,
    elements,
    relationships,
  };
  return compileClassDocument(model);
}
