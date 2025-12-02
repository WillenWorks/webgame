<template>
  <div class="space-y-6">
    <header class="space-y-2">
      <h1 class="text-2xl font-bold">
        Casos disponíveis
      </h1>
      <p class="text-sm text-slate-300 max-w-2xl">
        Escolha um caso para investigar. Cada caso é gerado dinamicamente com base na base
        de vilões e locais cadastrados no sistema da IGI.
      </p>
    </header>

    <InfoSectionCard
      title="Centro de casos"
      :subtitle="casesSubtitle"
      :badge="casesBadge"
    >
      <template #default>
        <div v-if="loading" class="text-slate-300 text-sm">
          Carregando casos...
        </div>

        <div v-else-if="error" class="text-sm text-red-400">
          {{ error }}
        </div>

        <div v-else-if="cases.length === 0" class="text-sm text-slate-300">
          Nenhum caso disponível no momento. Tente novamente após sincronizar o banco
          ou rodar o gerador de casos.
        </div>

        <div v-else class="space-y-3">
          <article
            v-for="c in cases"
            :key="c.id"
            class="border border-slate-700/80 bg-slate-900/70 rounded-xl p-4 md:p-5 flex flex-col gap-2 hover:border-sky-500/70 transition"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="space-y-1">
                <h2 class="text-base md:text-lg font-semibold text-slate-50">
                  {{ c.title || `Caso #${c.id}` }}
                </h2>
                <p class="text-xs md:text-sm text-slate-300">
                  {{ c.summary || c.description || "Caso sem resumo detalhado. Ideal para testes de fluxo." }}
                </p>
              </div>

              <div class="flex flex-col items-end gap-1 shrink-0 text-right">
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                  :class="difficultyPillClass(c.difficulty)"
                >
                  {{ difficultyLabel(c.difficulty) }}
                </span>
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                  :class="statusPillClass(c.status)"
                >
                  {{ statusLabel(c.status) }}
                </span>
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800 mt-2">
              <p class="text-xs text-slate-400">
                Duração estimada: curta · Investigação linear com passos definidos.
              </p>

              <button
                type="button"
                class="inline-flex items-center justify-center rounded-lg bg-sky-600 hover:bg-sky-500 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
                :disabled="startingId === c.id"
                @click="handleStartCase(c.id, c.status)"
              >
                <span v-if="startingId === c.id">
                  Iniciando...
                </span>
                <span v-else-if="c.status === 'in_progress'">
                  Retomar investigação
                </span>
                <span v-else-if="c.status === 'solved'">
                  Revisar caso
                </span>
                <span v-else>
                  Iniciar investigação
                </span>
              </button>
            </div>
          </article>
        </div>
      </template>
    </InfoSectionCard>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import InfoSectionCard from "@/components/InfoSectionCard.vue"
import { getAvailableCases, startCase } from "@/services/gameApi"

const router = useRouter()

const cases = ref([])
const loading = ref(false)
const error = ref("")
const startingId = ref(null)

const casesBadge = computed(() => {
  if (!cases.value.length) return ""
  return `${cases.value.length} caso${cases.value.length > 1 ? "s" : ""}`
})

const casesSubtitle = computed(
  () =>
    "A lista abaixo mostra os casos que o seu agente pode assumir neste momento."
)

function difficultyLabel(diff) {
  if (!diff) return "Dificuldade indefinida"
  const d = String(diff).toLowerCase()
  if (d.includes("easy") || d === "1") return "Fácil"
  if (d.includes("medium") || d === "2") return "Média"
  if (d.includes("hard") || d === "3") return "Difícil"
  return diff
}

function difficultyPillClass(diff) {
  const d = String(diff || "").toLowerCase()
  if (d.includes("easy") || d === "1") {
    return "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
  }
  if (d.includes("medium") || d === "2") {
    return "bg-amber-500/10 text-amber-300 border border-amber-500/40"
  }
  if (d.includes("hard") || d === "3") {
    return "bg-rose-500/10 text-rose-300 border border-rose-500/40"
  }
  return "bg-slate-700/40 text-slate-200 border border-slate-500/50"
}

function statusLabel(status) {
  if (!status) return "Status desconhecido"
  const s = String(status).toLowerCase()
  if (s === "available") return "Disponível"
  if (s === "in_progress") return "Em andamento"
  if (s === "solved") return "Resolvido"
  if (s.includes("failed")) return "Falhou"
  return status
}

function statusPillClass(status) {
  const s = String(status || "").toLowerCase()
  if (s === "available") {
    return "bg-sky-500/10 text-sky-300 border border-sky-500/40"
  }
  if (s === "in_progress") {
    return "bg-violet-500/10 text-violet-300 border border-violet-500/40"
  }
  if (s === "solved") {
    return "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
  }
  if (s.includes("failed")) {
    return "bg-rose-500/10 text-rose-300 border border-rose-500/40"
  }
  return "bg-slate-700/40 text-slate-200 border border-slate-500/50"
}

async function loadCases() {
  loading.value = true
  error.value = ""
  try {
    const data = await getAvailableCases(1)
    cases.value = data || []
  } catch (err) {
    error.value = err.message || "Erro ao carregar casos."
  } finally {
    loading.value = false
  }
}

async function handleStartCase(caseId, status) {
  error.value = ""
  startingId.value = caseId

  try {
    // Se o caso já estiver em andamento ou resolvido, apenas navega
    if (status === "in_progress" || status === "solved") {
      router.push(`/cases/${caseId}/investigate`)
      return
    }

    await startCase(caseId, 1)
    router.push(`/cases/${caseId}/investigate`)
  } catch (err) {
    error.value = err.message || "Erro ao iniciar caso."
  } finally {
    startingId.value = null
  }
}

onMounted(() => {
  loadCases()
})
</script>
