import { useApiClient } from '~/composables/useApiClient'

export const chatService = {
  async sendMessage(message: string) {
    const api = useApiClient()

    return api<string>('/api/chat/message', {
      method: 'POST',
      timeout: 3 * 60 * 1000,
      body: JSON.stringify(message),
      headers: {
        'Content-Type': 'application/json'
      },
      responseType: 'text'
    })
  }
}
