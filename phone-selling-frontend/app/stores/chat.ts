import { defineStore } from 'pinia'
import { chatService } from '~/services/chat.service'

type ChatRole = 'user' | 'assistant'

interface ChatMessage {
  id: string
  role: ChatRole
  text: string
  createdAt: string
}

interface PersistedChatState {
  messages: ChatMessage[]
  lastActivityAt: number
}

interface ChatStatus {
  sending: boolean
  error: string | null
}

const CHAT_TTL_MS = 25 * 60 * 1000

const generateMessageId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const parsePersisted = (payload: string | null): PersistedChatState | null => {
  if (!payload) {
    return null
  }

  try {
    const parsed = JSON.parse(payload) as Partial<PersistedChatState>
    if (!Array.isArray(parsed.messages) || typeof parsed.lastActivityAt !== 'number') {
      return null
    }

    return {
      messages: parsed.messages.filter((item): item is ChatMessage => {
        return (
          !!item &&
          typeof item === 'object' &&
          typeof (item as { id?: unknown }).id === 'string' &&
          typeof (item as { role?: unknown }).role === 'string' &&
          typeof (item as { text?: unknown }).text === 'string' &&
          typeof (item as { createdAt?: unknown }).createdAt === 'string'
        )
      }),
      lastActivityAt: parsed.lastActivityAt
    }
  } catch {
    return null
  }
}

export const useChatStore = defineStore('chat', {
  state: () => ({
    storageKey: 'phone_chat_history',
    initialized: false,
    isOpen: false,
    messages: [] as ChatMessage[],
    lastActivityAt: 0,
    status: {
      sending: false,
      error: null
    } as ChatStatus
  }),

  getters: {
    hasMessages: (state) => state.messages.length > 0
  },

  actions: {
    setStorageKey(userKey: string) {
      const normalized = userKey.trim().length > 0 ? userKey.trim() : 'default'
      this.storageKey = `phone_chat_history_${normalized}`
      this.initialized = false
      this.initialize()
    },

    initialize() {
      if (!import.meta.client || this.initialized) {
        return
      }

      const persisted = parsePersisted(localStorage.getItem(this.storageKey))
      if (!persisted) {
        this.initialized = true
        return
      }

      const expired = Date.now() - persisted.lastActivityAt > CHAT_TTL_MS
      if (expired) {
        localStorage.removeItem(this.storageKey)
        this.initialized = true
        return
      }

      this.messages = persisted.messages
      this.lastActivityAt = persisted.lastActivityAt
      this.initialized = true
    },

    persist() {
      if (!import.meta.client) {
        return
      }

      const payload: PersistedChatState = {
        messages: this.messages,
        lastActivityAt: this.lastActivityAt
      }

      localStorage.setItem(this.storageKey, JSON.stringify(payload))
    },

    touch() {
      this.lastActivityAt = Date.now()
      this.persist()
    },

    clearHistory() {
      this.messages = []
      this.lastActivityAt = Date.now()
      this.status.error = null

      if (import.meta.client) {
        localStorage.removeItem(this.storageKey)
      }
    },

    clearIfExpired() {
      if (!this.lastActivityAt) {
        return
      }

      if (Date.now() - this.lastActivityAt > CHAT_TTL_MS) {
        this.clearHistory()
      }
    },

    open() {
      this.initialize()
      this.clearIfExpired()
      this.isOpen = true
      this.status.error = null
    },

    close() {
      this.isOpen = false
      this.status.error = null
    },

    toggle() {
      if (this.isOpen) {
        this.close()
        return
      }

      this.open()
    },

    appendMessage(role: ChatRole, text: string) {
      this.messages.push({
        id: generateMessageId(),
        role,
        text,
        createdAt: new Date().toISOString()
      })
      this.touch()
    },

    async send(text: string) {
      const content = text.trim()
      if (!content || this.status.sending) {
        return
      }

      this.initialize()
      this.clearIfExpired()

      this.status.sending = true
      this.status.error = null
      this.appendMessage('user', content)

      try {
        const response = await chatService.sendMessage(content)
        this.appendMessage('assistant', response?.trim() || '...')
      } catch (error) {
        const detail =
          error && typeof error === 'object' && 'message' in error
            ? (error as { message?: unknown }).message
            : null
        this.status.error = typeof detail === 'string' && detail.length > 0 ? detail : 'Unknown error'
        this.appendMessage('assistant', 'Chatbot is currently unavailable.')
      } finally {
        this.status.sending = false
      }
    }
  }
})
