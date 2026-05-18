interface SymbolScope {
  name: string;
  symbols: Map<string, string>;
}

export class SymbolRegistry {
  private readonly scopes: SymbolScope[] = [{ name: "", symbols: new Map() }];

  register(name: string, id: string): void {
    this.activeScope().symbols.set(name, id);
  }

  resolve(name: string): string | undefined {
    for (let index = this.scopes.length - 1; index >= 0; index -= 1) {
      const id = this.scopes[index]?.symbols.get(name);

      if (id !== undefined) {
        return id;
      }
    }

    return undefined;
  }

  enterScope(name: string): void {
    this.scopes.push({ name, symbols: new Map() });
  }

  exitScope(): void {
    if (this.scopes.length === 1) {
      throw new Error("Cannot exit the root symbol scope.");
    }

    this.scopes.pop();
  }

  currentScope(): string {
    const path = this.scopes.map((scope) => scope.name).filter((name) => name.length > 0);
    return path.length === 0 ? "/" : `/${path.join("/")}`;
  }

  has(name: string): boolean {
    return this.resolve(name) !== undefined;
  }

  private activeScope(): SymbolScope {
    const scope = this.scopes.at(-1);

    if (scope === undefined) {
      throw new Error("Symbol registry has no active scope.");
    }

    return scope;
  }
}
