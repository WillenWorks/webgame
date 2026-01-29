<template>
  <div class="flex flex-col gap-6 max-w-4xl mx-auto w-full p-4 h-full">
    <!-- Header -->
    <div class="flex justify-between items-center bg-black/50 p-4 border-2 border-amber-500 shadow-lg">
      <h2 class="text-2xl font-display text-amber-400 uppercase drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
        ARQUIVOS DA AGÊNCIA
      </h2>
      <RetroButton variant="outline" @click="goToDashboard">
        VOLTAR AO DASHBOARD
      </RetroButton>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
      
      <!-- Stats Sidebar -->
      <RetroCard title="ESTATÍSTICAS" extraClass="border-cyan-500/50 h-full">
        <div class="space-y-6 p-4">
          <div class="text-center">
            <h3 class="text-slate-500 text-xs uppercase mb-1">CASOS RESOLVIDOS</h3>
            <p class="text-4xl text-green-400 font-display">{{ profile?.solved_cases || 0 }}</p>
          </div>
          <div class="text-center">
            <h3 class="text-slate-500 text-xs uppercase mb-1">FALHAS</h3>
            <p class="text-4xl text-red-500 font-display">{{ profile?.failed_cases || 0 }}</p>
          </div>
          <div class="border-t border-slate-700 pt-4">
            <h3 class="text-slate-500 text-xs uppercase mb-2">RANK ATUAL</h3>
            <p class="text-xl text-amber-400 font-display uppercase">{{ profile?.rank?.label || 'RECRUTA' }}</p>
            <div class="w-full bg-slate-900 h-2 mt-2">
               <div class="bg-amber-400 h-full" :style="{ width: calculateXpProgress() + '%' }"></div>
            </div>
            <p class="text-right text-xs text-slate-500 mt-1">{{ profile?.xp || 0 }} XP</p>
          </div>
        </div>
      </RetroCard>

      <!-- Case History List -->
      <RetroCard title="HISTÓRICO DE OPERAÇÕES" class="md:col-span-2 h-full">
        <div class="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar p-2">
          
          <div v-if="history.length === 0" class="text-center text-slate-500 py-12 font-mono">
            NENHUM REGISTRO DE CASO ANTERIOR ENCONTRADO.
          </div>

          <div 
            v-for="(entry, index) in history" 
            :key="index"
            class="border border-slate-800 bg-black/40 p-3 flex justify-between items-center hover:bg-white/5 transition-colors group"
          >
            <div>
              <div class="flex items-center gap-2">
                <span 
                  class="text-[10px] px-1.5 py-0.5 border"
                  :class="entry.status === 'SOLVED' ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-red-500 text-red-400 bg-red-500/10'"
                >
                  {{ entry.status === 'SOLVED' ? 'SUCESSO' : 'FALHA' }}
                </span>
                <span class="text-xs text-slate-500 font-mono">{{ entry.date }}</span>
              </div>
              <h4 class="text-amber-400 font-display text-sm mt-1">
                {{ entry.summary || 'CASO ARQUIVADO #' + (index + 1000) }}
              </h4>
            </div>
            <div class="text-right">
              <span class="text-xs text-cyan-400 font-mono block">+{{ entry.xp }} XP</span>
            </div>
          </div>

        </div>
      </RetroCard>

    </div>
  </div>
</template>

<script setup>
import RetroCard from '~/components/ui/RetroCard.vue'
import RetroButton from '~/components/ui/RetroButton.vue'
import { useGame } from '~/composables/useGame'

const router = useRouter()
const { profile, fetchProfile } = useGame()

// Mock history for now since endpoint is not standardized
const history = ref([
  // { status: 'SOLVED', date: '1985-10-24', summary: 'Roubo do diamante Hope', xp: 500 },
  // { status: 'FAILED', date: '1985-11-02', summary: 'Furto da Torre Eiffel', xp: 0 },
])

onMounted(async () => {
  if (!profile.value) {
    await fetchProfile()
  }
  // If we had an endpoint:
  // history.value = await api('/cases/history')
  
  // Populate mock data based on stats if empty
  if (history.value.length === 0 && profile.value) {
     for(let i=0; i<profile.value.solved_cases; i++) {
        history.value.push({ 
           status: 'SOLVED', 
           date: 'ARQUIVADO', 
           summary: `CASO DE SUCESSO #${2000+i}`, 
           xp: 500 
        })
     }
     for(let i=0; i<profile.value.failed_cases; i++) {
        history.value.push({ 
           status: 'FAILED', 
           date: 'ARQUIVADO', 
           summary: `CASO ENCERRADO #${9000+i}`, 
           xp: 0 
        })
     }
  }
})

const goToDashboard = () => {
  router.push('/')
}

const calculateXpProgress = () => {
  if (!profile.value) return 0
  const { min_xp, max_xp } = profile.value.rank
  if (!max_xp) return 100
  const current = profile.value.xp - min_xp
  const total = max_xp - min_xp
  return Math.min(100, Math.max(0, (current / total) * 100))
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
  background: #0ea5e9; 
  border: 1px solid #000;
}
</style>
