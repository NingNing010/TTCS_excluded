import type { LocationQuery, LocationQueryValue } from 'vue-router'
import type { ProductSearchQuery } from '~/types/search'

const readString = (value: LocationQueryValue | LocationQueryValue[] | undefined): string => {
  if (Array.isArray(value)) {
    return readString(value[0])
  }

  return typeof value === 'string' ? value.trim() : ''
}

const readNumber = (value: LocationQueryValue | LocationQueryValue[] | undefined): number | undefined => {
  const normalized = readString(value)
  if (!normalized) {
    return undefined
  }

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) {
    return undefined
  }

  return parsed
}

const readBoolean = (value: LocationQueryValue | LocationQueryValue[] | undefined): boolean | undefined => {
  const normalized = readString(value).toLowerCase()
  if (!normalized) {
    return undefined
  }

  if (normalized === '1' || normalized === 'true') {
    return true
  }

  if (normalized === '0' || normalized === 'false') {
    return false
  }

  return undefined
}

export const normalizeSearchQuery = (query: LocationQuery): ProductSearchQuery => {
  const keyword = readString(query.q) || readString(query.keyword)

  return {
    keyword,
    type: readString(query.type) || undefined,
    brandName: readString(query.brandName) || undefined,
    minPrice: readNumber(query.minPrice),
    maxPrice: readNumber(query.maxPrice),
    inStockOnly: readBoolean(query.inStockOnly),
    storage: readString(query.storage) || undefined,
    ram: readString(query.ram) || undefined,
    screenType: readString(query.screenType) || undefined,
    scanFrequency: readString(query.scanFrequency) || undefined,
    sortBy: readString(query.sortBy) || undefined,
    page: readNumber(query.page),
    size: readNumber(query.size)
  }
}

export const toRouteSearchQuery = (criteria: ProductSearchQuery): Record<string, string> => {
  const query: Record<string, string> = {}

  if (criteria.keyword) {
    query.q = criteria.keyword
  }

  if (criteria.type) {
    query.type = criteria.type
  }

  if (criteria.brandName) {
    query.brandName = criteria.brandName
  }

  if (typeof criteria.minPrice === 'number' && Number.isFinite(criteria.minPrice)) {
    query.minPrice = String(criteria.minPrice)
  }

  if (typeof criteria.maxPrice === 'number' && Number.isFinite(criteria.maxPrice)) {
    query.maxPrice = String(criteria.maxPrice)
  }

  if (criteria.inStockOnly) {
    query.inStockOnly = 'true'
  }

  if (criteria.storage) {
    query.storage = criteria.storage
  }

  if (criteria.ram) {
    query.ram = criteria.ram
  }

  if (criteria.screenType) {
    query.screenType = criteria.screenType
  }

  if (criteria.scanFrequency) {
    query.scanFrequency = criteria.scanFrequency
  }

  if (criteria.sortBy) {
    query.sortBy = criteria.sortBy
  }

  if (typeof criteria.page === 'number' && Number.isFinite(criteria.page)) {
    query.page = String(criteria.page)
  }

  if (typeof criteria.size === 'number' && Number.isFinite(criteria.size)) {
    query.size = String(criteria.size)
  }

  return query
}
