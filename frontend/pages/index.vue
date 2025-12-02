<template>
  <div class="space-y-8">
    <header class="space-y-2">
      <p class="text-xs tracking-[0.25em] text-sky-400 uppercase">
        IGI // International Geointelligence Initiative
      </p>
      <h1 class="text-3xl md:text-4xl font-bold text-slate-50">
        Central de Operações · Operação Monaco
      </h1>
      <p class="text-sm md:text-base text-slate-300 max-w-2xl">
        Bem-vindo, agente. Este terminal é o seu ponto de partida para acessar casos ativos,
        revisar resultados e acompanhar seu desempenho dentro da IGI.
      </p>
    </header>

    <div class="grid gap-6 md:grid-cols-2">
      <InfoSectionCard
        title="Status do Agente"
        subtitle="Resumo rápido do seu perfil operacional"
      >
        <div class="space-y-2 text-sm">
          <p>
            <span class="text-slate-400">Codinome:</span>
            <span class="font-semibold">Agente Placeholder</span>
          </p>
          <p>
            <span class="text-slate-400">Cargo atual:</span>
            <span class="font-semibold text-emerald-300">Analista Cadete</span>
          </p>
          <p>
            <span class="text-slate-400">Casos disponíveis para investigação:</span>
            <span class="font-semibold">Múltiplos casos dinâmicos</span>
          </p>
          <p class="text-xs text-slate-400">
            Em versões futuras, estes dados virão diretamente do backend (score, reputação,
            histórico de missões).
          </p>
        </div>
      </InfoSectionCard>

      <InfoSectionCard
        title="Centro de Operações"
        subtitle="Escolha como deseja prosseguir"
      >
        <div class="space-y-3 text-sm">
          <p class="text-slate-300">
            A partir daqui você pode acessar a lista de casos disponíveis, retomar investigações
            em andamento e revisar relatórios de missões concluídas.
          </p>

          <div class="flex flex-wrap gap-3">
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-lg bg-sky-600 hover:bg-sky-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition"
              @click="startNewInvestigation"
            >
              Iniciar novas investigações
            </button>

            <button
              type="button"
              class="inline-flex items-center justify-center rounded-lg border border-slate-600 bg-slate-900/60 hover:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-100 transition"
              @click="continueCase"
            >
              Ver casos disponíveis
            </button>
          </div>

          <p class="text-xs text-slate-500">
            Por enquanto, ambos os botões direcionam para o mesmo destino: a lista de casos ativos.
            No futuro, poderemos separar entre continuar casos em andamento e iniciar um novo.
          </p>
        </div>
      </InfoSectionCard>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router"
import InfoSectionCard from "@/components/InfoSectionCard.vue"

const router = useRouter()

function startNewInvestigation() {
  router.push("/cases")
}

function continueCase() {
  router.push("/cases")
}
</script>
