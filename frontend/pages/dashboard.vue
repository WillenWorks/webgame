<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGame } from '@/composables/useGame'
import { useApi } from '@/composables/useApi'
import RetroCard from '~/components/ui/RetroCard.vue'
import RetroButton from '~/components/ui/RetroButton.vue'

const router = useRouter()
const api = useApi()

const {
  fetchProfile,
  fetchActiveCase,
  startCase,
  profile,
  cases,
  isLoading
} = useGame()

const newAgentName = ref('')

/* =========================
 *  LIFECYCLE
 * ========================= */
onMounted(async () => {
  await fetchProfile()
  if (profile.value) {
    await fetchActiveCase()
  }
})

/* =========================
 *  RANK / XP
 * ========================= */
const isFinalRank = computed(() => {
  return profile.value?.rank?.max_xp === null
})

const xpProgress = computed(() => {
  if (!profile.value?.rank) return 0
  const { xp } = profile.value
  const { min_xp, max_xp } = profile.value.rank
  if (max_xp === null) return 100
  return Math.min(
    100,
    Math.round(((xp - min_xp) / (max_xp - min_xp)) * 100)
  )
})

/* =========================
 *  REPUTAÇÃO
 * ========================= */
const REPUTATION_CAP = 3000

const reputationPercent = computed(() => {
  const score = profile.value?.reputation ?? 0
  return Math.min(100, Math.round((score / REPUTATION_CAP) * 100))
})

const reputationStatus = computed(() => {
  const score = profile.value?.reputation ?? 0
  if (score >= 3000) return 'Figura Histórica'
  if (score >= 2000) return 'Lenda da Agência'
  if (score >= 1200) return 'Alta Confiança'
  if (score >= 500) return 'Confiável'
  return 'Sob Observação'
})

/* =========================
 *  MISSÃO ATIVA
 * ========================= */
const activeCase = computed(() => {
  return cases.value.length > 0 ? cases.value[0] : null
})

const difficultyLabel = computed(() => {
  if (!activeCase.value) return ''
  const d = activeCase.value.difficulty || activeCase.value.difficulty_code
  if (d === 'EASY' || d === 1) return 'BAIXA'
  if (d === 'HARD' || d === 2) return 'ALTA'
  if (d === 'EXTREME' || d === 3) return 'CRÍTICA'
  return 'DESCONHECIDA'
})

const difficultyColor = computed(() => {
  if (difficultyLabel.value === 'BAIXA') return 'text-emerald-400'
  if (difficultyLabel.value === 'ALTA') return 'text-amber-400'
  if (difficultyLabel.value === 'CRÍTICA') return 'text-red-500'
  return 'text-slate-400'
})

const createNewCase = async (difficulty: "EASY" | "HARD" | "EXTREME") => {
  const newCase = await startCase(difficulty)
  if (newCase?.id) router.push(`/cases/${newCase.id}/map`)
}

const resumeMission = (id: string) => {
  router.push(`/cases/${id}/map`)
}

/* =========================
 *  COMUNICADOS DINÂMICOS
 * ========================= */
const communications = computed(() => {
  const msgs: string[] = []

  if (profile.value) {
    if (profile.value.reputation >= 2000) {
      msgs.push('> A Agência reconhece seu histórico exemplar.')
    } else if (profile.value.reputation >= 500) {
      msgs.push('> Seu desempenho permanece dentro dos padrões esperados.')
    } else {
      msgs.push('> Seu comportamento está sob observação.')
    }
  }

  if (profile.value?.rank?.label === 'LENDÁRIO') {
    msgs.push('> Protocolo Ômega ativo para este agente.')
  } else {
    msgs.push('> Protocolos padrão em vigor.')
  }

  if (activeCase.value) {
    msgs.push('> Missão ativa detectada. Prioridade operacional elevada.')
  } else {
    msgs.push('> Nenhuma missão ativa no momento.')
  }

  msgs.push('> Comunicações monitoradas pela ACME.')

  return msgs
})

/* =========================
 *  AUX
 * ========================= */
