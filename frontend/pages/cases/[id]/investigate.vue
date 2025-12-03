<template>
  <div class="space-y-6">
    <header class="flex items-start justify-between gap-4">
      <div class="space-y-1">
        <button
          type="button"
          class="text-xs text-slate-400 hover:text-slate-200 mb-1 inline-flex items-center gap-1"
          @click="goBack"
        >
          <span>←</span>
          <span>Voltar para casos</span>
        </button>

        <h1 class="text-2xl font-bold">
          {{ caseData?.title || "Investigação em andamento" }}
        </h1>

        <p class="text-sm text-slate-300 max-w-2xl">
          {{
            caseData?.summary ||
              caseData?.description ||
              "Acompanhe o progresso desta investigação, analise as pistas e decida o melhor momento para emitir o mandado de prisão."
          }}
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

    <div v-else-if="!caseData" class="text-sm text-slate-300">
      Nenhuma informação de caso disponível no momento.
    </div>

    <div v-else class="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <!-- Coluna esquerda: situação atual + ações -->
      <div class="space-y-4">
        <InfoSectionCard
          title="Situação atual"
          :subtitle="currentStepSubtitle"
          :badge="stepBadge"
        >
          <div v-if="currentStep" class="space-y-3 text-sm">
            <p class="text-slate-200">
              <span class="text-slate-400">Local:</span>
              <span class="font-semibold">
                {{ currentLocationText }}
              </span>
            </p>
            <p class="text-slate-300 whitespace-pre-line">
              {{
                currentStep.description ||
                  "Nenhuma descrição detalhada disponível para esta etapa."
              }}
            </p>
          </div>

          <p v-else class="text-sm text-slate-300">
            Ainda não há uma etapa atual definida. Avance a investigação para
            iniciar o progresso neste caso.
          </p>

          <div class="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-lg border border-slate-600 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
              :disabled="actionLoading || reachedEnd"
              @click="onNextStep"
            >
              <span v-if="!reachedEnd">Avançar investigação</span>
              <span v-else>Você já chegou ao final deste caso</span>
            </button>

            <div class="flex flex-col gap-1">
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-lg border border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-100 transition disabled:opacity-60 disabled:cursor-not-allowed"
                :disabled="!canIssueWarrant || actionLoading"
                @click="openWarrantModal"
              >
                Emitir mandado de prisão
              </button>

              <p
                class="text-xs text-slate-500 max-w-xs"
                v-if="!canIssueWarrant"
              >
                Ainda não há pistas suficientes para emitir um mandado com
                segurança. Continue investigando até consolidar suspeitos e
                características compatíveis.
              </p>
            </div>
          </div>
        </InfoSectionCard>
      </div>

      <!-- Coluna direita: pistas + suspeitos -->
      <div class="space-y-4">
        <InfoSectionCard
          title="Pistas reunidas"
          :subtitle="cluesSubtitle"
          :badge="cluesBadge"
        >
          <div v-if="!clues.length" class="text-sm text-slate-400">
            Nenhuma pista foi registrada ainda. Avance na investigação para
            descobrir mais informações sobre o caso.
          </div>

          <ul v-else class="space-y-2 text-sm text-slate-200">
            <li
              v-for="clue in clues"
              :key="clue.id"
              class="border border-slate-700/80 bg-slate-900/70 rounded p-2"
            >
              <p class="font-semibold">
                {{ formatClueAttribute(clue.attribute_name) }}
              </p>
              <p class="text-slate-300">
                {{ clue.attribute_value }}
              </p>
              <p v-if="clue.step_order" class="mt-1 text-xs text-slate-500">
                Revelada na etapa {{ clue.step_order }}
              </p>
            </li>
          </ul>
        </InfoSectionCard>

        <InfoSectionCard
          title="Suspeitos"
          :subtitle="suspectsSubtitle"
          :badge="suspectsBadge"
        >
          <div v-if="!suspects.length" class="text-sm text-slate-400">
            Nenhum suspeito foi identificado para este caso até o momento.
          </div>

          <ul
            v-else
            class="grid gap-2 text-sm text-slate-200 sm:grid-cols-2"
          >
            <li
              v-for="sus in suspects"
              :key="sus.id"
              class="border border-slate-700/80 bg-slate-900/70 rounded p-2 space-y-1"
            >
              <p class="text-slate-200 font-semibold">
                {{ sus.name || "Suspeito desconhecido" }}
              </p>

              <p v-if="sus.occupation" class="text-slate-300">
                <span class="text-slate-400">Profissão:</span>
                <span> {{ sus.occupation }} </span>
              </p>

              <p v-if="sus.vehicle" class="text-slate-300">
                <span class="text-slate-400">Veículo:</span>
                <span> {{ sus.vehicle }} </span>
              </p>

              <p v-if="sus.feature" class="text-slate-300">
                <span class="text-slate-400">Característica marcante:</span>
                <span> {{ sus.feature }} </span>
              </p>
            </li>
          </ul>
        </InfoSectionCard>
      </div>
    </div>

    <WarrantModal
      v-if="caseData"
      :show="showWarrant"
      :case-id="caseId"
      :suspects="suspects"
      @close="showWarrant = false"
      @completed="onWarrantCompleted"
    />
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
  if (!currentStep.value)
    return "Aguardando atualização do status da investigação."
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
  return `${clues.value.length} pista${
    clues.value.length > 1 ? "s" : ""
  }`
})

const cluesSubtitle = computed(() => {
  if (!clues.value.length) return "Nenhuma pista coletada até agora."
  return "Estas são as pistas que você já reuniu sobre o caso."
})

const suspectsBadge = computed(() => {
  if (!suspects.value.length) return ""
  return `${suspects.value.length} suspeito${
    suspects.value.length > 1 ? "s" : ""
  }`
})

const suspectsSubtitle = computed(() => {
  if (!suspects.value.length)
    return "Os suspeitos deste caso ainda não foram identificados."
  return "Avalie os suspeitos com base nas pistas recolhidas antes de emitir um mandado."
})

function formatClueAttribute(attr) {
  if (!attr) return "Atributo desconhecido"
  const map = {
    hair_color: "Cor do cabelo",
    vehicle: "Veículo",
    hobby: "Hobby",
    occupation: "Profissão",
    feature: "Característica marcante",
  }
  return map[attr] || attr
}

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
    suspects.value = normalizeSuspects(status.suspects)
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
  if (!canIssueWarrant.value || actionLoading.value) return
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
