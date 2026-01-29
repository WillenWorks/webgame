// composables/useAuth.ts
// @ts-ignore
import { useCookie, useState } from '#app'
import { useRouter } from 'vue-router'
import { useApi } from './useApi'

export const useAuth = () => {
  // Usar as mesmas opções para garantir sincronia
  // Ensure options match useApi for consistency
  const token = useCookie('auth_token', {
    watch: true,
    default: () => null,
    maxAge: 60 * 60 * 24 * 7,
    path: '/' 
  })
  
  const user = useState<any>('auth_user', () => null)
  const api = useApi()
  const router = useRouter()

  const login = async (username, password) => {
    try {
      console.log('[useAuth] Tentando login...')
      const res: any = await api('/auth/login', {
        method: 'POST',
        body: { username, password }
      })
      
      console.log('[useAuth] Resposta login:', res)

      if (res.accessToken) {
        token.value = res.accessToken
        user.value = res.user || { username }
        console.log('[useAuth] Token definido:', token.value)
        return true
      }
      return false
    } catch (e) {
      console.error('Login error', e)
      throw e
    }
  }

  const register = async (username, password, email) => {
    try {
      const res: any = await api('/auth/register', {
        method: 'POST',
        body: { username, password, email }
      })
      return true
    } catch (e) {
      console.error('Register error', e)
      throw e
    }
  }

  const logout = () => {
    token.value = null
    user.value = null
    router.push('/login')
  }

  return {
    token,
    user,
    login,
    register,
    logout
  }
}
