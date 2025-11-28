<!-- frontend/pages/game.vue -->
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
            Caso piloto:
            <span class="font-semibold">O Roubo do Meridiano Zero</span>
          </p>
        </div>

        <div class="text-right text-xs text-slate-400">
          <p>
            Etapa
            <span class="font-semibold text-sky-300">
              {{ step + 1 }}
            </span>
            de
            <span class="font-semibold">{{ totalSteps + 1 }}</span>
          </p>
          <p v-if="currentCity" class="mt-1">
            Cidade atual:
            <span class="font-semibold text-slate-100">
              {{ currentCity.name }} — {{ currentCity.country }}
            </span>
          </p>
        </div>
      </header>

      <!-- Mensagens globais -->
      <section v-if="errorMessage || feedbackMessage" class="space-y-2">
        <p
          v-if="errorMessage"
          class="text-sm rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2 text-red-200"
        >
          {{ errorMessage }}
        </p>
        <p
          v-if="feedbackMessage"
          class="text-sm rounded-lg border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-emerald-200"
        >
          {{ feedbackMessage }}
        </p>
      </section>

      <!-- Layout principal -->
      <div class="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <!-- Coluna esquerda: contexto e ações -->
        <section class="space-y-4">
          <!-- Bloco: Status da cidade -->
          <div
            class="rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-4 flex flex-col gap-3"
          >
            <header class="flex items-center justify-between gap-3">
              <div>
                <p class="text-xs text-slate-400 uppercase tracking-wide">
                  Cidade atual
                </p>
                <p class="text-lg font-semibold text-slate-50">
                  {{ currentCity ? currentCity.name : "Carregando..." }}
                </p>
                <p v-if="currentCity" class="text-xs text-slate-400">
                  {{ currentCity.country }}
                </p>
              </div>
              <span
                v-if="loadingInitial"
                class="text-xs text-slate-400"
              >
                Carregando caso...
              </span>
              <span
                v-else-if="caseFinished"
                class="text-xs px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300"
              >
                Caso concluído
              </span>
            </header>

            <div v-if="currentCity" class="mt-2">
              <p class="text-xs text-slate-400 mb-1">Pontos marcantes:</p>
              <ul class="text-xs text-slate-300 list-disc list-inside space-y-1">
                <li v-for="landmark in currentCity.landmarks" :key="landmark">
                  {{ landmark }}
                </li>
              </ul>
            </div>
          </div>

          <!-- Bloco: Pista atual -->
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
              v-if="!loadingClue && !caseFinished"
              class="text-[11px] text-slate-500"
            >
              Você pode investigar múltiplas vezes na mesma cidade até esgotar
              as pistas disponíveis.
            </p>
          </div>

          <!-- Bloco: Ações principais -->
          <div
            class="rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-4 flex flex-col gap-3"
          >
            <header class="flex items-center justify-between gap-3">
              <p class="text-xs text-slate-400 uppercase tracking-wide">
                Ações do agente
              </p>
              <span v-if="loadingTravel || loadingConnections" class="text-xs text-slate-400">
                Processando...
              </span>
            </header>

            <div class="flex flex-wrap gap-3">
              <button
                type="button"
                class="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-60"
                :disabled="loadingInitial || loadingClue || caseFinished"
                @click="handleInvestigate"
              >
                Investigar (nova pista)
              </button>

              <button
                type="button"
                class="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-60"
                :disabled="loadingInitial || loadingConnections || caseFinished"
                @click="handleShowConnections"
              >
                Ver conexões
              </button>

              <button
                type="button"
                class="rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60"
                :disabled="
                  loadingInitial ||
                  loadingTravel ||
                  !selectedCityId ||
                  caseFinished
                "
                @click="handleTravel"
              >
                Viajar para cidade selecionada
              </button>
            </div>

            <p class="text-[11px] text-slate-500">
              Dica: primeiro colete pistas, depois veja as conexões e escolha com
              cuidado para onde viajar.
            </p>
          </div>
        </section>

        <!-- Coluna direita: conexões e seleção de destino -->
        <section
          class="rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-4 flex flex-col gap-4"
        >
          <header class="flex items-center justify-between gap-3">
            <div>
              <p class="text-xs text-slate-400 uppercase tracking-wide">
                Possíveis destinos
              </p>
              <p class="text-xs text-slate-500">
                Escolha uma cidade com base nas pistas coletadas.
              </p>
            </div>
            <span v-if="loadingConnections" class="text-xs text-slate-400">
              Carregando conexões...
            </span>
          </header>

          <div v-if="!connections.length" class="text-xs text-slate-500">
            Nenhuma conexão carregada ainda. Clique em "Ver conexões" para obter
            possíveis destinos.
          </div>

          <div v-else class="space-y-3">
            <button
              v-for="option in connections"
              :key="option.cityId"
              type="button"
              class="w-full rounded-xl border px-4 py-3 text-left text-sm transition
                     border-slate-700 bg-slate-900/70 hover:bg-slate-800
                     flex items-center justify-between gap-3
                     [&.active]:border-sky-400 [&.active]:bg-sky-950/40"
              :class="{
                'border-sky-400 bg-sky-950/40':
                  selectedCityId === option.cityId,
              }"
              @click="handleSelectCity(option.cityId)"
            >
              <div>
                <p class="font-semibold text-slate-50">
                  {{ option.name }}
                </p>
                <p class="text-xs text-slate-400">
                  {{ option.country }}
                </p>
              </div>
              <span
                v-if="selectedCityId === option.cityId"
                class="text-[10px] px-2 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/60"
              >
                Selecionada
              </span>
            </button>
          </div>
        </section>
      </div>
    </main>

    <!-- Modal de conclusão do caso -->
    <div
      v-if="showEndModal && caseResult"
      class="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
    >
      <div
        class="bg-slate-900 border border-emerald-500/40 rounded-2xl p-8 max-w-md w-full shadow-2xl space-y-4"
      >
        <header class="space-y-1">
          <p class="text-xs tracking-[0.25em] text-emerald-400 uppercase">
            Caso concluído
          </p>
          <h2 class="text-2xl font-bold text-slate-50">
            Operação bem-sucedida, agente.
          </h2>
        </header>

        <p class="text-sm text-slate-200">
          Você capturou
          <span class="font-semibold">Carlos "Monaco" Navarro</span>
          na cidade de
          <span class="font-semibold">
            {{ caseResult.finalCity?.name }} — {{ caseResult.finalCity?.country }}
          </span>.
        </p>

        <ul class="text-xs text-slate-300 space-y-1">
          <li>
            Etapa final:
            <span class="font-semibold">
              {{ (caseResult.finalStep ?? 0) + 1 }} de {{ totalSteps + 1 }}
            </span>
          </li>
        </ul>

        <p class="text-xs text-slate-400">
          A IGI registrará este caso como parte do seu dossiê de agente. Você pode
          reiniciar a investigação para treinar novamente o raciocínio.
        </p>

        <div class="pt-4 flex justify-end gap-3">
          <button
            type="button"
            class="px-4 py-2 text-xs rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700"
            @click="showEndModal = false"
          >
            Fechar
          </button>
          <button
            type="button"
            class="px-4 py-2 text-xs rounded-xl bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400"
            @click="handleRestart"
          >
            Reiniciar investigação
          </button>
        </div>
      </div>
    </div>
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

