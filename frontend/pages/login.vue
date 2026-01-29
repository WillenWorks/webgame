<template>
  <div class="flex items-center justify-center min-h-[80vh]">
    <div class="w-full max-w-md space-y-8">
      <div class="text-center">
        <h2 class="text-3xl font-display text-amber-400">ACESSO RESTRITO</h2>
        <p class="font-mono text-cyan-400 text-sm mt-2">INSIRA CREDENCIAIS DE AGENTE</p>
      </div>

      <RetroCard>
        <form @submit.prevent="handleLogin" class="space-y-6">
          <div>
            <label class="block text-xs font-mono text-slate-400 mb-2">CODINOME (USERNAME)</label>
            <input 
              v-model="form.username" 
              type="text" 
              class="w-full bg-slate-900 border-2 border-slate-700 text-white p-3 font-mono focus:border-amber-500 focus:outline-none transition-colors"
              placeholder="AGENTE_X"
              required
            />
          </div>

          <div>
            <label class="block text-xs font-mono text-slate-400 mb-2">SENHA DE ACESSO</label>
            <input 
              v-model="form.password" 
              type="password" 
              class="w-full bg-slate-900 border-2 border-slate-700 text-white p-3 font-mono focus:border-amber-500 focus:outline-none transition-colors"
              placeholder="******"
              required
            />
          </div>

          <div v-if="error" class="p-3 bg-red-900/20 border border-red-500 text-red-400 text-xs font-mono">
            ERRO: {{ error }}
          </div>

          <div class="flex flex-col gap-3 pt-4">
            <RetroButton type="submit" :disabled="loading" class="w-full">
              {{ loading ? 'AUTENTICANDO...' : 'ENTRAR NO SISTEMA' }}
            </RetroButton>
            
            <button 
              type="button" 
              @click="isRegister = !isRegister"
              class="text-xs font-mono text-slate-500 hover:text-cyan-400 underline decoration-dashed underline-offset-4 text-center mt-2"
            >
              {{ isRegister ? 'JÁ POSSUO CREDENCIAIS' : 'SOLICITAR NOVO ACESSO (REGISTRO)' }}
            </button>
          </div>
        </form>
      </RetroCard>
      
      <!-- Campos extras para registro -->
      <div v-if="isRegister" class="mt-4 p-4 border border-dashed border-slate-700 bg-slate-900/50">
        <p class="text-xs text-amber-500 mb-2 font-mono">> DADOS ADICIONAIS NECESSÁRIOS:</p>
        <input 
          v-model="form.email" 
          type="email" 
          class="w-full bg-slate-900 border border-slate-700 text-white p-2 font-mono text-sm focus:border-cyan-500 focus:outline-none"
          placeholder="EMAIL INSTITUCIONAL"
        />
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import RetroCard from '@/components/ui/RetroCard.vue'
import RetroButton from '@/components/ui/RetroButton.vue'

const { login, register } = useAuth()
const router = useRouter()

const isRegister = ref(false)
const loading = ref(false)
const error = ref('')

const form = ref({
  username: '',
  password: '',
  email: ''
})

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  
  try {
    if (isRegister.value) {
      if (!form.value.email) {
        throw new Error('Email é obrigatório para registro')
      }
      await register(form.value.username, form.value.password, form.value.email)
      // Após registro, faz login automático ou pede para logar
      // Vamos tentar logar direto
    }
    
    await login(form.value.username, form.value.password)
    router.push('/dashboard')
  } catch (e) {
    error.value = e.message || 'Falha na autenticação. Verifique suas credenciais.'
  } finally {
    loading.value = false
  }
}
</script>
