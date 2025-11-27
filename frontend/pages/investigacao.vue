<!-- frontend/pages/investigacao.vue -->
<template>
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <main class="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <!-- Cabeçalho -->
      <header class="flex items-center justify-between gap-4">
        <div>
          <p class="text-xs tracking-[0.25em] text-sky-400 uppercase">
            IGI // International Geointelligence Initiative
          </p>
          <h1 class="text-2xl md:text-3xl font-bold text-slate-50">
            Operação Monaco · Modo Investigação
          </h1>
          <p class="text-sm text-slate-300 mt-1">
            Caso piloto: <span class="font-semibold">O Roubo do Meridiano Zero</span>
          </p>
        </div>

        <div
          class="rounded-2xl border border-sky-500/50 bg-sky-500/10 px-4 py-3 text-right"
        >
          <p class="text-xs text-slate-300">Cargo atual</p>
          <p class="text-sm font-semibold text-sky-300">
            Analista Cadete · Nível 1
          </p>
          <p class="mt-1 text-xs text-slate-400">
            Etapa {{ step + 1 }} de {{ totalSteps }}
          </p>
        </div>
      </header>

      <!-- Estado de carregamento inicial -->
      <div
        v-if="loadingInitial"
        class="mt-10 flex items-center justify-center text-slate-300"
      >
        Carregando dados do caso...
      </div>

      <div v-else class="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <!-- Painel da cidade -->
        <section
          class="rounded-2xl border border-slate-800 bg-slate-900/70 px-6 py-5 flex flex-col gap-4"
        >
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-xs text-slate-400 uppercase tracking-wide">
                Cidade atual
              </p>
              <h2 class="text-xl font-semibold text-slate-50">
                {{ currentCity?.name || "—" }}
              </h2>
              <p class="text-sm text-slate-300">
                {{ currentCity?.country || "" }}
              </p>
            </div>
            <div
              class="rounded-xl bg-slate-800/80 px-3 py-2 text-xs text-right text-slate-300"
            >
              <p>Segunda-feira, 9h00</p>
              <p class="text-slate-500">Horário aproximado · cosmético</p>
            </div>
          </div>

          <!-- “Ilustração” placeholder da cidade -->
          <div
            class="mt-2 flex h-48 items-center justify-center rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950"
          >
            <p class="text-xs text-slate-500 text-center px-4">
              Área reservada para arte da cidade (pixel art / visual retrô).
            </p>
          </div>

          <div class="mt-3">
            <p class="text-xs text-slate-400 uppercase tracking-wide">
              Referências
            </p>
            <ul class="mt-1 text-sm text-slate-300 list-disc list-inside space-y-0.5">
              <li v-for="landmark in currentCity?.landmarks || []" :key="landmark">
                {{ landmark }}
              </li>
              <li v-if="!currentCity?.landmarks?.length" class="italic text-slate-500">
                Sem pontos de referência cadastrados.
              </li>
            </ul>
          </div>
        </section>

        <!-- Painel de pistas e ações -->
        <section class="flex flex-col gap-4">
          <!-- Pista atual -->
          <div
            class="rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-4 flex flex-col gap-3"
          >
            <header class="flex items-center justify-between gap-3">
              <div>
                <p class="text-xs text-slate-400 uppercase tracking-wide">
                  Pista atual
                </p>
                <p class="text-xs text-slate-500">
                  Etapa {{ step + 1 }} · Pista {{ clueIndex + 1 }}
                </p>
              </div>
              <span
                v-if="loadingClue"
                class="text-xs text-slate-400"
              >
                Buscando nova pista...
              </span>
            </header>

            <p class="text-sm leading-relaxed text-slate-100 min-h-[80px]">
              <span v-if="currentClue">
                {{ currentClue }}
              </span>
              <span v-else class="text-slate-500 italic">
                Ainda não há pista carregada. Use o botão "Investigar" para obter informações.
              </span>
            </p>

            <p
              v-if="feedbackMessage"
              class="text-xs text-sky-300 border-t border-slate-800 pt-2"
            >
              {{ feedbackMessage }}
            </p>

            <p
              v-if="errorMessage"
              class="text-xs text-rose-400 border-t border-slate-800 pt-2"
            >
              {{ errorMessage }}
            </p>
          </div>

          <!-- Conexões -->
          <div
            class="rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-4 flex flex-col gap-3"
          >
            <header class="flex items-center justify-between gap-3">
              <div>
                <p class="text-xs text-slate-400 uppercase tracking-wide">
                  Cidades conectadas
                </p>
                <p class="text-xs text-slate-500">
                  Possíveis rotas a partir desta cidade.
                </p>
              </div>
              <span v-if="loadingConnections" class="text-xs text-slate-400">
                Carregando conexões...
              </span>
            </header>

            <div v-if="connections.length" class="space-y-2">
              <button
                v-for="option in connections"
                :key="option.cityId"
                type="button"
                class="w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors"
                :class="[
                  selectedCityId === option.cityId
                    ? 'border-sky-400 bg-sky-500/10 text-sky-100'
                    : 'border-slate-700 bg-slate-900 hover:border-sky-500/60 hover:bg-slate-800'
                ]"
                @click="selectedCityId = option.cityId"
              >
                <p class="font-semibold">
                  {{ option.name }}
                </p>
                <p class="text-xs text-slate-400">
                  {{ option.country }}
                </p>
              </button>
            </div>

            <p v-else class="text-xs text-slate-500 italic">
              Nenhuma conexão carregada. Use "Ver conexões" para listar as possíveis rotas.
            </p>
          </div>

          <!-- Ações -->
          <div
            class="mt-auto rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-4 flex flex-col gap-3"
          >
            <p class="text-xs text-slate-400 uppercase tracking-wide">
              Ações do agente
            </p>

            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-60"
                :disabled="loadingInitial || loadingClue"
                @click="handleInvestigate"
              >
                Investigar (nova pista)
              </button>

              <button
                type="button"
                class="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-60"
                :disabled="loadingInitial || loadingConnections"
                @click="handleShowConnections"
              >
                Ver conexões
              </button>

              <button
                type="button"
                class="rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60"
                :disabled="loadingInitial || loadingTravel"
                @click="handleTravel"
              >
                Viajar para cidade selecionada
              </button>
            </div>

            <p class="text-[11px] text-slate-500">
              Dica: primeiro colete pistas, depois veja as conexões e escolha com cuidado para onde viajar.
            </p>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue"
