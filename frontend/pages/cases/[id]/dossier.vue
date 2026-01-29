<template>
  <div class="flex flex-col gap-6 max-w-4xl mx-auto w-full p-4">
    <!-- Header -->
    <div class="flex justify-between items-center bg-black/50 p-4 border-2 border-amber-500 shadow-lg">
      <h2 class="text-2xl font-display text-amber-400 uppercase drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
        INTERPOL / DOSSIÊ COMPUTADORIZADO
      </h2>
      <RetroButton variant="outline" @click="goBack">
        VOLTAR
      </RetroButton>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      <!-- Filtros -->
      <RetroCard title="IDENTIFICAR SUSPEITO" extraClass="border-cyan-500/50">
        <div class="space-y-4">
          <div class="grid grid-cols-1 gap-4">
            <div v-for="(options, label) in filtersConfig" :key="label" class="flex flex-col gap-1">
              <label class="text-xs text-cyan-400 font-mono uppercase">{{ label }}</label>
              <select 
                v-model="filters[label]" 
                @change="handleFilter"
                class="bg-black border border-slate-700 text-amber-400 font-mono p-2 uppercase focus:border-amber-400 outline-none"
              >
                <option value="">(DESCONHECIDO)</option>
                <option v-for="opt in options" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </div>
          </div>
          
          <div class="pt-4 flex justify-between items-center">
             <span class="text-xs text-slate-500 font-mono">
               {{ suspects.length }} SUSPEITOS ENCONTRADOS
             </span>
             <RetroButton variant="default" @click="handleFilter" :disabled="isLoading">
               ATUALIZAR DADOS
             </RetroButton>
          </div>
        </div>
      </RetroCard>

      <!-- Resultado / Mandado -->
      <div class="flex flex-col gap-6">
        <RetroCard title="RESULTADOS DA BUSCA" class="flex-1 min-h-[300px]">
          <div v-if="isLoading" class="flex items-center justify-center h-full">
            <span class="animate-pulse text-cyan-400 font-mono">PROCESSANDO DADOS...</span>
          </div>

          <div v-else-if="suspects.length === 0" class="flex items-center justify-center h-full text-slate-500 font-mono text-center p-4">
            NENHUM SUSPEITO ENCONTRADO COM ESTAS CARACTERÍSTICAS.
          </div>

          <div v-else class="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <div 
              v-for="suspect in suspects" 
              :key="suspect.id"
              class="border border-slate-800 p-3 flex justify-between items-center hover:bg-white/5 transition-colors cursor-pointer group"
              :class="{'border-amber-500 bg-amber-500/10': selectedSuspect?.id === suspect.id}"
              @click="selectedSuspect = suspect"
            >
              <div class="flex items-center gap-3">
                 <!-- Imagem do Suspeito -->
                 <div class="w-10 h-10 bg-slate-900 flex items-center justify-center text-xs text-slate-600 border border-slate-700 overflow-hidden relative">
                   <img v-if="suspect.imageUrl" :src="suspect.imageUrl" alt="Suspect" class="w-full h-full object-cover transition-transform group-hover:scale-110" />
                   <span v-else>IMG</span>
                 </div>
                 <div>
                   <h4 class="text-amber-400 font-display text-sm">{{ suspect.name }}</h4>
                   <p class="text-xs text-slate-500 font-mono">{{ suspect.sex }} / {{ suspect.hobby }}</p>
                 </div>
              </div>
              <!-- Checkmark if selected -->
              <div v-if="selectedSuspect?.id === suspect.id" class="text-amber-500 text-lg">
                ✔
              </div>
            </div>
          </div>
        </RetroCard>

        <RetroCard>
           <div class="p-2">
             <div v-if="selectedSuspect" class="flex flex-col gap-4">
                <div class="flex items-start gap-4 p-2 bg-slate-900/50 border border-slate-800">
                    <img v-if="selectedSuspect.imageUrl" :src="selectedSuspect.imageUrl" class="w-16 h-16 object-cover border border-slate-600" />
                    <div>
                        <h3 class="text-amber-400 font-bold uppercase">{{ selectedSuspect.name }}</h3>
                        <p class="text-xs text-slate-400 font-mono mt-1">
                            {{ selectedSuspect.sex }} • {{ selectedSuspect.hair }} • {{ selectedSuspect.hobby }}
                        </p>
                        <p class="text-xs text-slate-500 font-mono">
                            Veículo: {{ selectedSuspect.vehicle }} <br/>
                            Característica: {{ selectedSuspect.feature }}
                        </p>
                    </div>
                </div>

                <div v-if="suspects.length === 1 && selectedSuspect" class="text-center space-y-2">
                    <p class="text-green-400 font-mono text-sm uppercase">
                         PROVAS CONCLUSIVAS. <br/> MANDADO PRONTO PARA EMISSÃO.
                    </p>
                     <RetroButton 
                     variant="danger" 
                     class="w-full"
                     @click="handleWarrant(selectedSuspect.id)"
                     :disabled="issuing"
                   >
                     {{ issuing ? 'EMITINDO...' : 'EMITIR MANDADO AGORA' }}
                   </RetroButton>
                </div>
                <div v-else class="text-center text-yellow-500 font-mono text-xs uppercase">
                   CONFIRME AS PISTAS ANTES DE EMITIR O MANDADO. <br/> ERROS CUSTAM TEMPO.
                </div>
             </div>

             <div v-else-if="suspects.length > 0" class="text-center text-slate-500 font-mono text-xs uppercase p-4">
               SELECIONE UM SUSPEITO NA LISTA PARA VER DETALHES.
             </div>
             
             <div v-else class="text-center text-red-500 font-mono text-xs uppercase">
               DADOS INSUFICIENTES PARA MANDADO.
             </div>
           </div>
        </RetroCard>
      </div>

    </div>
  </div>
