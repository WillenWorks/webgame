<template>
  <div class="grid grid-cols-1 md:grid-cols-12 gap-8 h-full">
    
    <!-- Painel Esquerdo: Dossiê do Agente -->
    <div class="md:col-span-4 space-y-6">
      <RetroCard title="IDENTIDADE DO AGENTE" extraClass="h-full border-amber-500/50">
        <div v-if="isLoading || validating" class="flex justify-center p-8">
          <p class="animate-pulse text-amber-500">CARREGANDO DADOS...</p>
        </div>
        
        <div v-else-if="!profile" class="text-center py-8 space-y-4">
          <p class="text-sm text-slate-400 font-mono">REGISTRO INCOMPLETO</p>
          <div class="p-4 bg-slate-800/50 border border-slate-700">
            <label class="block text-xs text-left mb-2 text-amber-500">NOME OPERACIONAL</label>
            <input v-model="newAgentName" class="w-full bg-black border border-slate-600 p-2 text-white font-mono focus:border-amber-500 outline-none" placeholder="Ex: Agente Z" />
          </div>
          <RetroButton @click="handleCreateProfile" :disabled="!newAgentName">CRIAR PERFIL</RetroButton>
        </div>

        <div v-else class="space-y-6">
          <div class="flex flex-col items-center">
            <div class="w-32 h-32 border-4 border-amber-500 p-1 mb-4 relative overflow-hidden bg-black group">
              <!-- Avatar placeholder se não tiver imagem -->
              <div class="w-full h-full bg-slate-800 flex items-center justify-center text-amber-600">
                <img src="/images/agent_avatar.jpg" class="w-full h-full object-cover grayscale contrast-125 group-hover:grayscale-0 transition-all duration-500" />
              </div>
              <div class="absolute inset-0 bg-amber-500/10 pointer-events-none" />
            </div>
            <h2 class="text-2xl font-display text-amber-400">{{ profile.name }}</h2>
            <p class="text-lg font-mono text-cyan-400 uppercase tracking-widest">
              {{ profile.position || "Agente de Campo" }}
            </p>
          </div>

          <div class="space-y-4 border-t-2 border-dashed border-slate-700 pt-4">
            <div class="flex justify-between items-center">
              <span class="text-slate-500">REPUTAÇÃO</span>
              <span class="text-xl text-cyan-400">{{ profile.reputation || 0 }}</span>
            </div>
            <!-- Barra de Reputação -->
            <div class="w-full bg-slate-900 h-3 border border-slate-700 relative">
              <div 
                class="bg-cyan-500 h-full transition-all duration-1000" 
                :style="{ width: Math.min(100, Math.max(0, (profile.reputation || 0) + 50)) + '%' }"
              ></div>
            </div>
            
            <div class="grid grid-cols-2 gap-4 mt-4">
              <div>
                <span class="text-slate-500 text-xs block">XP TOTAL</span>
                <p class="text-lg text-amber-400">{{ profile.xp || 0 }}</p>
              </div>
              <div class="text-right">
                <span class="text-slate-500 text-xs block">MISSÕES</span>
                <p class="text-lg text-white">{{ profile.total_cases || 0 }}</p>
              </div>
            </div>
          </div>
        </div>
      </RetroCard>
    </div>

    <!-- Painel Direito: Controle de Missão -->
    <div class="md:col-span-8 space-y-6">
      <RetroCard>
        <template #header>
          <div class="flex flex-row items-center justify-between w-full">
            <span class="animate-pulse text-amber-400">TRANSFERÊNCIA DE DADOS // MISSÕES ATIVAS</span>
            <div class="flex gap-2">
              <div class="w-3 h-3 bg-red-500 rounded-full animate-ping" />
              <div class="w-3 h-3 bg-cyan-500 rounded-full animate-bounce delay-75" />
              <div class="w-3 h-3 bg-amber-500 rounded-full delay-150" />
            </div>
          </div>
        </template>

        <div v-if="!profile && !validating" class="text-center py-12 text-slate-500 font-mono">
          PERFIL NECESSÁRIO PARA ACESSAR DADOS DE MISSÃO.
        </div>

        <div v-else-if="isLoading || validating" class="space-y-4">
          <div class="h-24 bg-slate-800/50 border border-slate-700 animate-pulse"></div>
        </div>

        <div v-else-if="cases.length === 0" class="text-center py-12 text-slate-500 font-mono">
          NENHUMA MISSÃO ATIVA.
          <div class="mt-4">
            <RetroButton @click="createNewCase('EASY')">SOLICITAR NOVA MISSÃO (EASY)</RetroButton>
          </div>
        </div>

        <div v-else class="grid gap-4">
          <div 
            v-for="mission in cases" 
            :key="mission.id"
            class="group relative border-2 border-slate-700 hover:border-amber-500 bg-black/40 p-4 transition-all hover:bg-amber-500/5"
          >
            <div class="flex flex-col md:flex-row justify-between items-start gap-4">
              <div>
                <div class="flex items-center gap-2 mb-2">
                  <span class="bg-amber-500/20 text-amber-400 px-2 py-0.5 text-[10px] font-bold border border-amber-500/50 uppercase">
                    {{ mission.difficulty || 'NORMAL' }}
                  </span>
                  <span class="text-[10px] text-slate-500 font-mono">ID: {{ mission.id.substring(0, 8) }}</span>
                </div>
                <h3 class="text-lg font-display text-white group-hover:text-amber-400 transition-colors">
                  {{ mission.stolen_object ? `RECUPERAR: ${mission.stolen_object}` : "OPERAÇÃO EM ANDAMENTO" }}
                </h3>
                <p class="text-sm text-slate-400 font-mono mt-1 max-w-xl">
                  Status: {{ mission.status }}
                </p>
              </div>
              
              <div class="flex flex-col gap-2 w-full md:w-auto">
                <RetroButton 
                  v-if="mission.status === 'ACTIVE'"
                  variant="outline" 
                  @click="resumeMission(mission.id)"
                  class="animate-pulse"
                >
                  RETOMAR
                </RetroButton>
              </div>
            </div>
          </div>
        </div>
      </RetroCard>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
         <RetroCard title="COMUNICADOS">
           <div class="text-xs text-slate-400 space-y-2">
             <p>> ATENÇÃO AGENTES: Novo protocolo de viagem em vigor.</p>
             <p>> VILELA REPORTADO: Visto recentemente no Hemisfério Sul.</p>
             <p>> MENSAGEM CRIPTOGRAFADA RECEBIDA...</p>
           </div>
         </RetroCard>
         
         <RetroCard title="FERRAMENTAS">
           <div class="flex gap-2">
             <RetroButton variant="outline" class="text-xs" @click="goToArchives">
               ARQUIVOS
             </RetroButton>
             <RetroButton variant="outline" class="text-xs" @click="goToSuspects">
               SUSPEITOS
             </RetroButton>
           </div>
         </RetroCard>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGame } from '~/composables/useGame'
