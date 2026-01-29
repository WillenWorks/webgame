<template>
  <div v-if="timeState" class="flex items-center gap-4 bg-slate-900/90 border border-slate-700 px-4 py-2 rounded shadow-[0_0_10px_rgba(0,0,0,0.5)]">
    <!-- Icon -->
    <div class="text-amber-500 animate-pulse">
      🕒
    </div>
    
    <!-- Time Info -->
    <div class="flex flex-col">
      <div class="text-xs text-slate-400 font-mono uppercase tracking-widest">
        TEMPO GLOBAL
      </div>
      <div class="text-lg font-display text-white tabular-nums leading-none">
        {{ formattedDate }} <span class="text-amber-400 mx-1">|</span> {{ formattedTime }}
      </div>
    </div>

    <!-- Divider -->
    <div class="h-8 w-px bg-slate-700 mx-2"></div>

    <!-- Remaining Info -->
    <div class="flex flex-col items-end">
       <div class="text-[10px] text-red-400 font-bold uppercase">
         {{ timeState.days_remaining }} DIAS RESTANTES
       </div>
       <div class="text-[10px] text-slate-500">
         PRAZO: {{ formattedDeadline }}
       </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGame } from '@/composables/useGame'

const { timeState } = useGame()

const formattedDate = computed(() => {
  if (!timeState.value?.current_time) return '--/--/----'
  return new Date(timeState.value.current_time).toLocaleDateString('pt-BR')
})

const formattedTime = computed(() => {
  if (!timeState.value?.current_time) return '--:--'
  return new Date(timeState.value.current_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
})

const formattedDeadline = computed(() => {
  if (!timeState.value?.deadline_time) return '--/--'
  return new Date(timeState.value.deadline_time).toLocaleDateString('pt-BR')
})
</script>
