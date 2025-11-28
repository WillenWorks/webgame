<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
    <main class="max-w-3xl w-full space-y-8">
      <!-- Cabeçalho IGI -->
      <header class="space-y-2">
        <p class="text-xs tracking-[0.25em] text-sky-400 uppercase">
          IGI // International Geointelligence Initiative
        </p>
        <h1 class="text-3xl md:text-4xl font-bold text-slate-50">
          Operação Monaco
        </h1>
        <p class="text-sm md:text-base text-slate-300">
          Bem-vindo, agente. Este terminal dá acesso ao caso piloto
          <span class="font-semibold">“O Roubo do Meridiano Zero”</span>.
        </p>
      </header>

      <!-- Card principal -->
      <section class="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 md:p-8 space-y-5">
        <div class="space-y-2">
          <h2 class="text-xl font-semibold text-slate-50">
            Centro de Operações · Modo Investigação
          </h2>
          <p class="text-sm text-slate-300">
            Use este painel para iniciar uma nova investigação ou retornar ao
            modo de jogo principal. A rota do suspeito será analisada com base
            em pistas culturais, históricas e geográficas — nos moldes clássicos
            de Carmen Sandiego, em versão atualizada.
          </p>
        </div>

        <div class="grid gap-3 md:grid-cols-2">
          <!-- Iniciar nova investigação -->
          <button
            type="button"
            class="rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-sky-400 transition"
            @click="startNewInvestigation"
          >
            Iniciar nova investigação
          </button>

          <!-- Continuar caso -->
          <button
            type="button"
            class="rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-700 transition"
            @click="continueCase"
          >
            Continuar caso
          </button>
        </div>

        <p class="text-[11px] text-slate-500">
          Observação: neste MVP, ambos os botões levam ao modo principal de
          jogo. Em versões futuras, o botão <span class="font-semibold">Continuar caso</span>
          poderá retomar uma investigação em andamento.
        </p>
      </section>
    </main>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router"

const router = useRouter()

function startNewInvestigation() {
  router.push("/game")
}

function continueCase() {
  router.push("/game")
}
</script>
