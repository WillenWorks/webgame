<template>
  <div class="space-y-6">
    <header class="flex items-start justify-between gap-4">
      <div class="space-y-1">
        <button type="button" class="text-xs text-slate-400 hover:text-slate-200 mb-1 inline-flex items-center gap-1"
          @click="goBack">
          <span>←</span>
          <span>Voltar para casos</span>
        </button>

        <h1 class="text-2xl font-bold">
          {{ caseData?.title || "Investigação em andamento" }}
        </h1>

        <p class="text-sm text-slate-300 max-w-2xl">
  {{ caseData?.summary || caseData?.description || "Acompanhe o progresso desta investigação, analise as pistas coletadas e decida o melhor momento para emitir o mandado de prisão." }}
</p>


        <p v-if="caseData" class="text-xs text-slate-400">
          Dificuldade:
          <span class="font-semibold">
            {{ difficultyText }}
          </span>
          <span v-if="progress" class="ml-2">
            · Progresso:
            <span class="font-semibold">
              {{ progressLabel }}
            </span>
          </span>
        </p>
      </div>
    </header>

    <div v-if="loading" class="text-sm text-slate-300">
      Carregando status da investigação...
    </div>

    <div v-else-if="error" class="text-sm text-red-400">
      {{ error }}
    </div>

    <div v-else class="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <!-- Coluna esquerda: situação atual + ações -->
      <div class="space-y-4">
        <InfoSectionCard title="Situação atual" :subtitle="currentStepSubtitle" :badge="stepBadge">
          <div v-if="currentStep" class="space-y-3 text-sm">
            <p class="text-slate-200">
              <span class="text-slate-400">Local:</span>
              <span class="font-semibold">
                {{ currentLocationText }}
              </span>
            </p>
            <p class="text-slate-300 whitespace-pre-line">
              {{ currentStep.description || "Nenhuma descrição detalhada disponível para este passo." }}
            </p>
          </div>
          <div v-else class="text-sm text-slate-300">
            Nenhum passo atual encontrado. Tente avançar a investigação ou ver o status novamente.
          </div>
        </InfoSectionCard>

        <InfoSectionCard title="Ações do agente"
          subtitle="Use com cuidado. Cada avanço pode aproximar ou afastar do culpado.">
          <div class="space-y-3 text-sm">
            <p class="text-slate-300">
              Avançar a investigação consome um passo definido pelo sistema. Em versões futuras,
              cada avanço também estará associado a consumo de tempo/turnos.
            </p>

            <div class="flex flex-wrap gap-3">
              <button type="button"
                class="inline-flex items-center justify-center rounded-lg bg-sky-600 hover:bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
                :disabled="!canAdvance" @click="onNextStep">
                <span v-if="actionLoading">
                  Avançando investigação...
                </span>
                <span v-else-if="reachedEnd">
                  Todas as etapas concluídas
                </span>
                <span v-else>
                  Avançar investigação
                </span>
              </button>

              <button type="button"
                class="inline-flex items-center justify-center rounded-lg border border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-200 transition disabled:opacity-60 disabled:cursor-not-allowed"
                :disabled="!canIssueWarrant || actionLoading" @click="openWarrantModal">
                Emitir mandado de prisão
              </button>
            </div>

            <p class="text-xs text-slate-500" v-if="!canIssueWarrant">
              Ainda não há pistas suficientes para emitir um mandado com segurança. Continue
              investigando até consolidar suspeitos e características compatíveis.
            </p>
          </div>
        </InfoSectionCard>
      </div>

      <!-- Coluna direita: pistas + suspeitos -->
      <div class="space-y-4">
        <InfoSectionCard title="Pistas coletadas" :subtitle="cluesSubtitle" :badge="cluesBadge">
          <div v-if="clues.length === 0" class="text-sm text-slate-300">
            Nenhuma pista coletada ainda. Avance a investigação para descobrir novas informações
            sobre o caso, o vilão e possíveis rotas de fuga.
          </div>

          <ul v-else class="space-y-2">
            <li v-for="(clue, index) in clues" :key="clue.id || `${clue.attribute_name}-${index}`"
              class="border border-slate-700/80 bg-slate-900/70 rounded-lg px-3 py-2 text-xs md:text-sm">
              <p class="text-[11px] uppercase tracking-wide text-slate-400">
                {{ clue.attribute_name || "Pista" }}
                <span v-if="clue.step_number || clue.step_order" class="ml-1">
                  · Etapa {{ clue.step_number || clue.step_order }}
                </span>
              </p>
              <p class="text-slate-200">
                {{ clue.attribute_value || clue.text || JSON.stringify(clue) }}
              </p>
            </li>
          </ul>
        </InfoSectionCard>

        <InfoSectionCard title="Suspeitos identificados" :subtitle="suspectsSubtitle" :badge="suspectsBadge">
          <div v-if="suspects.length === 0" class="text-sm text-slate-300">
            Nenhum suspeito foi identificado com segurança até o momento. Continue coletando pistas
            para afunilar a investigação.
          </div>

          <div v-else class="space-y-2">
            <article v-for="sus in suspects" :key="sus.id"
              class="border border-slate-700/80 bg-slate-900/70 rounded-lg px-3 py-2 text-xs md:text-sm flex flex-col gap-1">
              <header class="flex items-center justify-between gap-2">
                <h3 class="font-semibold text-slate-50">
                  {{ sus.name || "Suspeito desconhecido" }}
                </h3>
                <p v-if="sus.codename" class="text-[11px] text-sky-300 uppercase tracking-wide">
                  {{ sus.codename }}
                </p>
              </header>
              <p class="text-slate-300">
                <span class="text-slate-400">Profissão:</span>
                <span>{{ sus.occupation || "Não informada" }}</span>
              </p>
              <p class="text-slate-300">
                <span class="text-slate-400">Veículo:</span>
                <span>{{ sus.vehicle || "Desconhecido" }}</span>
              </p>
              <p class="text-slate-300">
                <span class="text-slate-400">Traço marcante:</span>
                <span>{{ sus.feature || "Não especificado" }}</span>
              </p>
            </article>
          </div>
        </InfoSectionCard>
      </div>
    </div>

    <WarrantModal v-if="showWarrant" :case-id="caseId" :suspects="suspects" @close="showWarrant = false"
      @completed="onWarrantCompleted" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import InfoSectionCard from "@/components/InfoSectionCard.vue"
