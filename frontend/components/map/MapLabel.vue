<template>
  <span
    class="mt-1 px-2 py-1 text-xs font-mono uppercase border bg-black/80 whitespace-nowrap"
    :class="labelClass"
  >
    {{ city }}, {{ country }}
  </span>
</template>

<script setup lang="ts">
const props = defineProps<{
  city: string
  country: string
  color: 'red' | 'cyan'
}>()

const labelClass = computed(() =>
  props.color === 'red'
    ? 'text-red-400 border-red-500'
    : 'text-cyan-300 border-cyan-500'
)
</script>
