<script lang="ts">
import { theme } from "$lib/stores/diagram";
import { connectWebSocket, disconnectWebSocket } from "$lib/websocket";
import "../app.css";

let { children } = $props();

$effect(() => {
  document.documentElement.setAttribute("data-theme", $theme);
});

$effect(() => {
  connectWebSocket();
  return () => disconnectWebSocket();
});
</script>

{@render children()}
