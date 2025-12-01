<template>
  <div class="min-h-screen bg-slate-950 text-slate-50">
    <div class="max-w-5xl mx-auto py-10 px-4 space-y-8">
      <header class="space-y-2">
        <h1 class="text-3xl font-bold">Operação Monaco — Casos Disponíveis</h1>
        <p class="text-slate-300 text-sm">
          Escolha um caso para investigar. Cada caso foi gerado dinamicamente com base na sua base de vilões.
        </p>
      </header>

      <div v-if="loading" class="text-slate-300">Carregando casos...</div>
      <div v-else-if="error" class="text-red-400 text-sm">
        {{ error }}
      </div>

      <div v-else>
        <div v-if="cases.length === 0" class="text-slate-400 text-sm">
          Nenhum caso disponível no momento.
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <article
            v-for="c in cases"
            :key="c.id"
            class="border border-slate-700 rounded-xl p-4 bg-slate-900/60 flex flex-col justify-between"
          >
            <div class="space-y-2">
              <h2 class="text-lg font-semibold">
                {{ c.title }}
              </h2>
              <p class="text-sm text-slate-300 line-clamp-3">
                {{ c.summary }}
              </p>
              <p class="text-xs text-slate-400">
                Dificuldade:
                <span class="font-semibold capitalize">{{ c.difficulty }}</span>
                · Status:
                <span
                  class="font-semibold"
                  :class="c.status === 'in_progress' ? 'text-amber-300' : 'text-emerald-300'"
                >
                  {{ c.status }}
                </span>
              </p>
              <p class="text-[11px] text-slate-500">
                Criado em:
                {{ formatDate(c.created_at) }}
              </p>
            </div>

            <div class="mt-4 flex justify-end">
              <button
                class="px-3 py-2 text-sm rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition disabled:opacity-50"
                :disabled="startingId === c.id"
                @click="onStartCase(c.id)"
              >
                {{ startingId === c.id ? "Iniciando..." : "Iniciar investigação" }}
              </button>
            </div>
          </article>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { useRouter } from "#imports"
import { getAvailableCases, startCase } from "@/services/gameApi"

const router = useRouter()

const cases = ref([])
const loading = ref(false)
const error = ref("")
const startingId = ref(null)

function formatDate(value) {
  if (!value) return "-"
  const d = new Date(value)
  return d.toLocaleString("pt-BR")
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

async function onStartCase(caseId) {
  startingId.value = caseId
  error.value = ""
  try {
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