const notImplemented = () => {
  alert('Recurso indisponível no nível atual.')
}
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-12 gap-8 h-full relative">

    <!-- IDENTIDADE -->
    <div class="md:col-span-4 space-y-6">
      <RetroCard title="IDENTIDADE DO AGENTE" extraClass="h-full border-amber-500/50">

        <div v-if="profile" class="space-y-6">
          <div class="flex flex-col items-center">
            <div class="w-32 h-32 border-4 border-amber-500 p-1 mb-4 bg-black">
              <img
                src="/assets/images/agent_avatar.jpg"
                class="w-full h-full object-cover grayscale contrast-125"
              />
            </div>

            <h2 class="text-2xl font-display text-amber-400">
              {{ profile.detective_name }}
            </h2>

            <p class="text-lg font-mono text-cyan-400 uppercase tracking-widest">
              {{ profile.rank?.label || '—' }}
            </p>
          </div>

          <!-- REPUTAÇÃO -->
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-slate-500">REPUTAÇÃO</span>
              <span class="text-xl text-cyan-400">
                {{ profile.reputation }}
              </span>
            </div>

            <div class="w-full bg-slate-900 h-3 border border-slate-700">
              <div
                class="h-full transition-all duration-700"
                :class="{
                  'bg-slate-500': reputationStatus === 'Sob Observação',
                  'bg-cyan-500': reputationStatus === 'Confiável',
                  'bg-emerald-500': reputationStatus === 'Alta Confiança',
                  'bg-amber-500': reputationStatus === 'Lenda da Agência',
                  'bg-purple-500': reputationStatus === 'Figura Histórica'
                }"
                :style="{ width: reputationPercent + '%' }"
              />
            </div>

            <p class="text-xs font-mono tracking-wide text-amber-400">
              {{ reputationStatus }}
            </p>
          </div>

          <!-- XP -->
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-slate-500">XP TOTAL</span>
              <span class="text-amber-400">{{ profile.xp }}</span>
            </div>

            <div class="w-full bg-slate-900 h-2 border border-slate-700">
              <div
                class="h-full transition-all duration-700"
                :class="isFinalRank ? 'bg-amber-500' : 'bg-amber-500'"
                :style="{ width: xpProgress + '%' }"
              />
            </div>

            <p
              class="text-xs font-mono"
              :class="isFinalRank ? 'text-amber-400' : 'text-slate-500'"
            >
              <span v-if="isFinalRank">Rank Máximo Atingido</span>
              <span v-else>{{ xpProgress }}% até próximo rank</span>
            </p>

            <div class="flex justify-between text-xs text-slate-500 mt-2">
              <span>MISSÕES</span>
              <span>{{ profile.total_cases }}</span>
            </div>
          </div>
        </div>
      </RetroCard>
    </div>

    <!-- PAINEL DIREITO -->
    <div class="md:col-span-8 space-y-6">

      <!-- MISSÃO -->
      <RetroCard
        class="relative"
        :class="activeCase ? 'ring-2 ring-amber-500/40' : ''"
      >
        <template #header>
          <div class="flex justify-between w-full">
            <span class="text-amber-400">
              TRANSFERÊNCIA DE DADOS // MISSÕES ATIVAS
            </span>
            <div class="flex gap-2">
              <div class="w-3 h-3 bg-red-500 rounded-full animate-ping" />
              <div class="w-3 h-3 bg-cyan-500 rounded-full" />
              <div class="w-3 h-3 bg-amber-500 rounded-full" />
            </div>
          </div>
        </template>

        <div v-if="!activeCase" class="text-center py-12 text-slate-500 font-mono">
          NENHUMA MISSÃO ATIVA.
          <div class="mt-4">
            <RetroButton @click="createNewCase('EASY')">
              SOLICITAR NOVA MISSÃO (EASY)
            </RetroButton>
          </div>
        </div>

        <div v-else class="p-6 space-y-4 border border-slate-700 bg-slate-900/40">
          <div class="flex justify-between items-center">
            <h3 class="text-lg text-amber-400 tracking-widest animate-pulse">
              ⚠ OPERAÇÃO EM ANDAMENTO
            </h3>
            <span class="text-xs font-mono uppercase" :class="difficultyColor">
              Dificuldade: {{ difficultyLabel }}
            </span>
          </div>

          <RetroButton
            class="w-full"
            variant="outline"
            @click="resumeMission(activeCase.id)"
          >
            RETOMAR OPERAÇÃO
          </RetroButton>
        </div>
      </RetroCard>

      <!-- COMUNICADOS + FERRAMENTAS -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RetroCard title="COMUNICADOS">
          <div class="max-h-32 overflow-y-auto text-xs text-slate-400 space-y-2 font-mono">
            <p
              v-for="(msg, index) in communications"
              :key="index"
              :class="{
                'text-amber-400': msg.includes('Ômega'),
                'text-red-500': msg.includes('observação')
              }"
            >
              {{ msg }}
            </p>
          </div>
        </RetroCard>

        <RetroCard title="FERRAMENTAS">
          <div class="flex gap-2">
            <RetroButton
              variant="outline"
              disabled
              title="Acesso liberado a partir do rank AGENTE DE CAMPO"
            >
              ARQUIVOS
            </RetroButton>
            <RetroButton
              variant="outline"
              disabled
              title="Acesso liberado a partir do rank AGENTE DE CAMPO"
            >
              SUSPEITOS
            </RetroButton>
          </div>
        </RetroCard>
      </div>
    </div>

    <!-- HUD AMBIENTAL -->
    <div
      class="fixed bottom-4 left-1/2 -translate-x-1/2 text-xs font-mono text-cyan-400 opacity-70"
    >
      CONEXÃO SEGURA • SINCRONIZAÇÃO ATIVA • AGENTE AUTENTICADO
    </div>
  </div>
</template>
