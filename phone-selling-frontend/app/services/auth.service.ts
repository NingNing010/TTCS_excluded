import { useApiClient } from '~/composables/useApiClient'
import type { LoginRequest, LoginResponse, RegisterRequest } from '~/types/api'

export const authService = {
  async register(payload: RegisterRequest) {
    const api = useApiClient()

    await api('/api/auth/register', {
      method: 'POST',
      body: payload
    })
  },

  async login(payload: LoginRequest, guestId?: string) {
    const api = useApiClient()

    return api<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: payload,
      headers: guestId ? { 'X-Guest-Id': guestId } : undefined
    })
  },

  async logout() {
    const api = useApiClient()

    await api('/api/auth/logout', {
      method: 'POST'
    })
  }
}
