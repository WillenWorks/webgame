<template>
  <div class="min-h-screen bg-slate-950 text-slate-50">
    <div class="max-w-6xl mx-auto py-8 px-4 space-y-6">
      <header class="flex items-start justify-between gap-4">
        <div class="space-y-2">
          <button
            class="text-xs text-slate-400 hover:text-slate-200 mb-2"
            @click="goBack"
          >
            ← Voltar para casos
          </button>

          <h1 class="text-2xl font-bold">
            {{ caseData?.title || "Investigação" }}
          </h1>
          <p class="text-sm text-slate-300 max-w-2xl">
            {{ caseData?.summary }}
          </p>
          <p class="text-xs text-slate-400">
            Dificuldade:
            <span class="font-semibold capitalize">{{ caseData?.difficulty }}</span>
            · Status:
            <span
              class="font-semibold"
              :class="caseData?.status === 'in_progress' ? 'text-amber-300' : 'text-emerald-300'"
            >
              {{ caseData?.status }}
            </span>
          </p>
        </div>

        <div class="text-right space-y-1">
          <p class="text-xs uppercase tracking-wide text-slate-400">
            Progresso
          </p>
          <p class="text-sm font-semibold">
            Passo {{ progress.current }} de {{ progress.total || "?" }}
          </p>
          <div class="w-40 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              class="h-full bg-emerald-500 transition-all"
              :style="{ width: progressPercent + '%' }"
            ></div>
          </div>
        </div>
      </header>

      <div v-if="loading" class="text-slate-300 text-sm">Carregando investigação...</div>
      <div v-else-if="error" class="text-red-400 text-sm">{{ error }}</div>

      <div v-else class="grid gap-6 lg:grid-cols-3">
        <!-- Coluna principal: Step atual -->
        <section class="lg:col-span-2 space-y-4">
          <div class="border border-slate-700 rounded-xl p-4 bg-slate-900/80 space-y-3">
            <p class="text-xs text-slate-400 font-mono">
              STEP {{ currentStep?.step_order }} ·
              <span class="uppercase">{{ currentStep?.step_type }}</span>
            </p>
            <h2 class="text-lg font-semibold flex items-center gap-2">
              Local:
              <span class="text-emerald-300">
                {{ currentStep?.location_name || "Desconhecido" }}
              </span>
              <span class="text-xs text-slate-400">
                ({{ currentStep?.location_country || "—" }})
              </span>
            </h2>
            <p class="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
              {{ currentStep?.description }}
            </p>
          </div>

          <!-- Mapa / placeholder -->
          <div class="border border-slate-800 rounded-xl p-4 bg-slate-900/60">
            <p class="text-xs text-slate-400 mb-2">Mapa / Rota (placeholder)</p>
            <div class="h-40 flex items-center justify-center text-slate-500 text-xs border border-dashed border-slate-700 rounded-lg">
              Aqui no futuro entra o mapa / visualização de rota entre cidades.
            </div>
          </div>

          <!-- Pistas -->
          <div class="border border-slate-800 rounded-xl p-4 bg-slate-900/60">
            <h3 class="text-sm font-semibold mb-2">Pistas descobertas</h3>
            <div v-if="clues.length === 0" class="text-xs text-slate-400">
              Nenhuma pista descoberta ainda. Continue investigando.
            </div>
            <ul v-else class="space-y-1 text-xs">
              <li
                v-for="clue in clues"
                :key="clue.id"
                class="flex items-center justify-between gap-2 border border-slate-800 rounded-lg px-2 py-1"
              >
                <span class="font-mono text-slate-300">
                  {{ clue.attribute_name }}:
                  <span class="font-semibold text-emerald-300">
                    {{ clue.attribute_value }}
                  </span>
                </span>
                <span class="text-[10px] text-slate-500">
                  Step {{ clue.step_order || "?" }}
                </span>
              </li>
            </ul>
          </div>
        </section>

        <!-- Coluna lateral: Suspeitos + Ações -->
        <aside class="space-y-4">
          <div class="border border-slate-800 rounded-xl p-4 bg-slate-900/70">
            <h3 class="text-sm font-semibold mb-2">Suspeitos</h3>
            <div v-if="suspects.length === 0" class="text-xs text-slate-400">
              Nenhum suspeito carregado.
            </div>
            <div class="space-y-2 max-h-72 overflow-y-auto pr-1">
              <div
                v-for="s in suspects"
                :key="s.id"
                class="border border-slate-800 rounded-lg px-2 py-2 text-[11px] space-y-1 bg-slate-950/60"
              >
                <p class="font-semibold text-slate-100">
                  {{ s.name_snapshot }}
                  <span v-if="s.is_guilty" class="text-[10px] text-emerald-400 ml-1">
                    (marcado como culpado no debug)
                  </span>
                </p>
                <p class="text-slate-300">
                  {{ s.occupation_snapshot }} · {{ s.hobby_snapshot }}
                </p>
                <p class="text-slate-400">
                  Cabelo: {{ s.hair_color_snapshot }} · Veículo: {{ s.vehicle_snapshot }}
                </p>
                <p class="text-slate-500">
                  Traço: {{ s.feature_snapshot }}
                </p>
              </div>
            </div>
          </div>

          <!-- Ações -->
          <div class="border border-slate-800 rounded-xl p-4 bg-slate-900/70 space-y-3">
            <h3 class="text-sm font-semibold">Ações</h3>

            <button
              class="w-full px-3 py-2 text-sm rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold transition disabled:opacity-50"
              :disabled="actionLoading || reachedEnd || caseData?.status !== 'in_progress'"
              @click="onNextStep"
            >
              <span v-if="actionLoading">Avançando...</span>
              <span v-else-if="reachedEnd">Último passo alcançado</span>
              <span v-else>Avançar investigação</span>
            </button>

            <button
              class="w-full px-3 py-2 text-sm rounded-lg border border-emerald-500 text-emerald-300 hover:bg-emerald-500/10 font-semibold transition disabled:opacity-50"
              :disabled="!canIssueWarrant || caseData?.status !== 'in_progress'"
              @click="openWarrantModal"
            >
              Emitir mandato de prisão
            </button>

            <p class="text-[11px] text-slate-500">
              Mandato disponível:
              <span
                :class="canIssueWarrant ? 'text-emerald-300' : 'text-slate-400'"
                class="font-semibold"
              >
                {{ canIssueWarrant ? "Sim" : "Não" }}
              </span>
            </p>
          </div>
        </aside>
      </div>

      <!-- Modal de Mandado -->
      <WarrantModal
        v-if="showWarrant"
        :suspects="suspects"
        :case-id="caseId"
        @close="showWarrant = false"
        @completed="onWarrantCompleted"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { useRoute, useRouter } from "#imports"
