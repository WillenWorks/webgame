// composables/useApi.ts
// @ts-ignore
import { useRuntimeConfig, useCookie } from '#app'

export const useApi = () => {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBaseUrl || 'http://localhost:3333/api/v1'
  
  // Use 'watch: true' to ensure reactivity across the app
  const token = useCookie('auth_token', {
    watch: true,
    default: () => null,
    path: '/'
  })

  // @ts-ignore
  return $fetch.create({
    baseURL,
    onRequest({ options }) {
      const tokenValue = token.value

      // Initialize headers
      options.headers = options.headers || {}
      
      if (tokenValue) {
        // Ensure we don't double-prefix Bearer
        const authHeader = tokenValue.startsWith('Bearer ') 
          ? tokenValue 
          : `Bearer ${tokenValue}`
          
        // Handle different header formats (Headers object vs plain object)
        if (options.headers instanceof Headers) {
          options.headers.set('Authorization', authHeader)
        } else {
          // @ts-ignore
          options.headers['Authorization'] = authHeader
        }
        
        console.log('[useApi] Setting Auth Header:', authHeader.substring(0, 15) + '...')
      } else {
        console.warn('[useApi] No token found in cookie during request')
      }
      
      console.log(`[API] ${options.method || 'GET'} ${options.url}`)
    },
    async onResponseError({ response }) {
      console.error('API Error:', response.status, response._data?.message || response.statusText)
      
      if (response.status === 401) {
        console.warn('[useApi] 401 Unauthorized - Clearing token and redirecting')
        if (token.value) token.value = null
        
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
      }
    }
  })
}
