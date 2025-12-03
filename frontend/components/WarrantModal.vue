<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
  >
    <div
      class="w-full max-w-2xl bg-slate-950 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-4"
    >
      <header class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold">Emitir mandado de prisão</h2>
          <p class="text-xs text-slate-400 mt-1">
            Escolha o suspeito que você acredita ser o verdadeiro culpado, com
            base nas pistas.
          </p>
        </div>
        <button
          type="button"
          class="text-xs text-slate-400 hover:text-slate-200"
          @click="onClose"
        >
          ✕
        </button>
      </header>

      <section class="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        <p v-if="!suspects?.length" class="text-sm text-slate-400">
          Nenhum suspeito foi identificado para este caso.
        </p>

        <div
          v-else
          v-for="sus in suspects"
          :key="sus.id"
          class="border border-slate-700/80 bg-slate-900/70 rounded-lg p-3 flex gap-3 cursor-pointer hover:border-emerald-500/60"
          @click="selectedId = sus.id"
        >
          <input
            type="radio"
            class="mt-1"
            :value="sus.id"
            v-model="selectedId"
          />

          <div class="space-y-1 text-sm text-slate-200">
            <p class="font-semibold">
              {{ sus.name || "Suspeito desconhecido" }}
            </p>
            <p class="text-slate-300">
              <span v-if="sus.occupation">
                {{ sus.occupation }}
              </span>
              <span v-if="sus.hobby">
                · {{ sus.hobby }}
              </span>
            </p>
            <p class="text-xs text-slate-400" v-if="sus.hair_color || sus.vehicle">
              <span v-if="sus.hair_color">Cabelo: {{ sus.hair_color }}</span>
              <span v-if="sus.hair_color && sus.vehicle"> · </span>
              <span v-if="sus.vehicle">Veículo: {{ sus.vehicle }}</span>
            </p>
            <p class="text-xs text-slate-400" v-if="sus.feature">
              Traço: {{ sus.feature }}
            </p>
          </div>
        </div>
      </section>

      <p v-if="error" class="text-xs text-red-400">
        {{ error }}
      </p>

      <p v-if="resultMessage" class="text-xs" :class="resultSuccess ? 'text-emerald-400' : 'text-amber-300'">
        {{ resultMessage }}
      </p>

      <footer class="flex justify-between items-center gap-3 pt-2">
        <button
          type="button"
          class="px-4 py-2 rounded-lg text-sm font-medium border border-slate-600 text-slate-100 hover:bg-slate-800 transition"
          :disabled="loading"
          @click="onClose"
        >
          Cancelar
        </button>

        <button
          type="button"
          class="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="loading || !selectedId"
          @click="onSubmit"
        >
          <span v-if="loading">Emitindo...</span>
          <span v-else>Emitir mandado</span>
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue"
import { issueWarrant } from "@/services/gameApi"

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  caseId: {
    type: Number,
    required: true,
  },
  suspects: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(["close", "completed"])

const selectedId = ref(null)
const loading = ref(false)
const error = ref("")
const resultMessage = ref("")
const resultSuccess = ref(null)

// sempre que abrir a modal, resetamos o estado interno
watch(
  () => props.show,
  (visible) => {
    if (visible) {
      error.value = ""
      resultMessage.value = ""
      resultSuccess.value = null

      if (!selectedId.value && props.suspects?.length) {
        selectedId.value = props.suspects[0].id
      }
    }
  },
  { immediate: true },
)

function onClose() {
  if (loading.value) return
  emit("close")
}

async function onSubmit() {
  if (!selectedId.value) {
    error.value = "Selecione um suspeito antes de emitir o mandado."
    return
  }

  loading.value = true
  error.value = ""
  resultMessage.value = ""
  resultSuccess.value = null

  try {
    const res = await issueWarrant(props.caseId, selectedId.value, 1)

    // unwrap retorna data => { correct, scoring }
    resultSuccess.value = !!res.correct
    resultMessage.value = res.correct
      ? "Mandado de prisão bem-sucedido. Você prendeu o verdadeiro culpado."
      : "Mandado emitido para o suspeito errado. O verdadeiro culpado escapou."

    emit("completed")
  } catch (err) {
    // Pode ser erro do axios com response 400 do backend
    const backendResponse = err?.response?.data
    const backendMessage = backendResponse?.message
    const reason = backendResponse?.data?.reason

    if (reason === "not_enough_evidence") {
      error.value =
        backendMessage ||
        "Ainda não há informações suficientes para emitir um mandado de prisão. Continue investigando."
      // aqui NÃO emitimos "completed", só deixamos a modal aberta para o jogador ler e fechar
    } else {
      error.value =
        backendMessage ||
        err.message ||
        "Erro ao emitir mandado de prisão."
    }
  } finally {
    loading.value = false
  }
}
</script>
