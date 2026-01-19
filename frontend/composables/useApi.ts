// @ts-ignore
import { useRuntimeConfig, useCookie } from '#app'
import { useRouter } from 'vue-router'

export const useApi = () => {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBaseUrl || 'http://localhost:3333/api/v1'

  const token = useCookie<string | null>('auth_token', {
    watch: true,
    default: () => null
  })

  const router = useRouter()

  return $fetch.create({
    baseURL,

    onRequest({ request, options }) {
      if (token.value) {
        options.headers = {
          ...(options.headers || {}),
          Authorization: `Bearer ${token.value}`
        } as any
      }

      console.log(
        `[API] ${options.method || 'GET'} ${request} | Token: ${token.value ? 'OK' : 'NONE'}`
      )
    },

    async onResponseError({ response }) {
      console.error(
        '[API ERROR]',
        response.status,
        response._data?.message || response.statusText
      )

      if (response.status === 401) {
        token.value = null
        router.push('/login')
        return
      }

      throw new Error(
        response._data?.message || 'Erro na comunicação com o servidor'
      )
    }
  })
}
