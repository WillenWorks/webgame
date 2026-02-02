<template>
  <div class="flex flex-col gap-6 max-w-6xl mx-auto w-full p-6 h-full relative">
    <!-- Header -->
    <div class="flex justify-between items-center bg-black/50 p-4 border-2 border-amber-500 shadow-lg z-10">
      <h2 class="text-2xl font-display text-amber-400 uppercase drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
        INTERPOL / DOSSIÊ COMPUTADORIZADO
      </h2>
      <RetroButton variant="outline" @click="goBack">
        VOLTAR
      </RetroButton>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
      
      <!-- Filtros / Notas -->
      <RetroCard title="IDENTIFICAR SUSPEITO / NOTAS" extraClass="border-cyan-500/50">
        <div class="space-y-4">
          <p class="text-xs text-slate-400 font-mono mb-2">
            REGISTRE AS PISTAS ENCONTRADAS PARA FILTRAR O BANCO DE DADOS DA INTERPOL.
          </p>
          <div class="grid grid-cols-1 gap-4">
            <div v-for="(options, key) in filtersConfig" :key="key" class="flex flex-col gap-1">
              <label class="text-sm text-cyan-400 font-mono uppercase">{{ labels[key] }}</label>
              <select 
                v-model="filters[key]" 
                @change="handleFilterChange"
                class="bg-black border border-slate-700 text-amber-400 font-mono p-3 uppercase focus:border-amber-400 outline-none"
              >
                <option value="">(DESCONHECIDO)</option>
                <option v-for="opt in options" :key="opt.id" :value="opt.id">{{ opt.label }}</option>
              </select>
            </div>
          </div>
          
          <div class="pt-4 flex justify-between items-center">
             <span class="text-sm text-slate-500 font-mono">
               {{ suspects.length }} SUSPEITOS ENCONTRADOS
             </span>
             <span v-if="savingNotes" class="text-xs text-amber-500 animate-pulse">SALVANDO...</span>
          </div>
        </div>
      </RetroCard>

      <!-- Resultado / Mandado -->
      <div class="flex flex-col gap-6 h-full min-h-0">
        <RetroCard title="RESULTADOS DA BUSCA" class="flex-1 min-h-0 flex flex-col">
          <div v-if="isLoading" class="flex items-center justify-center h-full p-4">
            <span class="animate-pulse text-cyan-400 font-mono">PROCESSANDO DADOS...</span>
          </div>

          <div v-else-if="suspects.length === 0" class="flex items-center justify-center h-full text-slate-500 font-mono text-center p-4">
            NENHUM SUSPEITO ENCONTRADO COM ESTAS CARACTERÍSTICAS.
          </div>

          <div v-else class="flex-1 overflow-y-auto pr-2 custom-scrollbar p-2 space-y-2">
            <div 
              v-for="suspect in suspects" 
              :key="suspect.id"
              class="border border-slate-800 p-3 flex justify-between items-center hover:bg-white/5 transition-colors cursor-pointer group"
              :class="{'border-amber-500 bg-amber-500/10': selectedSuspect?.id === suspect.id}"
              @click="selectedSuspect = suspect"
            >
              <div class="flex items-center gap-3">
                 <!-- Imagem do Suspeito -->
                 <div class="w-12 h-12 bg-slate-900 flex items-center justify-center text-sm text-slate-600 border border-slate-700 overflow-hidden relative shrink-0">
                   <!-- Fallback handled by onerror or v-if check if empty -->
                   <img v-if="suspect.imageUrl" :src="suspect.imageUrl" alt="Suspect" class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                   <span v-else>IMG</span>
                 </div>
                 <div>
                   <h4 class="text-amber-400 font-display text-sm leading-none uppercase">{{ suspect.name }}</h4>
                   <p class="text-xs text-slate-500 font-mono mt-1 uppercase">{{ suspect.sex }} / {{ suspect.hobby }}</p>
                 </div>
              </div>
              <!-- Checkmark if selected -->
              <div v-if="selectedSuspect?.id === suspect.id" class="text-amber-500 text-lg">
                ✔
              </div>
            </div>
          </div>
        </RetroCard>

        <RetroCard class="shrink-0">
           <div class="p-2">
             <div v-if="selectedSuspect" class="flex flex-col gap-4">
                <div class="flex items-start gap-4 p-2 bg-slate-900/50 border border-slate-800">
                    <div class="w-20 h-20 bg-black border border-slate-600 shrink-0">
                        <img v-if="selectedSuspect.imageUrl" :src="selectedSuspect.imageUrl" class="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h3 class="text-amber-400 font-bold uppercase text-lg">{{ selectedSuspect.name }}</h3>
                        <p class="text-sm text-slate-400 font-mono mt-1 uppercase">
                            {{ selectedSuspect.sex }} • {{ selectedSuspect.hair }} • {{ selectedSuspect.hobby }}
                        </p>
                        <p class="text-sm text-slate-500 font-mono uppercase">
                            Veículo: {{ selectedSuspect.vehicle }} <br/>
                            Característica: {{ selectedSuspect.feature }}
                        </p>
                    </div>
                </div>

                <div class="text-center space-y-2">
                    <!-- Warrant Logic -->
                    <div v-if="warrantIssuedId">
                        <p v-if="warrantIssuedId === selectedSuspect.id" class="text-green-400 font-mono text-sm uppercase p-2 border border-green-500/50 bg-green-900/20">
                             MANDADO EMITIDO PARA ESTE SUSPEITO.
                        </p>
                        <p v-else class="text-red-400 font-mono text-sm uppercase p-2 border border-red-500/50 bg-red-900/20">
                             ATENÇÃO: MANDADO JÁ EMITIDO PARA OUTRA PESSOA.
                        </p>
                        <RetroButton variant="default" class="w-full opacity-50 cursor-not-allowed" disabled>
                             MANDADO EMITIDO
                        </RetroButton>
                    </div>

                    <div v-else>
                        <p v-if="suspects.length === 1" class="text-green-400 font-mono text-sm uppercase mb-2">
                             PROVAS CONCLUSIVAS. <br/> MANDADO PRONTO PARA EMISSÃO.
                        </p>
                        <p v-else class="text-yellow-500 font-mono text-xs uppercase mb-2">
                           CONFIRME AS PISTAS ANTES DE EMITIR O MANDADO.
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
                </div>
             </div>

             <div v-else-if="suspects.length > 0" class="text-center text-slate-500 font-mono text-sm uppercase p-4">
               SELECIONE UM SUSPEITO NA LISTA PARA VER DETALHES.
             </div>
             
             <div v-else class="text-center text-red-500 font-mono text-sm uppercase">
               DADOS INSUFICIENTES PARA MANDADO.
             </div>
           </div>
        </RetroCard>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import RetroCard from '~/components/ui/RetroCard.vue'
