<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="36"
    height="36"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    :class="pinClass"
  >
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
</template>

<script setup lang="ts">
const props = defineProps<{
  color: 'red' | 'cyan'
}>()

const pinClass = computed(() =>
  props.color === 'red'
    ? 'text-red-500 drop-shadow-[0_0_10px_rgba(255,0,0,0.9)]'
    : 'text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.9)]'
)
</script>
