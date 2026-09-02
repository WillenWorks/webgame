<template>
  <span class="tw-wrap" :class="{ 'whitespace-pre-wrap': preserveWhitespace }">{{ shown }}<span
      v-if="!done"
      class="tw-caret"
      aria-hidden="true"
    >▋</span></span>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useSfx } from '@/composables/useSfx'

const props = withDefaults(defineProps<{
  text: string
  /** ms por caractere */
  speed?: number
  /** atraso antes de iniciar (ms) */
  startDelay?: number
  /** toca o tique datilografado */
  sound?: boolean
  preserveWhitespace?: boolean
}>(), {
  speed: 26,
  startDelay: 120,
  sound: false,
  preserveWhitespace: true,
})

const emit = defineEmits<{ (e: 'done'): void }>()

const sfx = useSfx()
const shown = ref('')
const done = ref(false)

let intervalId: ReturnType<typeof setInterval> | null = null
let timeoutId: ReturnType<typeof setTimeout> | null = null
let index = 0

const stop = () => {
  if (intervalId) { clearInterval(intervalId); intervalId = null }
  if (timeoutId) { clearTimeout(timeoutId); timeoutId = null }
}

const finishNow = () => {
  stop()
  shown.value = props.text || ''
  done.value = true
  emit('done')
}

const start = () => {
  stop()
  index = 0
  shown.value = ''
  done.value = false

  const full = props.text || ''
  if (!full) { done.value = true; return }

  // Respeita usuários que preferem menos animação
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    finishNow()
    return
  }

  timeoutId = setTimeout(() => {
    intervalId = setInterval(() => {
      index++
      shown.value = full.slice(0, index)
      if (props.sound && index % 2 === 0) sfx.type()
      if (index >= full.length) finishNow()
    }, Math.max(6, props.speed))
  }, Math.max(0, props.startDelay))
}

// Permite pular a animação clicando no texto
defineExpose({ skip: finishNow })

onMounted(start)
watch(() => props.text, start)
onBeforeUnmount(stop)
</script>

<style scoped>
.tw-caret {
  display: inline-block;
  margin-left: 1px;
  color: #fbbf24;
  animation: tw-blink 1s steps(1) infinite;
}
@keyframes tw-blink {
  50% { opacity: 0; }
}
</style>
