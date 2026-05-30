<script>
import { page } from "$app/stores";
import { getGroupedNav } from "$lib/docs-nav.js";

let { children } = $props();
let darkMode = $state(false);

const navGroups = getGroupedNav();

function toggleDark() {
  darkMode = !darkMode;
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }
}

$effect(() => {
  if (typeof window !== "undefined") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const stored = localStorage.getItem("drawspec-theme");
    darkMode = stored ? stored === "dark" : prefersDark;
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }
});

let sidebarOpen = $state(false);

function closeSidebar() {
  sidebarOpen = false;
}

const year = new Date().getFullYear();
</script>

<svelte:head>
  <title>DrawSpec Documentation</title>
</svelte:head>

<div class="app-layout">
  <header class="header">
    <button
      class="menu-toggle"
      onclick={() => (sidebarOpen = !sidebarOpen)}
      aria-label="Toggle navigation"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
    <a href="/" class="logo">DrawSpec</a>
    <button class="theme-toggle" onclick={toggleDark} aria-label="Toggle dark mode">
      {#if darkMode}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2" fill="none" />
        </svg>
      {:else}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      {/if}
    </button>
  </header>

  <div class="body-row">
    {#if sidebarOpen}
      <div class="sidebar-overlay" onclick={closeSidebar} role="presentation"></div>
    {/if}
    <aside class="sidebar" class:open={sidebarOpen}>
      <nav>
        {#each navGroups as [section, items]}
          <div class="nav-section">
            <h3 class="nav-section-title">{section}</h3>
            <ul class="nav-list">
              {#each items as item}
                <li>
                  <a
                    href="/docs/{item.slug}"
                    class:active={$page.url.pathname === `/docs/${item.slug}`}
                    onclick={closeSidebar}
                  >{item.title}</a>
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </nav>
    </aside>

    <main class="main">
      <div class="content">
        {@render children()}
      </div>
      <footer class="footer">
        <p>Built with <a href="https://github.com/drawspec/drawspec">DrawSpec</a> &middot; &copy; {year} DrawSpec</p>
      </footer>
    </main>
  </div>
</div>

<style>
  .app-layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .header {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    height: var(--header-height);
    padding: 0 1.5rem;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    gap: 0.75rem;
  }

  .menu-toggle {
    display: none;
    background: none;
    border: none;
    color: var(--color-text);
    cursor: pointer;
    padding: 0.25rem;
  }

  .logo {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text);
    text-decoration: none;
    letter-spacing: -0.025em;
  }

  .logo:hover {
    text-decoration: none;
  }

  .theme-toggle {
    margin-left: auto;
    background: none;
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
    cursor: pointer;
    padding: 0.4rem;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      color var(--transition-speed),
      border-color var(--transition-speed);
  }

  .theme-toggle:hover {
    color: var(--color-text);
    border-color: var(--color-border-focus);
  }

  .body-row {
    display: flex;
    flex: 1;
  }

  .sidebar {
    position: sticky;
    top: var(--header-height);
    height: calc(100vh - var(--header-height));
    width: var(--sidebar-width);
    flex-shrink: 0;
    overflow-y: auto;
    padding: 1.5rem 1rem;
    background: var(--color-sidebar-bg);
    border-right: 1px solid var(--color-border);
  }

  .sidebar-overlay {
    display: none;
  }

  .nav-section {
    margin-bottom: 1.5rem;
  }

  .nav-section-title {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-subtle);
    margin: 0 0 0.5rem;
    padding: 0 0.5rem;
  }

  .nav-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .nav-list li a {
    display: block;
    padding: 0.375rem 0.5rem;
    border-radius: 4px;
    color: var(--color-text-muted);
    font-size: 0.875rem;
    text-decoration: none;
    transition:
      background var(--transition-speed),
      color var(--transition-speed);
  }

  .nav-list li a:hover {
    background: var(--color-sidebar-active);
    color: var(--color-text);
    text-decoration: none;
  }

  .nav-list li a.active {
    background: var(--color-sidebar-active);
    color: var(--color-primary);
    font-weight: 500;
  }

  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .content {
    flex: 1;
    max-width: var(--max-content-width);
    padding: 2rem 2.5rem;
    width: 100%;
  }

  .footer {
    padding: 2rem 2.5rem;
    border-top: 1px solid var(--color-border);
    color: var(--color-text-muted);
    font-size: 0.8125rem;
  }

  .footer p {
    margin: 0;
  }

  .footer a {
    color: var(--color-primary);
  }

  @media (max-width: 768px) {
    .menu-toggle {
      display: flex;
    }

    .sidebar {
      position: fixed;
      top: var(--header-height);
      left: 0;
      bottom: 0;
      z-index: 90;
      transform: translateX(-100%);
      transition: transform var(--transition-speed);
    }

    .sidebar.open {
      transform: translateX(0);
    }

    .sidebar-overlay {
      display: block;
      position: fixed;
      inset: 0;
      top: var(--header-height);
      z-index: 80;
      background: rgba(0, 0, 0, 0.4);
    }

    .content {
      padding: 1.5rem 1rem;
    }
  }
</style>
