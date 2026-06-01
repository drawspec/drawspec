import { defineDoc, md } from "../../../packages/docs/src/index.js";

export default defineDoc({
  title: "LSP",
  description: "Language server protocol support for DrawSpec diagram files in VS Code, Neovim, and other editors",
  content: await md`
# LSP

The \`@drawspec/lsp\` package provides language server protocol support for DrawSpec diagram files. It currently implements diagnostics and document symbols, giving editors like VS Code and Neovim the ability to surface validation errors and outline diagram structure.

## What is Implemented

The LSP server currently provides:

- **Diagnostics**: Validation errors and warnings appear in the editor Problems panel as you edit diagram files
- **Document Symbols**: The file outline and breadcrumbs show participants, messages, and other diagram elements

## What is Not Yet Implemented

The following features are planned but not yet available:

- **Completion**: Autocomplete for diagram DSL keywords and participant names
- **Hover**: Tooltip information when hovering over diagram elements
- **Go-to-definition**: Navigation from participant references to their declarations

This guide will be updated when these features become available.

## Editor Setup

### VS Code

Create or update \`.vscode/settings.json\` in your project to configure the file patterns the DrawSpec VS Code extension treats as diagram files:

\`\`\`json
{
  "drawspec.diagramFilePatterns": [
    "**/*.diagram.ts",
    "**/*.arch.ts",
    "**/*.sequence.ts"
  ]
}
\`\`\`

The DrawSpec extension for VS Code is available in the marketplace and will automatically activate when you open diagram files.

### Neovim

The \`@drawspec/lsp\` package is currently a library package and does not ship a standalone executable. Neovim users can still map diagram filenames to a \`drawspec\` filetype now, then wire that filetype to a project-specific Bun wrapper when one is available.

Add the DrawSpec filetype to your \`init.lua\` or equivalent with pattern mappings. Do not use \`extension\` mappings for \`*.diagram.ts\` or \`*.arch.ts\`, because the final extension segment is \`.ts\`:

\`\`\`lua
vim.filetype.add({
  pattern = {
    [".*%.diagram%.ts"] = "drawspec",
    [".*%.arch%.ts"] = "drawspec",
    [".*%.sequence%.ts"] = "drawspec",
  },
});
\`\`\`

## File Patterns

The LSP activates for files matching these patterns:

- \`*.diagram.ts\`
- \`*.arch.ts\`
- \`*.sequence.ts\`

## How It Works

The LSP server uses Bun to evaluate TypeScript source files. When you open or edit a diagram file, the server:

1. Reads the file content
2. Compiles it using the appropriate DrawSpec compiler
3. Runs validation using \`@drawspec/validation\`
4. Returns diagnostics for any errors or warnings

This means diagnostics reflect the same validation that \`drawspec check\` performs, ensuring consistency between your editor and CI.

## Requirements

The LSP implementation uses Bun APIs such as \`Bun.write\` and dynamic \`import()\`, so it must run under the Bun runtime. It does not spawn the \`bun\` executable from \`PATH\` itself.
`,
});
