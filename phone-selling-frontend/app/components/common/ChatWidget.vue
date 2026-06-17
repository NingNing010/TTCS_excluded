<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import MarkdownIt from 'markdown-it'
import { useAuthStore } from '~/stores/auth'
import { useChatStore } from '~/stores/chat'

const route = useRoute()
const { t } = useI18n()
const authStore = useAuthStore()
const chatStore = useChatStore()
const { isAuthenticated, displayName } = storeToRefs(authStore)
const { isOpen, messages, status } = storeToRefs(chatStore)

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
})

const draft = ref('')
const conversationRef = ref<HTMLElement | null>(null)

const renderAssistantMessage = (text: string) => markdown.render(text)

const isEligibleRoute = computed(() => {
  if (route.path === '/') {
    return true
  }

  if (route.path === '/search') {
    return true
  }

  return route.path.startsWith('/products/')
})

const canUseChat = computed(() => isAuthenticated.value && isEligibleRoute.value)

const scrollToBottom = async () => {
  await nextTick()
  if (!conversationRef.value) {
    return
  }

  conversationRef.value.scrollTop = conversationRef.value.scrollHeight
}

watch(
  () => canUseChat.value,
  (enabled) => {
    if (!enabled) {
      chatStore.close()
      return
    }

    chatStore.setStorageKey(displayName.value || 'default')
    chatStore.clearIfExpired()
  },
  { immediate: true }
)

watch(
  () => messages.value.length,
  async () => {
    if (isOpen.value) {
      await scrollToBottom()
    }
  }
)

const toggleWidget = async () => {
  chatStore.toggle()

  if (chatStore.isOpen) {
    await scrollToBottom()
  }
}

const sendMessage = async () => {
  const content = draft.value.trim()
  if (!content) {
    return
  }

  draft.value = ''
  await chatStore.send(content)
  await scrollToBottom()
}
</script>

<template>
  <div v-if="canUseChat" class="chat-widget-root">
    <button
      type="button"
      class="chat-toggle-btn"
      :aria-label="t('chat.open')"
      @click="toggleWidget"
    >
      💬
    </button>

    <section v-if="isOpen" class="chat-panel surface-card">
      <header class="chat-header">
        <strong>{{ t('chat.title') }}</strong>
        <button type="button" class="chat-close" :aria-label="t('chat.close')" @click="chatStore.close">×</button>
      </header>

      <div ref="conversationRef" class="chat-messages">
        <p v-if="messages.length === 0" class="chat-empty">{{ t('chat.empty') }}</p>

        <article
          v-for="message in messages"
          :key="message.id"
          class="chat-bubble"
          :class="message.role === 'user' ? 'is-user' : 'is-assistant'"
        >
          <template v-if="message.role === 'assistant'">
            <div class="chat-markdown" v-html="renderAssistantMessage(message.text)" />
          </template>
          <template v-else>
            {{ message.text }}
          </template>
        </article>
      </div>

      <p v-if="status.error" class="chat-error">
        {{ t('chat.unavailable') }}
        <span class="chat-error-detail">{{ status.error }}</span>
      </p>

      <footer class="chat-input-row">
        <input
          v-model="draft"
          type="text"
          class="chat-input"
          :placeholder="t('chat.placeholder')"
          :disabled="status.sending"
          @keydown.enter.prevent="sendMessage"
        />
        <button
          type="button"
          class="chat-send-btn"
          :disabled="status.sending || draft.trim().length === 0"
          @click="sendMessage"
        >
          {{ status.sending ? t('chat.sending') : t('chat.send') }}
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.chat-widget-root {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 40;
  display: grid;
  justify-items: end;
  gap: 0.75rem;
}

.chat-toggle-btn {
  width: 52px;
  height: 52px;
  border: 0;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 1.25rem;
  background: #1f5eff;
  color: #fff;
  box-shadow: 0 12px 30px rgba(31, 94, 255, 0.35);
  cursor: pointer;
}

.chat-panel {
  width: min(360px, calc(100vw - 1.5rem));
  max-height: min(520px, calc(100vh - 6.5rem));
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0.9rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.chat-close {
  border: 0;
  background: transparent;
  color: #475569;
  font-size: 1.1rem;
  cursor: pointer;
}

.chat-messages {
  overflow: auto;
  padding: 0.85rem;
  display: grid;
  gap: 0.55rem;
  align-content: start;
  background: linear-gradient(180deg, #f8fbff, #f4f7fc);
}

.chat-empty {
  margin: 0;
  color: #64748b;
  font-size: 0.85rem;
}

.chat-bubble {
  max-width: 88%;
  padding: 0.55rem 0.7rem;
  border-radius: 12px;
  font-size: 0.87rem;
  line-height: 1.4;
  white-space: pre-wrap;
}

.chat-bubble.is-user {
  justify-self: end;
  background: #1f5eff;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.chat-bubble.is-assistant {
  justify-self: start;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.1);
  color: #0f172a;
  border-bottom-left-radius: 4px;
}

.chat-markdown :deep(p) {
  margin: 0;
}

.chat-markdown :deep(p + p) {
  margin-top: 0.4rem;
}

.chat-markdown :deep(ul),
.chat-markdown :deep(ol) {
  margin: 0.35rem 0 0.35rem 1.1rem;
  padding: 0;
}

.chat-markdown :deep(pre) {
  margin: 0.4rem 0;
  padding: 0.45rem 0.55rem;
  border-radius: 8px;
  background: #e2e8f0;
  overflow-x: auto;
}

.chat-markdown :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
    'Courier New', monospace;
}

.chat-markdown :deep(a) {
  color: #1d4ed8;
}

.chat-error {
  margin: 0;
  padding: 0.5rem 0.75rem;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
  background: #fff7ed;
  color: #b45309;
  font-size: 0.78rem;
  display: grid;
  gap: 0.2rem;
}

.chat-error-detail {
  color: #92400e;
  font-weight: 600;
}

.chat-input-row {
  padding: 0.75rem;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 0.5rem;
  background: #fff;
}

.chat-input {
  width: 100%;
  height: 38px;
  border: 1px solid rgba(15, 23, 42, 0.16);
  border-radius: 10px;
  padding: 0 0.65rem;
}

.chat-send-btn {
  justify-self: end;
  border: 0;
  height: 34px;
  border-radius: 9px;
  padding: 0 0.85rem;
  background: #1f5eff;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

.chat-send-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
