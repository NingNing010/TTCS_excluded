<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { homeService } from '~/services/home.service'
import { adminProductService } from '~/services/admin-product.service'
import type {
  AdminProductDetailModel,
  AdminProductInfoUpdateRequest,
  AdminProductSpecItem,
  ProductType
} from '~/types/admin-product'
import type { BrandModel } from '~/types/home'

const props = withDefaults(defineProps<{
  product: AdminProductDetailModel | null
  mode?: 'update' | 'create'
  loading?: boolean
  loadError?: string | null
}>(), {
  mode: 'update',
  loading: false,
  loadError: null
})

const emit = defineEmits<{
  refresh: []
  created: [productId: number | null]
}>()

const { t } = useI18n()

const brandOptions = ref<BrandModel[]>([])
const saving = ref(false)
const error = ref('')
const success = ref('')
const showDescriptionPreview = ref(false)

const PRODUCT_TYPES: ProductType[] = ['PHONE', 'CASE', 'CHARGER', 'CABLE']

const isCreateMode = computed(() => props.mode === 'create')
const formTitle = computed(() => (isCreateMode.value ? t('adminCreateProduct.form.title') : t('adminUpdateProduct.form.title')))
const formDescription = computed(() => (isCreateMode.value ? t('adminCreateProduct.form.description') : t('adminUpdateProduct.form.description')))
const formSuccessMessage = computed(() => (isCreateMode.value ? t('adminCreateProduct.form.success') : t('adminUpdateProduct.form.success')))
const formSaveAction = computed(() => (isCreateMode.value ? t('adminCreateProduct.form.saveAction') : t('adminUpdateProduct.form.saveAction')))
const formSavingAction = computed(() => (isCreateMode.value ? t('adminCreateProduct.form.saving') : t('adminUpdateProduct.form.saving')))

const form = reactive({
  name: '',
  type: 'PHONE' as ProductType,
  basePriceInput: '' as string | number,
  brandIdInput: '' as string | number,
  stockAvailableInput: '' as string | number,
  description: '',
  releaseDateInput: '',
  imageUrlsInput: '',
  specs: [{ key: '', value: '' }] as AdminProductSpecItem[]
})

const submitDisabled = computed(() => props.loading || saving.value || (!isCreateMode.value && !props.product))
const descriptionPreviewEmpty = computed(() => form.description.trim().length === 0)

const clearMessages = () => {
  error.value = ''
  success.value = ''
}

const replaceSpecs = (rows: AdminProductSpecItem[]) => {
  form.specs.splice(0, form.specs.length, ...rows)
}

const resetForm = () => {
  form.name = ''
  form.type = 'PHONE'
  form.basePriceInput = ''
  form.brandIdInput = ''
  form.stockAvailableInput = ''
  form.description = ''
  form.releaseDateInput = ''
  form.imageUrlsInput = ''
  showDescriptionPreview.value = false
  replaceSpecs([{ key: '', value: '' }])
}