import WarrantModal from "@/components/WarrantModal.vue"
import { getCaseStatus, nextStep } from "@/services/gameApi"

const route = useRoute()
const router = useRouter()

const caseId = Number(route.params.id)

const loading = ref(false)
const error = ref("")
const caseData = ref(null)
const currentStep = ref(null)
const progress = ref(null)
const clues = ref([])
const suspects = ref([])
const canIssueWarrant = ref(false)
const reachedEnd = ref(false)
const showWarrant = ref(false)
const actionLoading = ref(false)

const difficultyText = computed(() => {
  if (!caseData.value?.difficulty) return "indefinida"
  const d = String(caseData.value.difficulty).toLowerCase()
  if (d.includes("easy") || d === "1") return "fácil"
  if (d.includes("medium") || d === "2") return "média"
  if (d.includes("hard") || d === "3") return "difícil"
  return caseData.value.difficulty
})

const progressLabel = computed(() => {
  if (!progress.value) return ""
  const current = progress.value.current ?? 0
  const total = progress.value.total ?? 0
  if (!total) return `${current} etapa(s)`
  return `${current}/${total} etapa(s)`
})

const stepBadge = computed(() => {
  if (!progress.value) return ""
  const current = progress.value.current ?? 0
  const total = progress.value.total ?? 0
  if (!total) return `Etapa ${current}`
  return `Etapa ${current} de ${total}`
})

const currentStepSubtitle = computed(() => {
  if (!currentStep.value) return "Aguardando atualização do status da investigação."
  return currentStep.value.title || "Passo atual da investigação."
})

const currentLocationText = computed(() => {
  const step = currentStep.value || {}
  const parts = []
  if (step.location_name) parts.push(step.location_name)
  if (step.city) parts.push(step.city)
  if (step.country) parts.push(step.country)
  if (!parts.length) return "Local não informado"
  return parts.join(" · ")
})

const cluesBadge = computed(() => {
  if (!clues.value.length) return ""
  return `${clues.value.length} pista${clues.value.length > 1 ? "s" : ""}`
})

const cluesSubtitle = computed(() => {
  if (!clues.value.length) return "Nenhuma pista coletada até agora."
  return "Estas são as pistas que você já reuniu sobre o caso."
})

const suspectsBadge = computed(() => {
  if (!suspects.value.length) return ""
  return `${suspects.value.length} suspeito${suspects.value.length > 1 ? "s" : ""}`
})

const suspectsSubtitle = computed(() => {
  if (!suspects.value.length) return "Nenhum suspeito foi identificado ainda."
  return "Perfis que se alinham, em algum nível, às pistas descobertas."
})

const canAdvance = computed(() => !reachedEnd.value && !actionLoading.value)

function normalizeSuspects(apiSuspects) {
  return (apiSuspects || []).map((s) => ({
    ...s,
    name: s.name_snapshot || s.name || "Suspeito desconhecido",
    occupation: s.occupation_snapshot || s.occupation || null,
    vehicle: s.vehicle_snapshot || s.vehicle || null,
    feature: s.feature_snapshot || s.feature || null,
  }))
}

async function loadStatus() {
  loading.value = true
  error.value = ""
  try {
    const status = await getCaseStatus(caseId, 1)

    caseData.value = status.case || null
    currentStep.value = status.currentStep || null
    progress.value = status.progress || null
    clues.value = status.clues || []
    suspects.value = normalizeSuspects(status.suspects)
    canIssueWarrant.value = !!status.canIssueWarrant
    reachedEnd.value = !!status.reachedEnd
  } catch (err) {
    error.value = err.message || "Erro ao carregar status do caso."
  } finally {
    loading.value = false
  }
}

async function onNextStep() {
  if (actionLoading.value || reachedEnd.value) return

  actionLoading.value = true
  error.value = ""

  try {
    const status = await nextStep(caseId, 1)

    caseData.value = status.case || null
    currentStep.value = status.currentStep || null
    progress.value = status.progress || null
    clues.value = status.clues || []
    suspects.value = status.suspects || []
    canIssueWarrant.value = !!status.canIssueWarrant
    reachedEnd.value = !!status.reachedEnd
  } catch (err) {
    error.value = err.message || "Erro ao avançar a investigação."
  } finally {
    actionLoading.value = false
  }
}

function goBack() {
  router.push("/cases")
}

function openWarrantModal() {
  showWarrant.value = true
}

function onWarrantCompleted() {
  showWarrant.value = false
  router.push(`/cases/${caseId}/result`)
}

onMounted(() => {
  loadStatus()
})
</script>
