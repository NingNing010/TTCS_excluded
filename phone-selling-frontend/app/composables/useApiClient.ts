export const useApiClient = () => {
  const currentTimeout = 10000
  const adjustedTimeout = Math.min(60 * 1000, currentTimeout * 3)
  const jwtTtlSeconds = 24 * 60 * 60 - 5

  const config = useRuntimeConfig()
  const authToken = useCookie<string | null>('auth_token', {
    default: () => null,
    maxAge: jwtTtlSeconds,
    sameSite: 'lax'
  })
  const guestId = useCookie<string | null>('guest_id', {
    default: () => null,
    maxAge: 7 * 24 * 60 * 60,
    sameSite: 'lax'
  })

  return $fetch.create({
    baseURL: config.public.apiBase,
    timeout: adjustedTimeout,
    retry: 1,
    retryStatusCodes: [408, 429, 500, 502, 503, 504],
    onRequest({ options }) {
      const headers = new Headers(options.headers)
      headers.set('Accept', 'application/json')

      if (authToken.value) {
        headers.set('Authorization', `Bearer ${authToken.value}`)
      } else if (guestId.value) {
        headers.set('X-Guest-Id', guestId.value)
      }

      options.headers = headers
    }
  })
}
