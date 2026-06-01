---
layout: home

hero:
  name: DrawSpec Docs
  text: Diagrams as TypeScript
  tagline: Embedded directly in your VitePress site
  actions:
    - theme: brand
      text: Getting Started
      link: /guide/getting-started
---

<script setup>
import { ref, onMounted } from "vue";
import { renderDiagram } from "../src/render.ts";
import { loginFlow } from "../src/login-flow.sequence.ts";

const svg = ref("");

onMounted(async () => {
  svg.value = await renderDiagram(loginFlow);
});
</script>

<div class="diagram-container" v-html="svg"></div>

<style>
.diagram-container {
  margin: 2rem auto;
  max-width: 700px;
}
.diagram-container svg {
  max-width: 100%;
  height: auto;
}
</style>