import { getCaseStatus, nextStep } from "@/services/gameApi"
import WarrantModal from "@/components/WarrantModal.vue"

const route = useRoute()
const router = useRouter()

const caseId = Number(route.params.id)

const loading = ref(false)
const error = ref("")

const caseData = ref(null)
const currentStep = ref(null)
const progress = ref({ current: 0, total: 0 })
const clues = ref([])
const suspects = ref([])
const canIssueWarrant = ref(false)
const reachedEnd = ref(false)

const actionLoading = ref(false)
const showWarrant = ref(false)

const progressPercent = computed(() => {
  if (!progress.value.total || progress.value.total === 0) return 0
  return Math.min(
    100,
    Math.round((progress.value.current / progress.value.total) * 100),
  )
})

function goBack() {
  router.push("/cases")
}

async function loadStatus() {
  loading.value = true
  error.value = ""
  try {
    const status = await getCaseStatus(caseId, 1)
    caseData.value = status.case
    currentStep.value = status.currentStep
    progress.value = status.progress
    clues.value = status.clues || []
    suspects.value = status.suspects || []
    canIssueWarrant.value = !!status.canIssueWarrant
    reachedEnd.value =
      status.progress &&
      status.progress.total > 0 &&
      status.progress.current >= status.progress.total
  } catch (err) {
    error.value = err.message || "Erro ao carregar status da investigação."
  } finally {
    loading.value = false
  }
}

async function onNextStep() {
  actionLoading.value = true
  error.value = ""
  try {
    const status = await nextStep(caseId, 1)
    caseData.value = status.case
    currentStep.value = status.currentStep
    progress.value = status.progress
    clues.value = status.clues || []
    suspects.value = status.suspects || []
    canIssueWarrant.value = !!status.canIssueWarrant
    reachedEnd.value = !!status.reachedEnd
  } catch (err) {
    error.value = err.message || "Erro ao avançar investigação."
  } finally {
    actionLoading.value = false
  }
}

function openWarrantModal() {
  showWarrant.value = true
}

function onWarrantCompleted() {
  // Depois de emitir mandado, vamos para a tela de resultado
  showWarrant.value = false
  router.push(`/cases/${caseId}/result`)
}

onMounted(() => {
  loadStatus()
})
</script>
