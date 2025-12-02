<template>
  <div class="space-y-8">
    <header class="space-y-2">
      <p class="text-xs tracking-[0.25em] text-sky-400 uppercase">
        IGI // International Geointelligence Initiative
      </p>
      <h1 class="text-3xl md:text-4xl font-bold text-slate-50">
        Central de Operações · Operação Monaco
      </h1>

      <p class="text-sm md:text-base text-slate-300 max-w-2xl">
        Bem-vindo, agente. Este terminal é o seu ponto de partida para acessar casos ativos,
        revisar resultados e acompanhar seu desempenho dentro da IGI.
      </p>

      <p v-if="profileLoading" class="text-xs text-slate-500">
        Carregando perfil do agente...
      </p>
      <p v-else-if="profileError" class="text-xs text-red-400">
        {{ profileError }}
      </p>
    </header>

    <div class="grid gap-6 md:grid-cols-2">
      <!-- Status do agente -->
      <InfoSectionCard
        title="Status do Agente"
        :subtitle="agentSubtitle"
        :badge="agentPositionLabel"
      >
        <div v-if="profileLoading" class="space-y-2 text-sm text-slate-300">
          Obtendo dados do seu perfil operacional...
        </div>

        <div v-else-if="profileError" class="space-y-2 text-sm text-red-400">
          {{ profileError }}
        </div>

        <div v-else class="space-y-3 text-sm">
          <p>
            <span class="text-slate-400">Nome:</span>
            <span class="font-semibold">
              {{ profile?.name || "Agente não identificado" }}
            </span>
          </p>
          <p v-if="profile?.codename">
            <span class="text-slate-400">Codinome:</span>
            <span class="font-semibold text-sky-300">
              {{ profile?.codename }}
            </span>
          </p>
          <p>
            <span class="text-slate-400">Cargo atual:</span>
            <span class="font-semibold text-emerald-300">
              {{ agentPositionLabel }}
            </span>
          </p>

          <div class="grid grid-cols-3 gap-3 text-xs md:text-sm pt-2 border-t border-slate-800">
            <div>
              <p class="text-slate-400">XP total</p>
              <p class="font-semibold text-slate-100">
                {{ profile?.xp ?? 0 }}
              </p>
            </div>
            <div>
              <p class="text-slate-400">Reputação</p>
              <p :class="reputationClass">
                {{ profile?.reputation ?? 50 }}
              </p>
            </div>
            <div>
              <p class="text-slate-400">Casos resolvidos</p>
              <p class="font-semibold text-emerald-300">
                {{ profile?.solved_cases ?? 0 }}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3 text-xs md:text-sm">
            <div>
              <p class="text-slate-400">Casos falhos</p>
              <p class="font-semibold text-rose-300">
                {{ profile?.failed_cases ?? 0 }}
              </p>
            </div>
            <div>
              <p class="text-slate-400">Total de casos</p>
              <p class="font-semibold text-slate-100">
                {{ profile?.total_cases ?? 0 }}
              </p>
            </div>
            <div>
              <p class="text-slate-400">Índice de falhas</p>
              <p :class="failureRatioClass">
                {{ failureRatioText }}
              </p>
            </div>
          </div>

          <p class="text-xs text-slate-500">
            Em níveis iniciais, a agência designa diretamente as missões para você.
            À medida que evoluir de cargo e consolidar sua reputação, a escolha de
            operações ficará mais flexível.
          </p>
        </div>
      </InfoSectionCard>

      <!-- Centro de operações -->
      <InfoSectionCard
        title="Centro de Operações"
        :subtitle="operationsSubtitle"
      >
        <div class="space-y-3 text-sm">
          <p class="text-slate-300">
            A partir daqui você pode acessar a lista de casos disponíveis, retomar investigações
            em andamento e revisar relatórios de missões concluídas.
          </p>

          <div class="flex flex-wrap gap-3">
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-lg bg-sky-600 hover:bg-sky-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition"
              @click="goToCases"
            >
              <span v-if="isRestrictedPosition">
                Ir para missão designada
              </span>
              <span v-else>
                Ver casos disponíveis
              </span>
            </button>

            <button
              type="button"
              class="inline-flex items-center justify-center rounded-lg border border-slate-600 bg-slate-900/60 hover:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-100 transition"
              @click="goToCases"
            >
              Acessar painel de investigações
            </button>
          </div>

          <p class="text-xs text-slate-500">
            Modo atual: protótipo jogável. As mecânicas de escolha avançada de casos, viagens
            entre cidades e dossiê completo de suspeitos serão incrementadas nas próximas tasks.
          </p>
        </div>
      </InfoSectionCard>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import InfoSectionCard from "@/components/InfoSectionCard.vue"
import { getAgentProfile } from "@/services/gameApi"

definePageMeta({
  ssr: false,
})

const router = useRouter()

const profile = ref(null)
const profileLoading = ref(true)
const profileError = ref("")

// agora usa rank interno
const isRestrictedPosition = computed(() => {
  const r = profile.value?.rank
  if (!r) return true
  const rl = String(r).toLowerCase()
  return rl === "trainee" || rl === "field_agent"
})

// label mostra o cargo bonitinho se tiver, senão mapeia a partir do rank
const agentPositionLabel = computed(() => {
  if (profile.value?.position) return profile.value.position
  const r = profile.value?.rank
  const rl = String(r || "").toLowerCase()
  if (rl === "trainee") return "Agente em treinamento"
  if (rl === "field_agent") return "Agente de campo"
  if (rl === "senior_agent") return "Agente sênior"
  if (rl === "inspector") return "Inspetor"
  if (rl === "chief") return "Chefe de operações"
  return "Agente em treinamento"
})

const agentSubtitle = computed(() => {
  if (isRestrictedPosition.value) {
    return "Você está nas fases iniciais da carreira. A agência define suas missões para consolidar sua formação."
  }
  return "Você já possui certa autonomia para escolher quais operações deseja assumir."
})

const operationsSubtitle = computed(() => {
  if (isRestrictedPosition.value) {
    return "A IGI designará automaticamente o próximo caso adequado ao seu nível atual."
  }
  return "Selecione a operação que deseja assumir entre os casos disponíveis."
})

const reputationClass = computed(() => {
  const rep = profile.value?.reputation ?? 50
  if (rep >= 70) return "font-semibold text-emerald-300"
  if (rep >= 40) return "font-semibold text-sky-300"
  if (rep >= 20) return "font-semibold text-amber-300"
  return "font-semibold text-rose-300"
})

const failureRatioText = computed(() => {
  const ratio = profile.value?.failure_ratio ?? 0
  const pct = Math.round(ratio * 100)
  return `${pct}%`
})

const failureRatioClass = computed(() => {
  const ratio = profile.value?.failure_ratio ?? 0
  if (ratio <= 0.2) return "font-semibold text-emerald-300"
  if (ratio <= 0.4) return "font-semibold text-amber-300"
  return "font-semibold text-rose-300"
})

function goToCases() {
  router.push("/cases")
}

async function loadProfile() {
  profileLoading.value = true
  profileError.value = ""
  try {
    const data = await getAgentProfile(1)
    profile.value = data || null
  } catch (err) {
    profileError.value =
      err?.message || "Erro ao carregar perfil do agente."
  } finally {
    profileLoading.value = false
  }
}

onMounted(() => {
  loadProfile()
})
</script>