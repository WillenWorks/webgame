<template>
  <div class="flex flex-col gap-6 max-w-4xl mx-auto w-full">
    <!-- City Header -->
    <div class="flex justify-between items-center bg-black/50 p-4 border-2 border-amber-500 shadow-lg">
      <div>
        <h2 class="text-2xl font-display text-amber-400 uppercase drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
          {{ currentCity?.city_name || "CARREGANDO..." }}
        </h2>
        <p class="text-cyan-400 font-mono tracking-widest text-sm uppercase">
          {{ currentCity?.country_name }}
        </p>
      </div>
      <RetroButton variant="outline" @click="goToMap">
        VOLTAR AO MAPA
      </RetroButton>
    </div>

    <!-- Main Interaction Area -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[400px]">
      
      <!-- Lista de Locais -->
      <RetroCard title="LOCAIS DE INTERESSE" extraClass="border-cyan-500/50">
        <div v-if="isLoading && !places.length" class="flex justify-center p-8">
          <p class="animate-pulse text-cyan-400">ESCANEANDO ÁREA...</p>
        </div>
        
        <div v-else class="space-y-4">
          <button
            v-for="place in places"
            :key="place.id"
            @click="handleInvestigate(place)"
            :disabled="!!investigating"
            class="w-full text-left group relative border-2 border-slate-700 hover:border-amber-400 bg-black/40 p-4 transition-all hover:bg-amber-400/10 active:translate-y-1 disabled:opacity-50"
          >
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 bg-black border border-slate-700 p-1 group-hover:border-amber-400 transition-colors flex items-center justify-center">
                <!-- Ícone Lupa SVG -->
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-500 group-hover:text-amber-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </div>
              <div>
                <h3 class="text-lg font-display text-white group-hover:text-amber-400 mb-1 transition-colors uppercase">
                  {{ place.name }}
                </h3>
                <p class="text-xs text-slate-400 font-mono uppercase">
                  Atividade: {{ place.interaction_style || "Padrão" }}
                </p>
              </div>
            </div>
            <div v-if="investigating === place.id" class="absolute right-4 top-4">
              <span class="animate-spin inline-block">⏳</span>
            </div>
          </button>
        </div>
      </RetroCard>

      <!-- Área de Diálogo / Resultado -->
      <div class="flex flex-col gap-6">
        <RetroCard class="flex-1 border-amber-500/50 min-h-[200px] relative overflow-hidden">
          <template #header>
            <div class="flex items-center gap-2 text-amber-400">
              <span>TRANSCRICAO: {{ npcName || "AGUARDANDO..." }}</span>
            </div>
          </template>
          
          <div class="absolute inset-0 bg-amber-500/5 pointer-events-none" />
          
          <div v-if="dialogue" class="relative z-10 p-2">
            <p class="font-mono text-lg leading-relaxed text-white typing-effect uppercase">
              "{{ dialogue }}"
            </p>
          </div>
          
          <div v-else class="text-center py-12 text-slate-600 font-mono text-sm">
            SELECIONE UM LOCAL PARA INTERROGAR TESTEMUNHAS.
          </div>
        </RetroCard>

        <!-- Ações -->
        <RetroCard>
          <div class="flex gap-4">
            <RetroButton class="flex-1" variant="danger" @click="openWarrant">
              EMITIR MANDADO
            </RetroButton>
            <RetroButton class="flex-1" variant="outline" @click="goToMap">
              VIAJAR
            </RetroButton>
          </div>
        </RetroCard>
      </div>

    </div>
  </div>
</template>

<script setup>
import RetroCard from '~/components/ui/RetroCard.vue'
import RetroButton from '~/components/ui/RetroButton.vue'

const route = useRoute()
const router = useRouter()
const caseId = route.params.id

const { visitCurrentCity, investigatePlace, isLoading } = useGame()

const cityData = ref(null)
const currentCity = ref(null)
const places = ref([])

const investigating = ref(null)
const dialogue = ref(null)
const npcName = ref(null)

onMounted(async () => {
  if (caseId) {
    await loadCity()
  }
})

const loadCity = async () => {
  try {
    const data = await visitCurrentCity(caseId)
    if (data) {
      cityData.value = data
      currentCity.value = data.city
      places.value = data.places || []
    }
  } catch (e) {
    console.error(e)
  }
}

const handleInvestigate = async (place) => {
  investigating.value = place.id
  dialogue.value = null
  npcName.value = place.name

  try {
    const res = await investigatePlace(caseId, place.id)
    if (res.ok) {
      dialogue.value = res.text
    } else {
      alert('Investigação falhou.')
    }
  } catch (e) {
    console.error(e)
  } finally {
    investigating.value = null
  }
}

const goToMap = () => {
  router.push(`/cases/${caseId}/map`)
}

const openWarrant = () => {
  alert('Funcionalidade de Mandado em desenvolvimento (Próxima etapa)')
}
</script>

<style scoped>
.typing-effect {
  overflow: hidden;
  border-right: .15em solid orange;
  white-space: pre-wrap;
  animation: typing 2s steps(40, end), blink-caret .75s step-end infinite;
}

@keyframes blink-caret {
  from, to { border-color: transparent }
  50% { border-color: orange; }
}
</style>
