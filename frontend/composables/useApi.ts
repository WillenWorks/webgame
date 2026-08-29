// composables/useApi.ts
// @ts-ignore
import { useRuntimeConfig, useCookie } from '#app'

/**
 * Cliente HTTP central do terminal.
 * - Injeta o accessToken (cookie `auth_token`) em toda requisição.
 * - Silent refresh: em caso de 401, tenta renovar via `POST /auth/refresh`
 *   usando o `refreshToken` guardado no cookie `auth_refresh` e repete a
 *   requisição original uma única vez. Se falhar, encerra a sessão e
 *   redireciona para /login.
 */
export const useApi = () => {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBaseUrl || 'http://localhost:3333/api/v1'

  const token = useCookie('auth_token', {
    watch: true,
    default: () => null,
    maxAge: 60 * 60 * 24 * 7,
    path: '/'
  })

  const refreshToken = useCookie('auth_refresh', {
    watch: true,
    default: () => null,
    maxAge: 60 * 60 * 24 * 30,
    path: '/'
  })

  // Garante uma única chamada de refresh concorrente
  let refreshInFlight: Promise<boolean> | null = null

  const runRefresh = (): Promise<boolean> => {
    if (!refreshToken.value) return Promise.resolve(false)
    if (!refreshInFlight) {
      refreshInFlight = $fetch<{ ok: boolean; accessToken?: string }>(`${baseURL}/auth/refresh`, {
        method: 'POST',
        body: { refreshToken: refreshToken.value }
      })
        .then((res) => {
          if (res?.accessToken) {
            token.value = res.accessToken
            return true
          }
          return false
        })
        .catch(() => false)
        .finally(() => { refreshInFlight = null })
    }
    return refreshInFlight
  }

  const endSession = () => {
    token.value = null
    refreshToken.value = null
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login'
    }
  }

  // @ts-ignore
  const client = $fetch.create({
    baseURL,
    onRequest({ options }) {
      const headers = new Headers(options.headers as HeadersInit | undefined)
      const value = token.value
      if (value) {
        headers.set('Authorization', value.startsWith('Bearer ') ? value : `Bearer ${value}`)
      }
      options.headers = headers
    }
  })

  const isAuthEndpoint = (request: unknown) =>
    typeof request === 'string' && /\/auth\/(login|register|refresh|revoke)/.test(request)

  const api = async <T = any>(request: any, options: any = {}, allowRetry = true): Promise<T> => {
    try {
      return await client<T>(request, options)
    } catch (err: any) {
      const status = err?.response?.status ?? err?.status

      if (status === 401 && allowRetry && !isAuthEndpoint(request)) {
        const renewed = await runRefresh()
        if (renewed) {
          return api<T>(request, options, false)
        }
        endSession()
      }

      throw err
    }
  }

  return api
}
