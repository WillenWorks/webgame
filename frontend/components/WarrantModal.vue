<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
    <div class="w-full max-w-lg bg-slate-950 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-4">
      <header class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold">Emitir mandado de prisão</h2>
          <p class="text-xs text-slate-400 mt-1">
            Escolha o suspeito que você acredita ser o verdadeiro culpado, com base nas pistas.
          </p>
        </div>
        <button
          class="text-xs text-slate-400 hover:text-slate-200"
          @click="$emit('close')"
        >
          ✕
        </button>
      </header>

      <div class="space-y-2 max-h-64 overflow-y-auto pr-1">
        <label
          v-for="s in suspects"
          :key="s.id"
          class="border border-slate-700 rounded-lg px-3 py-2 flex items-start gap-2 cursor-pointer hover:border-emerald-400/70 transition"
        >
          <input
            type="radio"
            class="mt-1 text-emerald-500"
            name="suspect"
            :value="s.id"
            v-model="selectedId"
          />
          <div class="text-[11px] space-y-1">
            <p class="font-semibold text-slate-100">
              {{ s.name_snapshot }}
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
        </label>

        <p v-if="suspects.length === 0" class="text-xs text-slate-400">
          Nenhum suspeito disponível para este caso.
        </p>
      </div>

      <div v-if="error" class="text-xs text-red-400">
        {{ error }}
      </div>

      <footer class="flex items-center justify-end gap-2">
        <button
          class="px-3 py-1.5 text-xs rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-800"
          @click="$emit('close')"
        >
          Cancelar
        </button>
        <button
          class="px-4 py-1.5 text-xs rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition disabled:opacity-50"
          :disabled="!selectedId || loading"
          @click="onConfirm"
        >
          <span v-if="loading">Enviando...</span>
          <span v-else>Emitir mandado</span>
        </button>
      </footer>

      <div v-if="resultMessage" class="text-xs mt-1"
           :class="resultSuccess ? 'text-emerald-300' : 'text-red-300'">
        {{ resultMessage }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { issueWarrant } from "@/services/gameApi"

const props = defineProps({
  suspects: {
    type: Array,
    default: () => [],
  },
  caseId: {
    type: Number,
    required: true,
  },
})

const emit = defineEmits(["close", "completed"])

const selectedId = ref(null)
const loading = ref(false)
const error = ref("")
const resultMessage = ref("")
const resultSuccess = ref(false)

async function onConfirm() {
  if (!selectedId.value) {
    error.value = "Selecione um suspeito para emitir o mandado."
    return
  }

  loading.value = true
  error.value = ""
  resultMessage.value = ""
  resultSuccess.value = false

  try {
    const res = await issueWarrant(props.caseId, selectedId.value, 1)

    resultMessage.value = res.message || ""
    resultSuccess.value = res.result === "correct_arrest"

    // Se deu certo ou errado, em ambos os casos vamos para tela de resultado
    emit("completed")
  } catch (err) {
    error.value = err.message || "Erro ao emitir mandado."
  } finally {
    loading.value = false
  }
}
</script>