import RetroCard from '~/components/ui/RetroCard.vue'
import RetroButton from '~/components/ui/RetroButton.vue'

definePageMeta({
  middleware: (to, from) => {
    // Middleware client-side
    const token = useCookie('auth_token')
    if (!token.value) {
      return navigateTo('/login')
    }
  }
})

const { 
  fetchProfile, 
  createProfile,
  fetchAvailableCases, 
  startCase, 
  profile, 
  cases, 
  isLoading 
} = useGame()

const router = useRouter()
const newAgentName = ref('')
const validating = ref(true)

onMounted(async () => {
  // Pequeno delay para garantir hidratação do cookie
  await new Promise(r => setTimeout(r, 100))
  
  const token = useCookie('auth_token')
  console.log('[Dashboard] Token check:', !!token.value)
  
  if (token.value) {
    try {
      await fetchProfile()
      if (profile.value) {
        await fetchAvailableCases()
      }
    } catch (e) {
      console.error('[Dashboard] Error fetching data', e)
    } finally {
      validating.value = false
    }
  } else {
    // Se não tiver token, o middleware já deve ter redirecionado, 
    // mas por segurança mandamos de novo
    router.push('/login')
  }
})

const handleCreateProfile = async () => {
  if (!newAgentName.value) return
  try {
    await createProfile(newAgentName.value)
    await fetchAvailableCases()
  } catch (e) {
    alert('Erro ao criar perfil: ' + e.message)
  }
}

const createNewCase = async (difficulty) => {
  try {
    const newCase = await startCase(difficulty)
    if (newCase && newCase.id) {
        router.push(`/cases/${newCase.id}/map`)
    }
  } catch (e) {
    alert('Erro ao criar missão: ' + e.message)
  }
}

const resumeMission = (caseId) => {
  router.push(`/cases/${caseId}/map`)
}

const goToArchives = () => {
  router.push('/archives')
}

const goToSuspects = () => {
  // If active case, go to dossier
  if (cases.value && cases.value.length > 0) {
    router.push(`/cases/${cases.value[0].id}/dossier`)
  } else {
    alert('NENHUM CASO ATIVO PARA CONSULTAR SUSPEITOS.')
  }
}

const notImplemented = () => {
  alert('Recurso indisponível. Nível de credencial insuficiente.')
}
</script>
