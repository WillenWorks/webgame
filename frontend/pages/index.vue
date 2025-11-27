<template>
  <div class="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
    <!-- Cabeçalho -->
    <AgentHeader />

    <!-- Conteúdo principal -->
    <main class="flex-1">
      <div class="max-w-6xl mx-auto px-4 py-6 space-y-6">

        <!-- Estado de carregamento / erro -->
        <div v-if="loading" class="text-sm text-slate-300">
          Carregando dossiê do caso...
        </div>

        <div v-else-if="error" class="text-sm text-red-400">
          {{ error }}
        </div>

        <template v-else>
          <!-- Linha superior: resumo do caso -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <InfoSectionCard class="lg:col-span-2" title="Caso em andamento" subtitle="Dossiê ativo na unidade Europa"
              badge="Treinamento IGI">
              <p class="text-base font-semibold">
                {{ caseData?.title }}
              </p>
              <p class="text-sm text-slate-200 mt-1">
                {{ caseData?.description }}
              </p>
              <p v-if="caseData?.route?.length" class="text-xs text-slate-400 mt-3">
                Rota prevista:
                <span class="text-sky-300">
                  {{ caseData.route.join(" → ") }}
                </span>
              </p>
            </InfoSectionCard>

            <InfoSectionCard title="Status do Agente" subtitle="Perfil de treinamento" badge="Nível 1">
              <p class="text-sm">
                Cargo atual:
                <span class="font-semibold text-emerald-300">
                  Analista Cadete
                </span>
              </p>
              <p class="text-xs text-slate-400 mt-1">
                Acesso restrito a casos de complexidade baixa e média.
              </p>
              <p class="text-xs text-slate-500 mt-2">
                Este painel utiliza dados reais da API do Operação Monaco.
              </p>
            </InfoSectionCard>
          </div>

          <!-- Linha inferior: cidades e suspeito -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <InfoSectionCard class="lg:col-span-2" title="Rota investigada"
              subtitle="Cidades identificadas na rota de fuga">
              <ul class="text-sm space-y-1">
                <li v-for="(city, index) in cities" :key="city.cityId" class="flex items-start gap-2">
                  <span class="text-xs text-slate-500 w-5">
                    {{ index + 1 }}.
                  </span>
                  <div>
                    <p class="font-medium text-slate-100">
                      {{ city.name }}
                      <span class="text-xs text-slate-400">
                        ({{ city.country }})
                      </span>
                    </p>
                    <p class="text-xs text-slate-400" v-if="city.landmarks?.length">
                      Referências:
                      {{ city.landmarks.join(", ") }}
                    </p>
                  </div>
                </li>
              </ul>
            </InfoSectionCard>

            <InfoSectionCard title="Perfil do suspeito" subtitle="Carlos “Monaco” Navarro">
              <p class="text-sm font-semibold mb-1">
                {{ suspect?.name }}
              </p>
              <p class="text-sm text-slate-200">
                {{ suspect?.description }}
              </p>

              <div v-if="suspect?.traits" class="mt-3 space-y-1 text-xs text-slate-300">
                <p>
                  Altura: <span class="text-slate-100">{{ suspect.traits.height }}</span>
                </p>
                <p>
                  Cabelo: <span class="text-slate-100">{{ suspect.traits.hair }}</span>
                </p>
                <p v-if="suspect.traits.style">
                  Estilo: <span class="text-slate-100">{{ suspect.traits.style }}</span>
                </p>
                <p v-if="suspect.traits.languages?.length">
                  Idiomas:
                  <span class="text-slate-100">{{ suspect.traits.languages.join(", ") }}</span>
                </p>
                <p v-if="suspect.traits.signature" class="text-slate-400 mt-1">
                  Assinatura:
                  <span class="text-sky-300">
                    {{ suspect.traits.signature }}
                  </span>
                </p>
              </div>
            </InfoSectionCard>
          </div>

          <!-- Bloco de chamada para o modo investigação -->
          <section
            class="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-slate-700/70 bg-slate-900/70 px-6 py-4">
            <div>
              <h2 class="text-lg font-semibold text-sky-300">
                Modo Investigação
              </h2>
              <p class="text-sm text-slate-300">
                Inicie a simulação do caso piloto e jogue como Analista Cadete da
                IGI.
              </p>
            </div>
            <NuxtLink to="/investigacao"
              class="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 transition-colors">
              Iniciar investigação
              <span class="text-base">▶</span>
            </NuxtLink>
          </section>
        </template>
      </div>
    </main>

    <!-- Rodapé simples -->
    <footer class="border-t border-slate-800 bg-slate-950/90">
      <div
        class="max-w-6xl mx-auto px-4 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
        <p class="text-[11px] text-slate-500">
          IGI · Sistema de Treinamento Operação Monaco · MVP
        </p>
        <p class="text-[11px] text-slate-600">
          Backend: http://localhost:3333 · Frontend: http://localhost:3000
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import AgentHeader from "~/components/AgentHeader.vue"
import InfoSectionCard from "~/components/InfoSectionCard.vue"
import { getCase, getCities, getSuspect } from "~/services/api"

const caseData = ref(null)
const cities = ref([])
const suspect = ref(null)
const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  try {
    const [caseResponse, citiesResponse, suspectResponse] = await Promise.all([
      getCase(),
      getCities(),
      getSuspect(),
    ])

    caseData.value = caseResponse
    cities.value = Array.isArray(citiesResponse) ? citiesResponse : []
    suspect.value = suspectResponse
  } catch (err) {
    console.error(err)
    error.value = "Não foi possível carregar os dados do painel do agente."
  } finally {
    loading.value = false
  }
})
</script>