const toDateTimeLocalValue = (value: string | null): string => {
  if (!value) {
    return ''
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return ''
  }

  const year = parsedDate.getFullYear()
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
  const day = String(parsedDate.getDate()).padStart(2, '0')
  const hours = String(parsedDate.getHours()).padStart(2, '0')
  const minutes = String(parsedDate.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const toApiLocalDateTime = (value: string): string => {
  if (!value) {
    return value
  }

  return value.length === 16 ? `${value}:00` : value
}

const parseInteger = (value: string | number): number | null => {
  const normalized = Number(String(value).trim())
  if (!Number.isInteger(normalized)) {
    return null
  }

  return normalized
}

const parseDecimal = (value: string | number): number | null => {
  const normalized = Number(String(value).trim())
  if (!Number.isFinite(normalized)) {
    return null
  }

  return normalized
}

const isHttpUrl = (value: string) => {
  try {
    const parsedUrl = new URL(value)
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
  } catch {
    return false
  }
}

const inferBrandId = (detail: AdminProductDetailModel): number | null => {
  if (detail.brandId && detail.brandId > 0) {
    return detail.brandId
  }

  const productBrandName = detail.brandName.trim().toLowerCase()
  if (!productBrandName) {
    return null
  }

  const matchedBrand = brandOptions.value.find((brand) => brand.name.trim().toLowerCase() === productBrandName)
  return matchedBrand?.id ?? null
}

const hydrateForm = (detail: AdminProductDetailModel) => {
  const inferredBrandId = inferBrandId(detail)

  form.name = detail.name
  form.type = detail.type
  form.basePriceInput = detail.basePrice > 0 ? String(detail.basePrice) : ''
  form.brandIdInput = inferredBrandId ? String(inferredBrandId) : ''
  form.stockAvailableInput = String(detail.stockAvailable)
  form.description = detail.description
  form.releaseDateInput = toDateTimeLocalValue(detail.releaseDate)
  form.imageUrlsInput = detail.imageUrls.join('\n')
  showDescriptionPreview.value = false

  const specRows = detail.specs.length > 0
    ? detail.specs.map((item) => ({ key: item.key, value: item.value }))
    : [{ key: '', value: '' }]
  replaceSpecs(specRows)
}

const loadBrandOptions = async () => {
  try {
    brandOptions.value = await homeService.getBrands()
  } catch {
    brandOptions.value = []
  }
}

const addSpecRow = () => {
  form.specs.push({ key: '', value: '' })
}

const removeSpecRow = (index: number) => {
  if (form.specs.length <= 1) {
    const firstSpec = form.specs[0]
    if (firstSpec) {
      firstSpec.key = ''
      firstSpec.value = ''
    }

    return
  }

  form.specs.splice(index, 1)
}

const buildRequest = (): AdminProductInfoUpdateRequest | null => {
  const normalizedName = form.name.trim()
  if (!normalizedName) {
    error.value = t('adminUpdateProduct.validation.nameRequired')
    return null
  }

  if (normalizedName.length < 3) {
    error.value = t('adminUpdateProduct.validation.nameTooShort')
    return null
  }

  const normalizedBasePrice = parseDecimal(form.basePriceInput)
  if (normalizedBasePrice === null || normalizedBasePrice <= 0) {
    error.value = t('adminUpdateProduct.validation.basePriceInvalid')
    return null
  }

  const normalizedBrandId = parseInteger(form.brandIdInput)
  if (normalizedBrandId === null || normalizedBrandId <= 0) {
    error.value = t('adminUpdateProduct.validation.brandRequired')
    return null
  }

  const normalizedStock = parseInteger(form.stockAvailableInput)
  if (normalizedStock === null || normalizedStock < 0) {
    error.value = t('adminUpdateProduct.validation.stockInvalid')
    return null
  }

  const normalizedSpecs = form.specs
    .map((row) => ({
      key: row.key.trim(),
      value: row.value.trim()
    }))
    .filter((row) => row.key.length > 0 || row.value.length > 0)

  if (normalizedSpecs.some((row) => row.key.length === 0 || row.value.length === 0)) {
    error.value = t('adminUpdateProduct.validation.specPairInvalid')
    return null
  }

  const specsObject = normalizedSpecs.length > 0
    ? normalizedSpecs.reduce<Record<string, string>>((acc, row) => {
        acc[row.key] = row.value
        return acc
      }, {})
    : undefined

  const imageUrls = form.imageUrlsInput
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  const invalidImageUrl = imageUrls.find((url) => !isHttpUrl(url))
  if (invalidImageUrl) {
    error.value = t('adminUpdateProduct.validation.imageUrlInvalid')
    return null
  }

  const normalizedReleaseDate = form.releaseDateInput.trim()
  if (normalizedReleaseDate) {
    const parsedDate = new Date(normalizedReleaseDate)
    if (Number.isNaN(parsedDate.getTime())) {
      error.value = t('adminUpdateProduct.validation.releaseDateInvalid')
      return null
    }
  }

  const request: AdminProductInfoUpdateRequest = {
    name: normalizedName,
    type: form.type,
    basePrice: normalizedBasePrice,
    brandId: normalizedBrandId,
    stockAvailable: normalizedStock
  }

  const normalizedDescription = form.description.trim()
  if (normalizedDescription.length > 0) {
    request.description = form.description
  }

  if (normalizedReleaseDate) {
    request.releaseDate = toApiLocalDateTime(normalizedReleaseDate)
  }

  if (specsObject && Object.keys(specsObject).length > 0) {
    request.specs = specsObject
  }

  if (imageUrls.length > 0) {
    request.imageUrls = imageUrls
  }

  return request
}

const submitForm = async () => {
  clearMessages()

  const updateProductId = isCreateMode.value ? null : props.product?.id ?? null

  if (!isCreateMode.value && !updateProductId) {
    error.value = t('adminUpdateProduct.validation.productRequired')
    return
  }

  const requestBody = buildRequest()
  if (!requestBody) {
    return
  }

  saving.value = true

  try {
    if (isCreateMode.value) {
      const createdProduct = await adminProductService.createProduct(requestBody)
      success.value = formSuccessMessage.value
      emit('created', createdProduct?.id ?? null)
      resetForm()
    } else {
      await adminProductService.updateProductInfo(updateProductId as number, requestBody)
      success.value = formSuccessMessage.value
      emit('refresh')
    }
  } catch (requestError) {
    error.value = toErrorMessage(requestError)
  } finally {
    saving.value = false
  }
}

const toggleDescriptionPreview = () => {
  showDescriptionPreview.value = !showDescriptionPreview.value
}

const extractMessagesFromPayload = (payload: unknown): string[] => {
  if (!payload || typeof payload !== 'object') {
    return []
  }

  const record = payload as Record<string, unknown>
  const collected: string[] = []

  const appendMessage = (value: unknown) => {
    if (typeof value === 'string' && value.trim().length > 0) {
      collected.push(value.trim())
    }
  }

  appendMessage(record.message)
  appendMessage(record.error)
  appendMessage(record.detail)

  const appendFromArray = (value: unknown) => {
    if (!Array.isArray(value)) {
      return
    }

    for (const entry of value) {
      if (typeof entry === 'string') {
        appendMessage(entry)
        continue
      }

      if (entry && typeof entry === 'object') {
        const row = entry as Record<string, unknown>
        appendMessage(row.message)
        appendMessage(row.defaultMessage)
        appendMessage(row.error)
      }
    }
  }

  appendFromArray(record.errors)
  appendFromArray(record.details)
  appendFromArray(record.violations)

  const fieldErrors = record.fieldErrors ?? record.validationErrors
  if (fieldErrors && typeof fieldErrors === 'object' && !Array.isArray(fieldErrors)) {
    for (const [field, value] of Object.entries(fieldErrors as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string' && item.trim().length > 0) {
            collected.push(`${field}: ${item.trim()}`)
          }
        }
      } else if (typeof value === 'string' && value.trim().length > 0) {
        collected.push(`${field}: ${value.trim()}`)
      }
    }
  }

  return Array.from(new Set(collected))
}

