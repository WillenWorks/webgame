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
            <h2 class="text-2xl font-display text-amber-400">{{ profile.detective_name || profile.name }}</h2>
            <p class="text-lg font-mono text-cyan-400 uppercase tracking-widest">
              {{ profile.rank_title || profile.rank?.label || "Agente de Campo" }}
            </p>
          </div>

          <div class="space-y-4 border-t-2 border-dashed border-slate-700 pt-4">
            <div class="flex justify-between items-center">
              <span class="text-slate-500">REPUTAÇÃO</span>
              <span class="text-xl" :class="(profile.reputation_score || 0) < 0 ? 'text-red-500' : 'text-cyan-400'">
                {{ profile.reputation_score || 0 }}
              </span>
            </div>
            
            <!-- Barra de Reputação Bi-direcional -->
            <div class="w-full h-6 bg-slate-900 border border-slate-700 relative flex items-center justify-center overflow-hidden">
               <!-- Linha central -->
               <div class="absolute h-full w-px bg-slate-600 z-10"></div>
               
               <!-- Barra -->
               <div 
                 class="h-full transition-all duration-1000 absolute"
                 :class="(profile.reputation_score || 0) >= 0 ? 'bg-cyan-500/50 left-1/2 origin-left' : 'bg-red-500/50 right-1/2 origin-right'"
                 :style="{ width: (Math.min(Math.abs(profile.reputation_score || 0), 1000) / 10) + '%' }"
               ></div>
            </div>
            
            <div class="flex justify-between text-[10px] text-slate-600 font-mono">
               <span>-1000</span>
               <span>{{ profile.reputation_score > 0 ? 'POSITIVO' : profile.reputation_score < 0 ? 'NEGATIVO' : 'NEUTRO' }}</span>
               <span>+1000</span>
            </div>
          </div>

          <div class="flex justify-between border-t-2 border-dashed border-slate-700 pt-4">
             <div class="text-center">
                <h3 class="text-xs text-slate-500 mb-1">XP TOTAL</h3>
                <p class="text-xl text-amber-400 font-display">{{ profile.xp || 0 }}</p>
             </div>
             <div class="text-center">
                <h3 class="text-xs text-slate-500 mb-1">MISSÕES</h3>
                <p class="text-xl text-white font-display">{{ (profile.cases_solved || 0) + (profile.cases_failed || 0) }}</p>
             </div>
          </div>
        </div>
      </RetroCard>
    </div>

    <!-- Painel Direito: Missão Atual / Nova Missão -->
    <div class="md:col-span-8 flex flex-col gap-6">
      
      <!-- Card Principal: Status da Missão -->
      <RetroCard title="TRANSFERÊNCIA DE DADOS // MISSÕES ATIVAS" class="flex-1 min-h-[300px]">
         <div v-if="isLoading || isCreatingCase" class="h-full flex flex-col items-center justify-center gap-6">
            <div class="w-16 h-16 border-4 border-t-amber-500 border-slate-800 rounded-full animate-spin"></div>
            <div class="text-center space-y-2">
               <p class="text-amber-500 font-mono animate-pulse tracking-widest">ESTABELECENDO CONEXÃO SEGURA...</p>
               <p class="text-xs text-cyan-400 font-mono typing-text">{{ loadingMessage || 'Sincronizando satélites...' }}</p>
            </div>
         </div>

         <!-- Caso exista: Mostrar resumo -->
         <div v-else-if="activeCase" class="h-full flex flex-col items-center justify-center p-8 text-center space-y-6">
            <div class="w-24 h-24 bg-red-500/10 border-2 border-red-500 flex items-center justify-center rounded-full animate-pulse">
               <span class="text-3xl">⚠️</span>
            </div>
            <div>
               <h2 class="text-3xl font-display text-white uppercase mb-2">MISSÃO EM ANDAMENTO</h2>
               <p class="text-slate-400 max-w-md mx-auto">
                  Agente, você possui uma operação ativa em <span class="text-amber-400">{{ activeCase.intro_text ? 'LOCAL DESCONHECIDO' : 'TRÂNSITO' }}</span>. 
                  O tempo é essencial.
               </p>
            </div>
            
            <div class="grid grid-cols-2 gap-8 w-full max-w-md border-t border-slate-700 pt-6">
               <div>
                  <p class="text-xs text-slate-500 uppercase">OBJETIVO</p>
                  <p class="text-cyan-400 font-mono text-sm">{{ activeCase.stolenObject || 'RECUPERAR ARTEFATO' }}</p>
               </div>
               <div>
                  <p class="text-xs text-slate-500 uppercase">STATUS</p>
                  <p class="text-red-400 font-mono text-sm animate-pulse">PRIORIDADE MÁXIMA</p>
               </div>
            </div>

            <RetroButton variant="danger" size="lg" class="w-full max-w-xs" @click="resumeMission(activeCase?.case?.id)">
               RETOMAR OPERAÇÃO
            </RetroButton>
         </div>

         <!-- Se não houver caso: Botão de Criar -->
         <div v-else class="h-full flex flex-col items-center justify-center p-8 space-y-8">
            <div class="text-center space-y-2">
               <h2 class="text-2xl font-display text-slate-300">NENHUMA MISSÃO ATIVA</h2>
               <p class="text-sm text-slate-500 font-mono">SELECIONE O NÍVEL DE AMEAÇA PARA INICIAR UMA NOVA OPERAÇÃO.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
               <button 
                 @click="createNewCase('EASY')"
                 class="group border border-slate-700 bg-slate-900/50 p-6 hover:border-green-500 hover:bg-green-500/10 transition-all text-left"
               >
                  <h3 class="text-green-400 font-display text-xl mb-2 group-hover:translate-x-1 transition-transform">RECRUTA</h3>
                  <p class="text-xs text-slate-500 font-mono">Para agentes em treinamento. Pistas claras, mais tempo.</p>
               </button>

               <button 
                 @click="createNewCase('HARD')"
                 class="group border border-slate-700 bg-slate-900/50 p-6 hover:border-amber-500 hover:bg-amber-500/10 transition-all text-left"
               >
                  <h3 class="text-amber-400 font-display text-xl mb-2 group-hover:translate-x-1 transition-transform">AGENTE</h3>
                  <p class="text-xs text-slate-500 font-mono">O padrão da agência. Vilões astutos, tempo limitado.</p>
               </button>

               <button 
                 @click="createNewCase('EXTREME')"
                 class="group border border-slate-700 bg-slate-900/50 p-6 hover:border-red-600 hover:bg-red-600/10 transition-all text-left"
               >
                  <h3 class="text-red-500 font-display text-xl mb-2 group-hover:translate-x-1 transition-transform">VETERANO</h3>
                  <p class="text-xs text-slate-500 font-mono">Apenas para a elite. Sem margem para erros.</p>
               </button>
            </div>
         </div>
      </RetroCard>

      <!-- Painel Inferior: Atalhos -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 h-48">
         
         <!-- Mensagens -->
         <RetroCard title="COMUNICADOS">
            <div class="space-y-3 text-xs font-mono text-slate-400">
               <p class="flex gap-2">
                  <span class="text-amber-500">></span>
                  <span>ATENÇÃO AGENTES: Novo protocolo de viagem em vigor.</span>
               </p>
               <p class="flex gap-2">
                  <span class="text-amber-500">></span>
                  <span>VILELA REPORTADO: Visto recentemente no Hemisfério Sul.</span>
               </p>
               <p class="flex gap-2 animate-pulse">
                  <span class="text-amber-500">></span>
                  <span>MENSAGEM CRIPTOGRAFADA RECEBIDA...</span>
               </p>
            </div>
         </RetroCard>

         <!-- Ferramentas -->
         <RetroCard title="FERRAMENTAS">
            <div class="grid grid-cols-2 gap-4 h-full items-center">
               <RetroButton variant="outline" class="h-12" @click="goToArchives">ARQUIVOS</RetroButton>
               <RetroButton variant="outline" class="h-12" @click="goToVillains">VILÕES</RetroButton>
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
import { useApi } from '~/composables/useApi' // unused here but usually good practice
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
  fetchActiveCase, // FIXED: was fetchAvailableCases, use standard name
  startCase, 
  profile, 
  activeCase, // Use activeCase ref
  isLoading 
} = useGame()

