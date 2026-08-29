// composables/useAuth.ts
// @ts-ignore
import { useCookie, useState } from '#app'
import { useRouter } from 'vue-router'
import { useApi } from './useApi'

export const useAuth = () => {
  // Mesmas opções do useApi para manter sincronia entre composables
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

  const user = useState<any>('auth_user', () => null)
  const api = useApi()
  const router = useRouter()

  const persistSession = (res: any, fallbackUser?: any) => {
    if (res?.accessToken) token.value = res.accessToken
    if (res?.refreshToken) refreshToken.value = res.refreshToken
    user.value = res?.user || fallbackUser || user.value
  }

  const login = async (username: string, password: string) => {
    try {
      const res: any = await api('/auth/login', {
        method: 'POST',
        body: { username, password }
      })

      if (res?.accessToken) {
        persistSession(res, { username })
        return true
      }
      return false
    } catch (e) {
      console.error('[useAuth] Falha no login', e)
      throw e
    }
  }

  const register = async (username: string, password: string, email: string) => {
    try {
      const res: any = await api('/auth/register', {
        method: 'POST',
        body: { username, password, email }
      })
      // O backend já devolve tokens no registro — aproveita para autenticar
      if (res?.accessToken) persistSession(res, { username, email })
      return true
    } catch (e) {
      console.error('[useAuth] Falha no registro', e)
      throw e
    }
  }

  const logout = async () => {
    const rt = refreshToken.value
    try {
      if (rt) {
        await api('/auth/revoke', { method: 'POST', body: { refreshToken: rt } })
      }
    } catch (e) {
      // Revogação é best-effort; segue com o logout local mesmo em falha
      console.warn('[useAuth] Não foi possível revogar o refresh token', e)
    } finally {
      token.value = null
      refreshToken.value = null
      user.value = null
      router.push('/login')
    }
  }

  return {
    token,
    refreshToken,
    user,
    login,
    register,
    logout
  }
}