const toErrorMessage = (requestError: unknown) => {
  if (requestError && typeof requestError === 'object') {
    const raw = requestError as {
      message?: unknown
      statusCode?: unknown
      response?: { status?: unknown; _data?: unknown } | undefined
      data?: unknown
    }

    const statusCode =
      (typeof raw.statusCode === 'number' ? raw.statusCode : null) ??
      (typeof raw.response?.status === 'number' ? raw.response.status : null)

    if (statusCode === 401 || statusCode === 403) {
      return t('adminUpdateProduct.errors.unauthorized')
    }

    const payload = raw.data ?? raw.response?._data
    const payloadMessages = extractMessagesFromPayload(payload)
    if (payloadMessages.length > 0) {
      return payloadMessages.join('\n')
    }

    if (typeof raw.message === 'string' && raw.message.trim().length > 0) {
      return raw.message
    }
  }

  return isCreateMode.value ? t('adminCreateProduct.errors.createFailed') : t('adminUpdateProduct.errors.updateFailed')
}

watch(
  () => props.product,
  (detail) => {
    clearMessages()

    if (!detail) {
      if (isCreateMode.value) {
        return
      }

      resetForm()
      return
    }

    hydrateForm(detail)
  },
  { immediate: true }
)

watch(
  () => brandOptions.value,
  () => {
    if (!props.product) {
      return
    }

    const currentBrandId = parseInteger(form.brandIdInput)
    if (currentBrandId && currentBrandId > 0) {
      return
    }

    const inferredBrandId = inferBrandId(props.product)
    if (inferredBrandId) {
      form.brandIdInput = String(inferredBrandId)
    }
  },
  { deep: true }
)

void loadBrandOptions()
</script>

