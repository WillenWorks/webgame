<template>
  <div class="space-y-6">
    <header class="space-y-2">
      <button
        type="button"
        class="text-xs text-slate-400 hover:text-slate-200 mb-1 inline-flex items-center gap-1"
        @click="goBack"
      >
        <span>←</span>
        <span>Voltar para casos</span>
      </button>

      <h1 class="text-2xl font-bold">
        Relatório da investigação
      </h1>

      <p v-if="caseData" class="text-sm text-slate-300">
        {{ caseData.title }}
      </p>
      <p v-else class="text-sm text-slate-300">
        Caso não encontrado. Este relatório mostra o último estado conhecido da investigação.
      </p>
    </header>

    <div v-if="loading" class="text-sm text-slate-300">
      Carregando resultado do caso...
    </div>

    <div v-else-if="error" class="text-sm text-red-400">
      {{ error }}
    </div>

    <div v-else-if="!caseData" class="text-sm text-slate-300">
      Não foi possível carregar os dados do caso. Verifique o backend ou tente novamente.
    </div>

    <div v-else class="space-y-5">
      <InfoSectionCard
        title="Resumo do caso"
        :badge="statusBadge"
        :subtitle="statusText"
      >
        <div class="space-y-2 text-sm">
          <p class="text-slate-300">
            <span class="text-slate-400">Título:</span>
            <span class="font-semibold"> {{ caseData.title }} </span>
          </p>

          <p v-if="caseData.villain_name" class="text-slate-300">
            <span class="text-slate-400">Vilão-alvo:</span>
            <span class="font-semibold">
              {{ caseData.villain_name }}
            </span>
          </p>

          <p v-if="caseData.resolution_notes" class="text-slate-300">
            <span class="text-slate-400">Notas do sistema:</span>
            <span> {{ caseData.resolution_notes }} </span>
          </p>

          <p v-if="caseData.finished_at" class="text-slate-300">
            <span class="text-slate-400">Finalizado em:</span>
            <span> {{ formatDate(caseData.finished_at) }} </span>
          </p>

          <p class="text-xs text-slate-500">
            Informações adicionais (como histórico completo de etapas, viagens e mandados) podem ser expandidas
            em versões futuras com uma rota dedicada a logs detalhados.
          </p>
        </div>
      </InfoSectionCard>

      <InfoSectionCard
        title="Desempenho operacional"
        subtitle="Dados consolidados desta operação"
      >
        <div class="grid gap-4 md:grid-cols-3 text-sm">
          <div class="space-y-1">
            <p class="text-xs text-slate-400 uppercase tracking-wide">
              Resultado
            </p>
            <p class="font-semibold" :class="statusColorClass">
              {{ statusLabel }}
            </p>
          </div>

          <div class="space-y-1">
            <p class="text-xs text-slate-400 uppercase tracking-wide">
              Pontuação obtida
            </p>
            <p class="font-semibold text-slate-100">
              {{ scoreText }}
            </p>
          </div>

          <div class="space-y-1">
            <p class="text-xs text-slate-400 uppercase tracking-wide">
              Impacto na reputação
            </p>
            <p class="font-semibold" :class="reputationColorClass">
              {{ reputationText }}
            </p>
          </div>
        </div>
      </InfoSectionCard>

      <InfoSectionCard
        title="Pistas e suspeitos"
        subtitle="Resumo do que foi consolidado ao final do caso"
      >
        <div class="grid gap-4 md:grid-cols-2 text-sm">
          <div>
            <h3 class="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1">
              Pistas principais
            </h3>
            <div v-if="clues.length === 0" class="text-xs text-slate-400">
              Pistas não disponíveis para este relatório. Isso pode significar que o caso foi encerrado
              antes da coleta consolidada ou que o backend ainda não está retornando o histórico completo.
            </div>
            <ul v-else class="space-y-1 text-xs">
              <li
                v-for="(clue, idx) in clues"
                :key="clue.id || idx"
                class="border border-slate-700/80 bg-slate-900/70 rounded px-2 py-1"
              >
                <p class="text-[11px] text-slate-400">
                  {{ clue.attribute_name || "Pista" }}
                </p>
                <p class="text-slate-200">
                  {{ clue.attribute_value || clue.text || JSON.stringify(clue) }}
                </p>
              </li>
            </ul>
          </div>

          <div>
            <h3 class="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-1">
              Suspeitos envolvidos
            </h3>
            <div v-if="suspects.length === 0" class="text-xs text-slate-400">
              Nenhum suspeito consolidado no relatório final. Em futuros ajustes, esta seção pode recuperar a
              lista de suspeitos da rota de status.
            </div>
            <ul v-else class="space-y-1 text-xs">
              <li
                v-for="sus in suspects"
                :key="sus.id"
                class="border border-slate-700/80 bg-slate-900/70 rounded px-2 py-1"
              >
                <p class="text-slate-200 font-semibold">
                  {{ sus.name || "Suspeito" }}
                  <span v-if="sus.codename" class="text-[10px] text-sky-300 ml-1">
                    ({{ sus.codename }})
                  </span>
                </p>
                <p class="text-slate-300">
                  <span class="text-slate-400">Profissão:</span>
                  <span> {{ sus.occupation || "Não informada" }} </span>
                </p>
                <p class="text-slate-300">
                  <span class="text-slate-400">Veículo:</span>
                  <span> {{ sus.vehicle || "Desconhecido" }} </span>
                </p>
              </li>
            </ul>
          </div>
        </div>
      </InfoSectionCard>

      <div class="pt-2">
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg bg-sky-600 hover:bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition"
          @click="goBack"
        >
          Voltar para lista de casos
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import InfoSectionCard from "@/components/InfoSectionCard.vue"
import { getCaseStatus } from "@/services/gameApi"

