<template>
  <div class="min-h-screen bg-slate-950 text-slate-50">
    <div class="max-w-4xl mx-auto py-10 px-4 space-y-6">
      <header class="space-y-2">
        <button
          class="text-xs text-slate-400 hover:text-slate-200 mb-2"
          @click="goBack"
        >
          ← Voltar para casos
        </button>

        <h1 class="text-2xl font-bold">Resultado da Investigação</h1>

        <p v-if="caseData" class="text-sm text-slate-300">
          {{ caseData.title }}
        </p>

        <p v-if="statusText" class="text-sm font-semibold" :class="statusClass">
          {{ statusText }}
        </p>
      </header>

      <div v-if="loading" class="text-slate-300 text-sm">
        Carregando resultado do caso...
      </div>

      <div v-else-if="error" class="text-red-400 text-sm">
        {{ error }}
      </div>

      <div v-else-if="caseData" class="space-y-6">
        <!-- Culpado -->
        <section class="border border-slate-800 rounded-xl p-4 bg-slate-900/70 space-y-2">
          <h2 class="text-sm font-semibold">Culpado</h2>
          <p v-if="guiltySuspect" class="text-sm text-slate-200">
            O verdadeiro culpado era
            <span class="font-bold text-emerald-300">
              {{ guiltySuspect.name_snapshot }}
            </span>,
            {{ guiltySuspect.occupation_snapshot }} que gosta de
            {{ guiltySuspect.hobby_snapshot }}.
          </p>
          <p v-else class="text-xs text-slate-400">
            Não foi possível identificar o culpado a partir dos dados do caso.
          </p>
        </section>

        <!-- Pistas -->
        <section class="border border-slate-800 rounded-xl p-4 bg-slate-900/60 space-y-2">
          <h2 class="text-sm font-semibold">Pistas do dossiê</h2>
          <div v-if="clues.length === 0" class="text-xs text-slate-400">
            Nenhuma pista registrada nesse caso.
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
        </section>

        <!-- Steps -->
        <section class="border border-slate-800 rounded-xl p-4 bg-slate-900/60 space-y-2">
          <h2 class="text-sm font-semibold">Linha do tempo da investigação</h2>
          <div v-if="steps.length === 0" class="text-xs text-slate-400">
            Nenhum passo foi recuperado para esse caso.
          </div>
          <ol v-else class="space-y-2 text-xs">
            <li
              v-for="s in steps"
              :key="s.id"
              class="border border-slate-800 rounded-lg px-2 py-2"
            >
              <p class="font-mono text-slate-400">
                Step {{ s.step_order }} · {{ s.step_type }} · {{ s.location_name || "Local" }}
              </p>
              <p class="text-slate-200">
                {{ s.description }}
              </p>
            </li>
          </ol>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { useRoute, useRouter } from "#imports"
import { getCaseStatus } from "@/services/gameApi"

const route = useRoute()
const router = useRouter()

const caseId = Number(route.params.id)

const loading = ref(false)
const error = ref("")

const caseData = ref(null)
const clues = ref([])
const suspects = ref([])
const steps = ref([])

const statusText = computed(() => {
  if (!caseData.value) return ""
  if (caseData.value.status === "solved") {
    return "Caso resolvido com sucesso. Você prendeu o culpado."
  }
  if (caseData.value.status === "failed") {
    return "Caso encerrado com suspeito errado. O culpado escapou."
  }
  return `Caso com status: ${caseData.value.status}`
})

const statusClass = computed(() => {
  if (!caseData.value) return "text-slate-300"
  if (caseData.value.status === "solved") return "text-emerald-300"
  if (caseData.value.status === "failed") return "text-red-300"
  return "text-slate-300"
})

const guiltySuspect = computed(() =>
  suspects.value.find((s) => s.is_guilty === 1),
)

function goBack() {
  router.push("/cases")
}

async function loadResult() {
  loading.value = true
  error.value = ""
  try {
    const status = await getCaseStatus(caseId, 1)
    caseData.value = status.case
    clues.value = status.clues || []
    suspects.value = status.suspects || []

    // steps vêm do debug, não do /status — aqui deixo placeholder simples por enquanto.
    // Se quiser, mais tarde a gente faz uma rota que traz steps junto.
    steps.value = [] // Pode preencher manualmente com /dev/cases/:id/debug depois, se quiser.
  } catch (err) {
    error.value = err.message || "Erro ao carregar resultado do caso."
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadResult()
})
</script>