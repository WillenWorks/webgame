<template>
  <div class="min-h-screen bg-slate-900 text-white p-6">
    <div class="max-w-4xl mx-auto space-y-6">

      <h1 class="text-3xl font-bold">
        Teste de Comunicação com o Backend
      </h1>

      <p class="text-sm text-slate-300">
        Esta página é usada para verificar se o frontend Nuxt está conseguindo
        consumir os dados da API do Operação Monaco.
      </p>

      <div v-if="loading" class="text-slate-200">
        Carregando dados do backend...
      </div>

      <div v-else-if="error" class="text-red-400">
        {{ error }}
      </div>

      <div v-else class="space-y-6">
        <!-- Caso -->
        <section class="p-4 rounded bg-slate-800">
          <h2 class="text-xl font-semibold mb-2">Caso Piloto</h2>
          <p><strong>Título:</strong> {{ caseData?.title }}</p>
          <p class="mt-1">
            <strong>Descrição:</strong><br />
            {{ caseData?.description }}
          </p>
          <p class="mt-2">
            <strong>Rota:</strong>
            <span v-if="caseData?.route && caseData.route.length">
              {{ caseData.route.join(" → ") }}
            </span>
          </p>
        </section>

        <!-- Cidades e suspeito -->
        <section class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 rounded bg-slate-800">
            <h2 class="text-lg font-semibold mb-2">Cidades da Rota</h2>
            <ul class="space-y-1">
              <li v-for="city in cities" :key="city.cityId">
                • {{ city.name }} ({{ city.country }})
              </li>
            </ul>
          </div>

          <div class="p-4 rounded bg-slate-800">
            <h2 class="text-lg font-semibold mb-2">Suspeito</h2>
            <p><strong>Nome:</strong> {{ suspect?.name }}</p>
            <p class="mt-1"><strong>Descrição:</strong> {{ suspect?.description }}</p>
          </div>
        </section>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
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
    cities.value = citiesResponse || []
    suspect.value = suspectResponse
  } catch (err) {
    console.error(err)
    error.value = "Erro ao carregar dados do backend."
  } finally {
    loading.value = false
  }
})
</script>
