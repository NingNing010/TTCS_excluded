const LOCAL_HTTPS_API_PATTERN = /^https:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i

export default defineNuxtPlugin(() => {
  if (!import.meta.dev) {
    return
  }

  const config = useRuntimeConfig()
  const apiBase = String(config.public.apiBase ?? '')

  if (!LOCAL_HTTPS_API_PATTERN.test(apiBase)) {
    return
  }

  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    return
  }

  // Dev-only: allow SSR requests to local APIs that use self-signed certs.
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
})