const router = useRouter()
const newAgentName = ref('')
const validating = ref(true)
const isCreatingCase = ref(false)
const loadingMessage = ref('')

onMounted(async () => {
  await new Promise(r => setTimeout(r, 100))
  
  const token = useCookie('auth_token')
  
  if (token.value) {
    try {
      await fetchProfile()
      if (profile.value) {
        await fetchActiveCase()
      }
    } catch (e) {
      console.error('[Dashboard] Error fetching data', e)
    } finally {
      validating.value = false
    }
  } else {
    router.push('/login')
  }
})

const handleCreateProfile = async () => {
  if (!newAgentName.value) return
  try {
    await createProfile(newAgentName.value)
    // Refetch everything
    await fetchProfile()
    await fetchActiveCase()
  } catch (e) {
    alert('Erro ao criar perfil: ' + e.message)
  }
}

const createNewCase = async (difficulty) => {
  isCreatingCase.value = true
  const messages = [
      "Decodificando chaves de acesso...",
      "Baixando dossiês da Interpol...",
      "Gerando perfil do suspeito...",
      "Calculando rotas de fuga...",
      "Sincronizando satélites..."
  ];
  
  let msgInterval = setInterval(() => {
      loadingMessage.value = messages[Math.floor(Math.random() * messages.length)];
  }, 800);

  try {
    await new Promise(r => setTimeout(r, 2500))
    
    const newCase = await startCase(difficulty)
    if (newCase && newCase?.case?.id) {
        clearInterval(msgInterval)
        loadingMessage.value = "CASO GERADO. INICIANDO..."
        await new Promise(r => setTimeout(r, 500))
        router.push(`/cases/${newCase?.case?.id}/briefing`)
    }
  } catch (e) {
    clearInterval(msgInterval)
    alert('Erro ao criar missão: ' + e.message)
    isCreatingCase.value = false
    // Se falhar porque já existe, recarregar para atualizar a tela
    await fetchActiveCase()
  }
}

const resumeMission = (caseId) => {
  router.push(`/cases/${caseId}/map`)
}

const goToArchives = () => {
  router.push('/archives')
}

const goToVillains = () => {
  router.push('/villains')
}
</script>

<style scoped>
.typing-text::after {
  content: '|';
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
</style>
