/**
 * Svelte action that enhances `.ds-code-block` elements from the docs engine HTML:
 * - Wraps the existing `.ds-code-lang` + `<pre>` in a structured layout
 * - Adds a copy-to-clipboard button
 * - Overrides shiki's hardcoded background with theme CSS variable
 */
export function enhanceCodeBlocks(node: HTMLElement): { destroy: () => void } {
  const blocks = node.querySelectorAll(".ds-code-block");

  blocks.forEach((block) => {
    const langSpan = block.querySelector(".ds-code-lang");
    const pre = block.querySelector("pre");
    if (!pre) return;

    const lang = langSpan?.textContent ?? "text";

    // Create header
    const header = document.createElement("div");
    header.className = "ds-code-header";

    // Move/reuse the lang span
    if (langSpan) {
      langSpan.className = "ds-code-lang";
      header.appendChild(langSpan);
    } else {
      const span = document.createElement("span");
      span.className = "ds-code-lang";
      span.textContent = lang;
      header.appendChild(span);
    }

    // Create copy button
    const copyBtn = document.createElement("button");
    copyBtn.className = "ds-copy-btn";
    copyBtn.setAttribute("type", "button");
    copyBtn.setAttribute("aria-label", "Copy code");
    copyBtn.innerHTML = COPY_ICON;
    header.appendChild(copyBtn);

    copyBtn.addEventListener("click", async () => {
      const code = block.querySelector("code");
      const text = code?.textContent ?? "";
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.innerHTML = CHECK_ICON;
        setTimeout(() => {
          copyBtn.innerHTML = COPY_ICON;
        }, 1500);
      } catch {
        // clipboard unavailable
      }
    });

    // Insert header before <pre>
    block.insertBefore(header, pre);
  });

  return {
    destroy() {
      // No cleanup needed — element is removed with the page
    },
  };
}

const COPY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;

const CHECK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
