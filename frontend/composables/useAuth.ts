// @ts-ignore
import { useCookie, useState } from '#app'
import { useRouter } from 'vue-router'
import { useApi } from './useApi'

export const useAuth = () => {
  const token = useCookie<string | null>('auth_token', {
    watch: true,
    default: () => null
  })

  const user = useState<any>('auth_user', () => null)
  const api = useApi()
  const router = useRouter()

  const login = async (username: string, password: string) => {
    const res: any = await api('/auth/login', {
      method: 'POST',
      body: { username, password }
    })

    if (!res?.accessToken) {
      throw new Error('Login falhou')
    }

    token.value = res.accessToken
    user.value = { username }

    return true
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
    logout
  }
}