import {
  startGame,
  investigate,
  getConnections,
  travel,
} from "@/services/api"

const loadingInitial = ref(true)
const loadingClue = ref(false)
const loadingConnections = ref(false)
const loadingTravel = ref(false)

const step = ref(0)
const totalSteps = ref(0)
const currentCity = ref(null)

const currentClue = ref("")
const clueIndex = ref(0)

const connections = ref([])
const selectedCityId = ref(null)

const feedbackMessage = ref("")
const errorMessage = ref("")

async function loadInitialGame() {
  loadingInitial.value = true
  feedbackMessage.value = ""
  errorMessage.value = ""
  connections.value = []
  selectedCityId.value = null

  try {
    const data = await startGame()

    step.value = data.step ?? 0
    totalSteps.value = data.totalSteps ?? 0
    currentCity.value = data.currentCity ?? null
    currentClue.value = data.firstClue || ""
    clueIndex.value = data.clueIndex ?? 0
  } catch (err) {
    console.error(err)
    errorMessage.value =
      "Não foi possível iniciar o caso. Verifique se o backend está rodando."
  } finally {
    loadingInitial.value = false
  }
}

async function handleInvestigate() {
  if (loadingInitial.value) return

  loadingClue.value = true
  errorMessage.value = ""
  feedbackMessage.value = ""

  try {
    const data = await investigate(step.value, clueIndex.value)

    currentClue.value = data.clue || currentClue.value
    clueIndex.value = data.clueIndex ?? clueIndex.value

    if (!data.hasMore) {
      feedbackMessage.value =
        "Você já coletou todas as pistas disponíveis nesta cidade."
    }
  } catch (err) {
    console.error(err)
    errorMessage.value =
      "Erro ao buscar nova pista. Tente novamente em alguns instantes."
  } finally {
    loadingClue.value = false
  }
}

async function handleShowConnections() {
  if (loadingInitial.value) return

  loadingConnections.value = true
  errorMessage.value = ""
  feedbackMessage.value = ""

  try {
    const data = await getConnections(step.value)
    connections.value = data.options || []
    if (!connections.value.length) {
      feedbackMessage.value =
        "Nenhuma conexão disponível para esta etapa. Verifique a configuração do caso."
    }
  } catch (err) {
    console.error(err)
    errorMessage.value =
      "Erro ao carregar conexões. Verifique a API ou tente novamente."
  } finally {
    loadingConnections.value = false
  }
}

async function loadFirstClueForCurrentStep() {
  // truque: usamos clueIndex -1 para pegar a primeira pista da nova etapa
  loadingClue.value = true
  errorMessage.value = ""
  feedbackMessage.value = ""

  try {
    const data = await investigate(step.value, -1)
    currentClue.value = data.clue || ""
    clueIndex.value = data.clueIndex ?? 0
  } catch (err) {
    console.error(err)
    errorMessage.value =
      "Erro ao carregar a primeira pista da nova etapa."
  } finally {
    loadingClue.value = false
  }
}

async function handleTravel() {
  if (loadingInitial.value) return

  if (!selectedCityId.value) {
    errorMessage.value = "Selecione uma cidade antes de viajar."
    return
  }

  loadingTravel.value = true
  errorMessage.value = ""
  feedbackMessage.value = ""

  try {
    const data = await travel(step.value, selectedCityId.value)

    if (!data.correct) {
      errorMessage.value = data.message || "Cidade incorreta."
      return
    }

    // acerto
    feedbackMessage.value = data.message || "Boa dedução."
    step.value = data.nextStep ?? step.value
    currentCity.value = data.nextCity ?? currentCity.value
    connections.value = []
    selectedCityId.value = null

    // Se ainda houver etapas, buscar a primeira pista da nova etapa
    if (!data.isLast) {
      await loadFirstClueForCurrentStep()
    } else {
      feedbackMessage.value +=
        " Você chegou à cidade final. A tela de conclusão será implementada nas próximas tasks."
    }
  } catch (err) {
    console.error(err)
    errorMessage.value =
      "Erro ao processar a viagem. Verifique a API ou tente novamente."
  } finally {
    loadingTravel.value = false
  }
}

onMounted(() => {
  loadInitialGame()
})
</script>
