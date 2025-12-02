<template>
  <div class="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
    <AgentHeader />
    <main class="flex-1">
      <div class="max-w-6xl mx-auto px-4 py-6">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup>
import AgentHeader from "@/components/AgentHeader.vue"
</script>
