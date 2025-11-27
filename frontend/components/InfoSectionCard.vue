<template>
  <section class="bg-slate-900/70 border border-slate-700 rounded-xl p-4 md:p-5 shadow-sm">
    <header class="mb-3 flex items-center justify-between gap-2">
      <div>
        <h2 class="text-sm font-semibold text-slate-100 uppercase tracking-wide">
          {{ title }}
        </h2>
        <p v-if="subtitle" class="text-xs text-slate-400">
          {{ subtitle }}
        </p>
      </div>

      <div v-if="badge" class="text-[10px] px-2 py-1 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/30">
        {{ badge }}
      </div>
    </header>

    <div class="text-sm text-slate-100 space-y-2">
      <slot />
    </div>
  </section>
</template>

<script setup>
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: "",
  },
  badge: {
    type: String,
    default: "",
  },
})
</script>
