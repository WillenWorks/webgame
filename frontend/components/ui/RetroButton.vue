<template>
  <button 
    class="retro-btn"
    :class="[
      variant === 'outline' ? 'border-2 border-cyan-500 text-cyan-400 bg-transparent hover:bg-cyan-900/20 shadow-none' : '',
      variant === 'danger' ? 'bg-red-600 hover:bg-red-500 shadow-[4px_4px_0px_0px_rgba(220,38,38,0.5)]' : '',
      block ? 'w-full flex' : '',
      extraClass
    ]"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>

<script setup>
defineProps({
  variant: {
    type: String,
    default: 'primary' // primary, outline, danger
  },
  block: Boolean,
  disabled: Boolean,
  extraClass: String
})
defineEmits(['click'])
</script>
