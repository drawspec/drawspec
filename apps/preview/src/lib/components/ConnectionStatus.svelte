<script lang="ts">
</script>

<div class="status" class:connected={$connected} title={$connected ? "Connected" : "Disconnected"}>
  <span class="dot"></span>
</div>

<style>
  .status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 0.25rem;
  }

  .dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--color-error);
    transition: background var(--transition-speed);
  }

  .connected .dot {
    background: #22c55e;
  }
</style>