<template>
  <section class="surface-card admin-update-form-panel">
    <div class="admin-update-form-head">
      <h2 class="admin-update-form-title">{{ formTitle }}</h2>
    </div>

    <p class="admin-update-form-subtitle">{{ formDescription }}</p>

    <p v-if="props.loadError" class="admin-update-form-error">{{ props.loadError }}</p>
    <p v-if="error" class="admin-update-form-error">{{ error }}</p>
    <p v-if="success" class="admin-update-form-success">{{ success }}</p>

    <div v-if="props.loading" class="admin-update-placeholder">
      {{ t('adminUpdateProduct.form.loading') }}
    </div>

    <div v-else-if="!isCreateMode && !props.product" class="admin-update-placeholder">
      {{ t('adminUpdateProduct.form.selectProductHint') }}
    </div>

    <form v-else class="admin-update-form" novalidate @submit.prevent="submitForm">
      <div v-if="!isCreateMode && props.product" class="admin-update-product-meta">
        <p>#{{ props.product.id }}</p>
        <p>{{ props.product.brandName || '-' }}</p>
        <p>{{ props.product.type }}</p>
      </div>

      <label class="admin-field">
        <span>{{ t('adminUpdateProduct.form.fields.name') }}</span>
        <input v-model="form.name" type="text" :disabled="saving" />
      </label>

      <div class="admin-update-grid-two">
        <label class="admin-field">
          <span>{{ t('adminUpdateProduct.form.fields.type') }}</span>
          <select v-model="form.type" :disabled="saving">
            <option v-for="productType in PRODUCT_TYPES" :key="productType" :value="productType">
              {{ productType }}
            </option>
          </select>
        </label>

        <label class="admin-field">
          <span>{{ t('adminUpdateProduct.form.fields.brand') }}</span>
          <select v-model="form.brandIdInput" :disabled="saving">
            <option value="">{{ t('adminUpdateProduct.form.placeholders.brand') }}</option>
            <option v-for="brand in brandOptions" :key="brand.id" :value="String(brand.id)">
              {{ brand.name }}
            </option>
          </select>
        </label>
      </div>

      <div class="admin-update-grid-two">
        <label class="admin-field">
          <span>{{ t('adminUpdateProduct.form.fields.basePrice') }}</span>
          <input v-model="form.basePriceInput" type="number" min="0.01" step="0.01" :disabled="saving" />
        </label>

        <label class="admin-field">
          <span>{{ t('adminUpdateProduct.form.fields.stockAvailable') }}</span>
          <input v-model="form.stockAvailableInput" type="number" min="0" step="1" :disabled="saving" />
        </label>
      </div>

      <label class="admin-field">
        <span>{{ t('adminUpdateProduct.form.fields.releaseDate') }}</span>
        <input v-model="form.releaseDateInput" type="datetime-local" :disabled="saving" />
      </label>

      <label class="admin-field">
        <span>{{ t('adminUpdateProduct.form.fields.description') }}</span>
        <textarea
          v-model="form.description"
          rows="5"
          :placeholder="t('adminUpdateProduct.form.placeholders.description')"
          :disabled="saving"
        />
      </label>

      <div class="admin-description-toolbar">
        <button
          type="button"
          class="admin-description-preview-toggle"
          :disabled="saving"
          @click="toggleDescriptionPreview"
        >
          {{ showDescriptionPreview ? t('adminUpdateProduct.form.hidePreview') : t('adminUpdateProduct.form.showPreview') }}
        </button>
      </div>

      <div v-if="showDescriptionPreview" class="admin-description-preview">
        <p class="admin-description-preview-title">{{ t('adminUpdateProduct.form.descriptionPreviewTitle') }}</p>
        <p v-if="descriptionPreviewEmpty" class="admin-description-preview-empty">
          {{ t('adminUpdateProduct.form.descriptionPreviewEmpty') }}
        </p>
        <div v-else class="admin-description-preview-content" v-html="form.description" />
      </div>

      <label class="admin-field">
        <span>{{ t('adminUpdateProduct.form.fields.imageUrls') }}</span>
        <textarea
          v-model="form.imageUrlsInput"
          rows="4"
          :placeholder="t('adminUpdateProduct.form.placeholders.imageUrls')"
          :disabled="saving"
        />
      </label>

      <div class="admin-spec-section">
        <div class="admin-spec-head">
          <p>{{ t('adminUpdateProduct.form.fields.specs') }}</p>
          <button type="button" class="admin-spec-add" :disabled="saving" @click="addSpecRow">
            {{ t('adminUpdateProduct.form.addSpec') }}
          </button>
        </div>

        <div class="admin-spec-list">
          <div v-for="(spec, index) in form.specs" :key="index" class="admin-spec-row">
            <input
              v-model="spec.key"
              type="text"
              :placeholder="t('adminUpdateProduct.form.placeholders.specKey')"
              :disabled="saving"
            />
            <input
              v-model="spec.value"
              type="text"
              :placeholder="t('adminUpdateProduct.form.placeholders.specValue')"
              :disabled="saving"
            />
            <button type="button" class="admin-spec-remove" :disabled="saving" @click="removeSpecRow(index)">
              {{ t('adminUpdateProduct.form.removeSpec') }}
            </button>
          </div>
        </div>
      </div>

      <button type="submit" class="admin-update-submit" :disabled="submitDisabled">
        {{ saving ? formSavingAction : formSaveAction }}
      </button>
    </form>
  </section>