</template>

<script setup>
import RetroCard from '~/components/ui/RetroCard.vue'
import RetroButton from '~/components/ui/RetroButton.vue'
import { useGame } from '~/composables/useGame'

const router = useRouter()
const route = useRoute()
const caseId = route.params.id

const { filterSuspects, issueWarrant } = useGame()

const filters = ref({
  sex: '',
  hair: '',
  hobby: '',
  feature: '',
  vehicle: ''
})

const suspects = ref([])
const isLoading = ref(false)
const issuing = ref(false)
const selectedSuspect = ref(null)

const filtersConfig = {
  sex: ['Male', 'Female'],
  hair: ['Black', 'Blond', 'Red', 'Brown', 'Gray'],
  hobby: ['Tennis', 'Music', 'Climbing', 'Skydiving', 'Swimming', 'Croquet'],
  feature: ['Ring', 'Tattoo', 'Scar', 'Jewelry', 'Limp', 'Glasses'],
  vehicle: ['Convertible', 'Limousine', 'Motorcycle', 'Sportscar']
}

const goBack = () => {
  router.back()
}

const handleFilter = async () => {
  isLoading.value = true
  try {
    const criteria = { caseId } // Must pass caseId if backend requires it in URL or query
    // Remove empty strings
    for (const [key, val] of Object.entries(filters.value)) {
      if (val) criteria[key] = val
    }

    // Call API
    const res = await filterSuspects(criteria)
    suspects.value = res || []
    
    // Auto-select if only one
    if (suspects.value.length === 1) {
      selectedSuspect.value = suspects.value[0]
    } else {
      selectedSuspect.value = null
    }

  } catch (e) {
    console.error(e)
  } finally {
    isLoading.value = false
  }
}

const handleWarrant = async (suspectId) => {
  issuing.value = true
  try {
    const res = await issueWarrant(caseId, suspectId)
    if (res.ok) {
      alert(`MANDADO EMITIDO PARA: ${selectedSuspect.value?.name || 'SUSPEITO'}`)
      router.push(`/cases/${caseId}/city`)
    } else {
      alert(`ERRO AO EMITIR MANDADO: ${res.message}`)
    }
  } catch (e) {
    alert('Erro de comunicação com HQ.')
  } finally {
    issuing.value = false
  }
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #1e293b; 
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #fbbf24; 
  border: 1px solid #000;
}
</style>
