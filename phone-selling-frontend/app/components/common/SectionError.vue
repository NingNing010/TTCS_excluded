<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  message: string
}>()

defineEmits<{
  retry: []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="error-box">
    <p>{{ message }}</p>
    <button type="button" @click="$emit('retry')">{{ t('common.retry') }}</button>
  </div>
</template>

<style scoped>
.error-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-radius: 12px;
  border: 1px solid rgba(180, 35, 24, 0.22);
  background: rgba(180, 35, 24, 0.05);
  padding: 0.85rem 1rem;
}

.error-box p {
  margin: 0;
  color: #97220f;
  font-weight: 600;
}

.error-box button {
  height: 34px;
  border: 1px solid rgba(151, 34, 15, 0.35);
  border-radius: 10px;
  background: #fff;
  color: #97220f;
  font-weight: 700;
  padding-inline: 0.75rem;
  cursor: pointer;
}
</style>
