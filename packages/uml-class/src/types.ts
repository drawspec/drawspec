import type { DiagramDocument } from "@drawspec/core";

export type ClassVisibility = "public" | "protected" | "private" | "package";

export interface ClassMemberOptions {
  visibility?: ClassVisibility;
  static?: boolean;
  abstract?: boolean;
}

export interface ClassFieldOptions extends ClassMemberOptions {
  readonly?: boolean;
}

export interface ClassMethodOptions extends ClassMemberOptions {
  returnType?: string;
  parameters?: readonly ClassMethodParameter[];
}

export interface ClassMethodParameter {
  readonly name: string;
  readonly type: string;
}

export interface ClassField {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly visibility?: ClassVisibility;
  readonly static?: boolean;
  readonly readonly?: boolean;
}

export interface ClassMethod {
  readonly id: string;
  readonly name: string;
  readonly visibility?: ClassVisibility;
  readonly static?: boolean;
  readonly abstract?: boolean;
  readonly returnType?: string;
  readonly parameters: readonly ClassMethodParameter[];
}

export interface ClassElement {
  readonly id: string;
  readonly kind: "class";
  readonly name: string;
  readonly fields: readonly ClassField[];
  readonly methods: readonly ClassMethod[];
  readonly extendsName?: string;
  readonly interfaceNames: readonly string[];
  readonly usedTypeNames: readonly string[];
  readonly abstract?: boolean;
}

export interface InterfaceElement {
  readonly id: string;
  readonly kind: "interface";
  readonly name: string;
  readonly methods: readonly ClassMethod[];
  readonly interfaceNames: readonly string[];
}

export interface EnumElement {
  readonly id: string;
  readonly kind: "enum";
  readonly name: string;
  readonly values: readonly string[];
}

export type ClassDiagramElement = ClassElement | InterfaceElement | EnumElement;

export interface ClassBuilder {
  field(name: string, type: string, options?: ClassFieldOptions): ClassBuilder;
  method(name: string, options?: ClassMethodOptions): ClassBuilder;
  extends(name: string): ClassBuilder;
  implements(name: string): ClassBuilder;
  uses(name: string): ClassBuilder;
  abstract(): ClassBuilder;
}

export interface InterfaceBuilder {
  method(name: string, options?: ClassMethodOptions): InterfaceBuilder;
  implements(name: string): InterfaceBuilder;
}

export interface EnumBuilder {
  value(name: string): EnumBuilder;
}

export interface ClassRelationship {
  readonly id: string;
  readonly kind: "implements" | "uses";
  readonly sourceName: string;
  readonly targetName: string;
}

export interface ClassDomainModel {
  readonly id: string;
  readonly title: string;
  readonly elements: readonly ClassDiagramElement[];
  readonly relationships: readonly ClassRelationship[];
}

export type ClassDiagramDocument = DiagramDocument & { kind: "class" };
