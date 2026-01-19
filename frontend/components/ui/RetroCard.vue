      
<template>
  <div class="retro-card" :class="extraClass">
    <div v-if="title || $slots.header" class="flex flex-col space-y-1.5 p-6 border-b-2 border-slate-700 bg-slate-800/50">
      <h3 v-if="title" class="text-lg font-display leading-none tracking-tight text-amber-400 uppercase">
        {{ title }}
      </h3>
      <slot name="header"></slot>
    </div>
    <div class="p-6 font-mono text-sm text-slate-300">
      <slot />
    </div>
    <div v-if="$slots.footer" class="flex items-center p-6 pt-0 font-mono text-xs text-slate-500">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  extraClass: String
})
</script>

    