</template>

<style scoped>
.admin-update-form-panel {
  margin-top: 1.1rem;
  padding: clamp(1rem, 2.4vw, 1.8rem);
}

.admin-update-form-head {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.8rem;
}

.admin-update-form-title {
  margin: 0;
  font-size: clamp(1.15rem, 2vw, 1.5rem);
  font-weight: 800;
}

.admin-update-form-subtitle {
  margin: 0.45rem 0 0;
  color: #475569;
  font-size: 0.9rem;
}

.admin-update-form-error,
.admin-update-form-success,
.admin-update-placeholder {
  margin: 0.85rem 0 0;
  font-size: 0.84rem;
}

.admin-update-form-error {
  color: #b42318;
  white-space: pre-line;
}

.admin-update-form-success {
  color: #0f9f6e;
}

.admin-update-placeholder {
  color: #475569;
}

.admin-update-form {
  margin-top: 0.95rem;
  display: grid;
  gap: 0.7rem;
}

.admin-update-product-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.admin-update-product-meta p {
  margin: 0;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  padding: 0.2rem 0.65rem;
  color: #334155;
  font-size: 0.78rem;
  font-weight: 700;
}

.admin-field {
  display: grid;
  gap: 0.35rem;
}

.admin-field span {
  color: #334155;
  font-size: 0.83rem;
  font-weight: 700;
}

.admin-field input,
.admin-field textarea,
.admin-field select,
.admin-spec-row input {
  width: 100%;
  border: 1px solid rgba(15, 23, 42, 0.13);
  border-radius: 10px;
  background: #fff;
  color: #0f172a;
  font-size: 0.9rem;
  padding: 0.55rem 0.7rem;
}

.admin-field textarea {
  resize: vertical;
}

.admin-description-toolbar {
  display: flex;
  justify-content: flex-start;
}

.admin-description-preview-toggle {
  border: 1px solid rgba(31, 94, 255, 0.3);
  border-radius: 10px;
  background: rgba(31, 94, 255, 0.08);
  color: #1f5eff;
  min-height: 2.1rem;
  padding: 0.4rem 0.8rem;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}

.admin-description-preview {
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 12px;
  padding: 0.75rem;
  background: rgba(248, 250, 252, 0.82);
}

.admin-description-preview-title,
.admin-description-preview-empty {
  margin: 0;
  color: #334155;
  font-size: 0.83rem;
}

.admin-description-preview-title {
  font-weight: 700;
}

.admin-description-preview-empty {
  margin-top: 0.55rem;
  color: #64748b;
}

.admin-description-preview-content {
  margin-top: 0.6rem;
  color: #0f172a;
  font-size: 0.9rem;
  line-height: 1.45;
  word-break: break-word;
}

.admin-description-preview-content :deep(img) {
  max-width: 100%;
  height: auto;
}

.admin-update-grid-two {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.admin-spec-section {
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 12px;
  padding: 0.75rem;
  background: rgba(248, 250, 252, 0.8);
}

.admin-spec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
}

.admin-spec-head p {
  margin: 0;
  color: #334155;
  font-size: 0.83rem;
  font-weight: 700;
}

.admin-spec-add,
.admin-spec-remove {
  border: 1px solid rgba(15, 23, 42, 0.14);
  border-radius: 10px;
  background: #fff;
  color: #334155;
  min-height: 2rem;
  padding: 0.3rem 0.65rem;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

.admin-spec-list {
  margin-top: 0.65rem;
  display: grid;
  gap: 0.5rem;
}

.admin-spec-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 0.45rem;
}

.admin-update-submit {
  border: 1px solid rgba(31, 94, 255, 0.32);
  border-radius: 10px;
  background: rgba(31, 94, 255, 0.08);
  color: #1f5eff;
  min-height: 2.3rem;
  padding: 0.45rem 0.9rem;
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
}

.admin-update-submit:disabled,
.admin-description-preview-toggle:disabled,
.admin-spec-add:disabled,
.admin-spec-remove:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

@media (max-width: 760px) {
  .admin-update-grid-two {
    grid-template-columns: 1fr;
  }

  .admin-spec-row {
    grid-template-columns: 1fr;
  }
}
</style>
