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
                OBJETO: <span class="text-cyan-400">{{ currentCase?.case?.stolen_object || 'DESCONHECIDO' }}</span>
              </h2>
              
              <div class="font-mono text-sm leading-relaxed text-slate-300 typing-effect">
                <p>AGENTE,</p>
                <br>
                <p>
                  {{ currentCase?.case?.intro_text || 'Recebemos informações de que um item valioso foi roubado. Sua missão é rastrear o ladrão, recuperar o objeto e prendê-lo antes que ele desapareça.' }}
                </p>
                <br>
                <p>
                  O tempo é essencial. Você tem <span class="text-red-400">{{ currentCase?.case?.time_limit_hours || 168 }} HORAS</span>.
                </p>
                <p>
                  A reputação da Agência está em suas mãos.
                </p>
                <br>
                <p class="text-amber-500">BOA SORTE.</p>
              </div>
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
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGame } from '~/composables/useGame'
import RetroCard from '~/components/ui/RetroCard.vue'
import RetroButton from '~/components/ui/RetroButton.vue'

const route = useRoute()
const router = useRouter()
const { fetchAvailableCases, cases } = useGame()
const loading = ref(true)
const currentCase = ref(null)

onMounted(async () => {
  const caseId = route.params.id
  const activeCase = await fetchAvailableCases();
  currentCase.value = (activeCase?.case?.id === caseId) ? activeCase : cases.value[0]
  loading.value = false
})

const acceptMission = () => {
  router.push(`/cases/${route.params.id}/map`)
}
</script>

<style scoped>
.typing-effect {
  white-space: pre-wrap;
}
</style>