const route = useRoute()
const router = useRouter()

const caseId = Number(route.params.id)

const loading = ref(false)
const error = ref("")
const caseData = ref(null)
const clues = ref([])
const suspects = ref([])

const statusBadge = computed(() => {
  if (!caseData.value?.status) return ""
  const s = String(caseData.value.status).toLowerCase()
  if (s === "solved") return "Caso resolvido"
  if (s === "failed_time") return "Tempo esgotado"
  if (s === "failed_wrong_suspect") return "Mandado incorreto"
  return caseData.value.status
})

const statusText = computed(() => {
  if (!caseData.value?.status) return "Status da investigação indefinido."
  const s = String(caseData.value.status).toLowerCase()
  if (s === "solved") return "O vilão foi capturado com sucesso. Bom trabalho, agente."
  if (s === "failed_time") return "A investigação excedeu o limite de tempo permitido pelo protocolo."
  if (s === "failed_wrong_suspect")
    return "O mandado foi emitido para o suspeito errado, comprometendo a operação."
  return "Status da investigação indefinido."
})

const statusLabel = computed(() => {
  if (!caseData.value?.status) return "Indefinido"
  const s = String(caseData.value.status).toLowerCase()
  if (s === "solved") return "Sucesso"
  if (s === "failed_time") return "Falha por tempo"
  if (s === "failed_wrong_suspect") return "Falha por suspeito errado"
  return caseData.value.status
})

const statusColorClass = computed(() => {
  if (!caseData.value?.status) return "text-slate-200"
  const s = String(caseData.value.status).toLowerCase()
  if (s === "solved") return "text-emerald-300"
  if (s === "failed_time") return "text-amber-300"
  if (s === "failed_wrong_suspect") return "text-rose-300"
  return "text-slate-200"
})

const scoreText = computed(() => {
  if (!caseData.value) return "-"
  const baseScore =
    caseData.value.score_earned ??
    caseData.value.score ??
    caseData.value.total_score ??
    null
  if (baseScore == null) return "não disponível"
  return `${baseScore} pontos`
})

const reputationText = computed(() => {
  if (!caseData.value) return "-"
  const rep =
    caseData.value.reputation_delta ??
    caseData.value.reputation_change ??
    caseData.value.reputation ??
    null
  if (rep == null) return "não disponível"
  if (Number(rep) === 0) return "sem impacto"
  if (Number(rep) > 0) return `+${rep} (positivo)`
  return `${rep} (negativo)`
})

const reputationColorClass = computed(() => {
  if (!caseData.value) return "text-slate-200"
  const rep =
    caseData.value.reputation_delta ??
    caseData.value.reputation_change ??
    caseData.value.reputation ??
    0
  const num = Number(rep)
  if (num > 0) return "text-emerald-300"
  if (num < 0) return "text-rose-300"
  return "text-slate-200"
})

function formatDate(value) {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString("pt-BR")
}

async function loadResult() {
  loading.value = true
  error.value = ""
  try {
    const status = await getCaseStatus(caseId, 1)
    caseData.value = status.case || null
    clues.value = status.clues || []
    suspects.value = status.suspects || []
  } catch (err) {
    error.value = err.message || "Erro ao carregar resultado do caso."
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push("/cases")
}

onMounted(() => {
  loadResult()
})
</script>