// Estados de carregamento
const loadingInitial = ref(true)
const loadingClue = ref(false)
const loadingConnections = ref(false)
const loadingTravel = ref(false)

// Estado principal do jogo
const step = ref(0)
const totalSteps = ref(0)
const currentCity = ref(null)
const currentClue = ref("")
const clueIndex = ref(0)
const connections = ref([])
const selectedCityId = ref(null)

// Mensagens
const errorMessage = ref("")
const feedbackMessage = ref("")

// Estados de finalização de caso
const caseFinished = ref(false)
const caseResult = ref(null)
const showEndModal = ref(false)

// -----------------------------------------------------------------------------
// Funções auxiliares de carregamento
// -----------------------------------------------------------------------------
async function loadInitialGame() {
  loadingInitial.value = true
  errorMessage.value = ""
  feedbackMessage.value = ""
  caseFinished.value = false
  caseResult.value = null
  showEndModal.value = false
  connections.value = []
  selectedCityId.value = null
  currentClue.value = ""
  clueIndex.value = 0

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

async function loadFirstClueForCurrentStep() {
  loadingClue.value = true
  errorMessage.value = ""
  feedbackMessage.value = ""

  try {
    const data = await investigate(step.value, -1)
    currentClue.value = data.clue || ""
    clueIndex.value = data.clueIndex ?? 0
  } catch (err) {
    console.error(err)
    errorMessage.value = "Erro ao carregar a primeira pista da nova etapa."
  } finally {
    loadingClue.value = false
  }
}

// -----------------------------------------------------------------------------
// Ações do jogador
// -----------------------------------------------------------------------------
async function handleInvestigate() {
  if (loadingInitial.value || caseFinished.value) return

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
      "Erro ao investigar. Verifique a API ou tente novamente."
  } finally {
    loadingClue.value = false
  }
}

async function handleShowConnections() {
  if (loadingInitial.value || caseFinished.value) return

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

function handleSelectCity(cityId) {
  if (caseFinished.value) return
  selectedCityId.value = cityId
}

async function handleTravel() {
  if (!selectedCityId.value || caseFinished.value) return

  loadingTravel.value = true
  errorMessage.value = ""
  feedbackMessage.value = ""

  try {
    const data = await travel(step.value, selectedCityId.value)

    feedbackMessage.value = data.message || ""

    if (!data.correct) {
      // escolha incorreta: não mexe em step, só informa
      return
    }

    // Caso finalizado
    if (data.caseFinished) {
      caseFinished.value = true
      caseResult.value = data
      showEndModal.value = true
      // atualiza cidade também, se backend enviar
      if (data.finalCity) {
        currentCity.value = data.finalCity
      }
      connections.value = []
      selectedCityId.value = null
      return
    }

    // Continuidade normal da rota
    step.value = data.nextStep ?? step.value
    currentCity.value = data.nextCity ?? currentCity.value
    connections.value = []
    selectedCityId.value = null

    // Carrega primeira pista da nova etapa
    await loadFirstClueForCurrentStep()
  } catch (err) {
    console.error(err)
    errorMessage.value =
      "Erro ao processar a viagem. Verifique a API ou tente novamente."
  } finally {
    loadingTravel.value = false
  }
}

async function handleRestart() {
  await loadInitialGame()
}

onMounted(() => {
  loadInitialGame()
})
</script>
