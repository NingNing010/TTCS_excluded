<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <footer class="site-footer">
    <div class="container footer-grid">
      <div>
        <h3>{{ t('header.brand') }}</h3>
        <p>{{ t('footer.description') }}</p>
      </div>

      <div>
        <h4>{{ t('footer.hotline') }}</h4>
        <p>1900 6789</p>
      </div>

      <div>
        <h4>{{ t('footer.email') }}</h4>
        <p>support@phoneix.vn</p>
      </div>

      <div>
        <h4>{{ t('footer.address') }}</h4>
        <p>Ha Noi, Viet Nam</p>
      </div>
    </div>

    <div class="footer-bottom">
      <p>{{ t('footer.copyright') }}</p>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  margin-top: 2.4rem;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
  background: #f9fbff;
}

.footer-grid {
  display: grid;
  grid-template-columns: 2fr repeat(3, 1fr);
  gap: 1rem;
  padding-block: 1.8rem 1.1rem;
}

.footer-grid h3,
.footer-grid h4 {
  margin: 0;
  margin-bottom: 0.4rem;
}

.footer-grid h3 {
  font-size: 1rem;
}

.footer-grid h4 {
  font-size: 0.9rem;
}

.footer-grid p {
  margin: 0;
  color: #475569;
  font-size: 0.9rem;
  line-height: 1.45;
}

.footer-bottom {
  border-top: 1px solid rgba(15, 23, 42, 0.05);
  padding-block: 0.9rem;
  text-align: center;
}

.footer-bottom p {
  margin: 0;
  color: #64748b;
  font-size: 0.82rem;
}

@media (max-width: 900px) {
  .footer-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .footer-grid {
    grid-template-columns: 1fr;
  }
}
</style>