import RetroButton from '~/components/ui/RetroButton.vue'
import { useGame } from '~/composables/useGame'

const router = useRouter()
const route = useRoute()
const caseId = route.params.id

const { filterSuspects, issueWarrant, getDossierNotes, saveDossierNotes, fetchActiveCase, cases } = useGame()

const filters = ref({
  sex_id: '',
  hair_id: '',
  hobby_id: '',
  feature_id: '',
  vehicle_id: ''
})

const suspects = ref([])
const isLoading = ref(false)
const issuing = ref(false)
const savingNotes = ref(false)
const selectedSuspect = ref(null)
const warrantIssuedId = ref(null)

const labels = {
  sex_id: 'Sexo',
  hair_id: 'Cabelo',
  hobby_id: 'Hobby',
  feature_id: 'Característica',
  vehicle_id: 'Veículo'
}

const filtersConfig = {
  sex_id: [
    { id: 2, label: 'Masculino' }, 
    { id: 1, label: 'Feminino' }
  ],
  hair_id: [
    { id: 1, label: 'Preto' },
    { id: 2, label: 'Castanho' },
    { id: 3, label: 'Loiro' },
    { id: 4, label: 'Ruivo' },
    { id: 5, label: 'Grisalho' }
  ],
  hobby_id: [
    { id: 1, label: 'Fotografia' },
    { id: 2, label: 'Escalada' },
    { id: 3, label: 'Leitura' },
    { id: 4, label: 'Dança' },
    { id: 5, label: 'Culinária' },
  ],
  feature_id: [
    { id: 1, label: 'Cicatriz' },
    { id: 2, label: 'Tatuagem' },
    { id: 3, label: 'Óculos' },
    { id: 4, label: 'Chapéu' },
    { id: 5, label: 'Barba' }, 
  ],
  vehicle_id: [
    { id: 1, label: 'Conversível' },
    { id: 2, label: 'Limousine' },
    { id: 3, label: 'Esportivo' },
    { id: 4, label: 'Motocicleta' }
  ]
}

onMounted(async () => {
  await loadState()
})

const loadState = async () => {
  isLoading.value = true
  try {
    // 1. Check for existing warrant in active case
    await fetchActiveCase()
    const activeCase = cases.value.find(c => c.id === caseId)
    if (activeCase && activeCase.warrant_suspect_id) {
       warrantIssuedId.value = activeCase.warrant_suspect_id
    }

    // 2. Load Notes
    const notes = await getDossierNotes(caseId)
    if (notes) {
       // Populate filters with saved notes
       Object.keys(filters.value).forEach(k => {
          if (notes[k]) filters.value[k] = notes[k]
       })
    }

    // 3. Initial filter run
    await refreshSuspects()

  } catch (e) {
    console.error("Error loading state", e)
  } finally {
    isLoading.value = false
  }
}

const refreshSuspects = async () => {
    const criteria = {} 
    for (const [key, val] of Object.entries(filters.value)) {
      if (val) criteria[key] = val
    }
    const res = await filterSuspects(caseId, criteria)
    suspects.value = res || []
    
    // Select the suspect if warrant is issued for them
    if (warrantIssuedId.value) {
       const wSuspect = suspects.value.find(s => s.id === warrantIssuedId.value)
       if (wSuspect) selectedSuspect.value = wSuspect
    } else if (suspects.value.length === 1) {
       selectedSuspect.value = suspects.value[0]
    }
}

const handleFilterChange = async () => {
  // Save notes automatically
  savingNotes.value = true
  try {
     const notesToSave = {}
     for (const [key, val] of Object.entries(filters.value)) {
        if (val) notesToSave[key] = val
     }
     await saveDossierNotes(caseId, notesToSave)
     await refreshSuspects()
  } catch (e) {
     console.error(e)
  } finally {
     savingNotes.value = false
  }
}

const goBack = () => {
  router.back()
}

const handleWarrant = async (suspectId) => {
  issuing.value = true
  try {
    const res = await issueWarrant(caseId, suspectId)
    if (res.ok) {
      alert(`MANDADO EMITIDO PARA: ${selectedSuspect.value?.name || 'SUSPEITO'}`)
      // Update state locally
      warrantIssuedId.value = suspectId
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
