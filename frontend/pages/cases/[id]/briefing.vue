<template>
  <div class="h-full flex items-center justify-center p-4">
    <div class="max-w-4xl w-full space-y-8">
      
      <!-- Topo: Identificação -->
      <div class="border-b-2 border-amber-500 pb-4 flex justify-between items-end">
        <div>
          <h1 class="text-4xl font-display text-amber-500 uppercase tracking-widest">
            CONFIDENCIAL
          </h1>
          <p class="text-xs font-mono text-slate-500">
            ARQUIVO DE MISSÃO #{{ route.params.id.substring(0,8) }} // APENAS OLHOS AUTORIZADOS
          </p>
        </div>
        <div class="text-right">
          <p class="text-xs font-mono text-red-500 animate-pulse">
            PRIORIDADE MÁXIMA
          </p>
        </div>
      </div>

      <!-- Conteúdo do Briefing -->
      <RetroCard extraClass="border-amber-500/50 bg-black/80">
        <div v-if="loading" class="p-12 text-center font-mono text-amber-500 animate-pulse">
          DESCRIPTOGRAFANDO MENSAGEM DO QG...
        </div>

        <div v-else class="space-y-6 p-6">
          <div class="flex items-start gap-6">
            <!-- Imagem do Artefato (Placeholder) -->
            <div class="w-32 h-32 border border-slate-700 bg-slate-900 shrink-0 relative overflow-hidden group">
               <img src="/images/artifact-placeholder.png" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
               <div class="absolute inset-0 bg-amber-500/10 mix-blend-overlay"></div>
            </div>

            <div class="space-y-4 w-full">
              <h2 class="text-2xl text-white font-display uppercase">
                OBJETO: <span class="text-cyan-400">{{ stolenObject }}</span>
              </h2>

              <TypewriterText
                ref="typewriterRef"
                :text="briefingText"
                :speed="16"
                sound
                class="block font-mono text-sm leading-relaxed text-slate-300 cursor-pointer"
                @click="typewriterRef?.skip?.()"
              />
            </div>
          </div>
        </div>
      </RetroCard>

      <!-- Ações -->
      <div class="flex justify-end pt-4">
        <RetroButton @click="acceptMission" class="w-full md:w-auto animate-pulse">
          ACEITAR MISSÃO E INICIAR >>
        </RetroButton>
      </div>

    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGame } from '~/composables/useGame'
import { useSfx } from '~/composables/useSfx'
import RetroCard from '~/components/ui/RetroCard.vue'
import RetroButton from '~/components/ui/RetroButton.vue'
import TypewriterText from '~/components/ui/TypewriterText.vue'

const route = useRoute()
const router = useRouter()
const { fetchActiveCase, cases } = useGame()
const sfx = useSfx()

const loading = ref(true)
const currentCase = ref(null)
const typewriterRef = ref(null)

const stolenObject = computed(() => currentCase.value?.stolen_object || 'DESCONHECIDO')

const briefingText = computed(() => {
  const intro = currentCase.value?.intro_text
    || 'Recebemos informações de que um item valioso foi roubado. Sua missão é rastrear o ladrão, recuperar o objeto e prendê-lo antes que ele desapareça.'
  const hours = currentCase.value?.time_limit_hours || 168
  return `AGENTE,\n\n${intro}\n\nO tempo é essencial. Você tem ${hours} HORAS.\nA reputação da Agência está em suas mãos.\n\nBOA SORTE.`
})

onMounted(async () => {
  const caseId = route.params.id
  const active = await fetchActiveCase()
  const fromActive = String(active?.case?.id ?? '') === String(caseId) ? active.case : null
  currentCase.value = fromActive || cases.value[0] || null
  loading.value = false
})

const acceptMission = () => {
  sfx.confirm()
  router.push(`/cases/${route.params.id}/map`)
}
</script>
