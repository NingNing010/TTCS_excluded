import { defineStore } from 'pinia'
import { authService } from '~/services/auth.service'
import type { AuthRole } from '~/types/api'

interface AuthStatus {
  loading: boolean
  error: string | null
}

interface LoginPayload {
  email: string
  password: string
  guestId?: string
}

interface RegisterPayload {
  email: string
  name: string
  phone?: string
  password: string
  confirmation: string
}

const TOKEN_COOKIE = 'auth_token'
const NAME_COOKIE = 'auth_name'
const ROLE_COOKIE = 'auth_role'
const JWT_TTL_SECONDS = 24 * 60 * 60 - 5

const readAuthCookies = () => {
  const tokenCookie = useCookie<string | null>(TOKEN_COOKIE, {
    default: () => null,
    maxAge: JWT_TTL_SECONDS,
    sameSite: 'lax'
  })
  const nameCookie = useCookie<string | null>(NAME_COOKIE, {
    default: () => null,
    sameSite: 'lax'
  })
  const roleCookie = useCookie<AuthRole | null>(ROLE_COOKIE, {
    default: () => null,
    sameSite: 'lax'
  })

  return {
    token: tokenCookie.value,
    name: nameCookie.value,
    role: roleCookie.value
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => {
    const auth = readAuthCookies()

    return {
      token: auth.token,
      name: auth.name,
      role: auth.role,
      status: {
        loading: false,
        error: null
      } as AuthStatus
    }
  },

  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    displayName: (state) => state.name || ''
  },

  actions: {
    async register(payload: RegisterPayload) {
      this.status.loading = true
      this.status.error = null

      try {
        await authService.register({
          email: payload.email,
          name: payload.name,
          phone: payload.phone,
          password: payload.password,
          confirmation: payload.confirmation
        })
      } catch (error) {
        this.status.error = this.toErrorMessage(error)
        throw error
      } finally {
        this.status.loading = false
      }
    },

    setSession(token: string, name: string, role: AuthRole) {
      const tokenCookie = useCookie<string | null>(TOKEN_COOKIE, {
        default: () => null,
        maxAge: JWT_TTL_SECONDS,
        sameSite: 'lax'
      })
      const nameCookie = useCookie<string | null>(NAME_COOKIE, {
        default: () => null,
        sameSite: 'lax'
      })
      const roleCookie = useCookie<AuthRole | null>(ROLE_COOKIE, {
        default: () => null,
        sameSite: 'lax'
      })

      tokenCookie.value = token
      nameCookie.value = name
      roleCookie.value = role

      this.token = token
      this.name = name
      this.role = role
    },

    clearSession() {
      const tokenCookie = useCookie<string | null>(TOKEN_COOKIE, {
        default: () => null,
        maxAge: JWT_TTL_SECONDS,
        sameSite: 'lax'
      })
      const nameCookie = useCookie<string | null>(NAME_COOKIE, {
        default: () => null,
        sameSite: 'lax'
      })
      const roleCookie = useCookie<AuthRole | null>(ROLE_COOKIE, {
        default: () => null,
        sameSite: 'lax'
      })

      tokenCookie.value = null
      nameCookie.value = null
      roleCookie.value = null

      this.token = null
      this.name = null
      this.role = null
    },

    async login(payload: LoginPayload) {
      this.status.loading = true
      this.status.error = null

      try {
        const response = await authService.login(
          {
            email: payload.email,
            password: payload.password
          },
          payload.guestId
        )

        this.setSession(response.jwtToken, response.name, response.role)
      } catch (error) {
        this.status.error = this.toErrorMessage(error)
        throw error
      } finally {
        this.status.loading = false
      }
    },

    async logout() {
      this.status.loading = true
      this.status.error = null

      try {
        await authService.logout()
      } catch {
        // Token is client-managed; we still clear session locally when server logout fails.
      } finally {
        this.clearSession()
        this.status.loading = false
      }
    },

    toErrorMessage(error: unknown) {
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as { message?: unknown }).message
        if (typeof message === 'string' && message.length > 0) {
          return message
        }
      }

      return 'Unable to complete authentication request.'
    }
  }
})
