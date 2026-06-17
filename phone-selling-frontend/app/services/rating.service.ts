import { useApiClient } from '~/composables/useApiClient'
import type { RatingModerationRequest, RatingRequest, RatingResponse } from '~/types/api'

export const ratingService = {
  async createOrUpdateRating(payload: RatingRequest) {
    const api = useApiClient()

    return api<RatingResponse>('/api/ratings', {
      method: 'POST',
      body: payload
    })
  },

  async moderateRating(ratingId: number, payload: RatingModerationRequest) {
    if (!Number.isInteger(ratingId) || ratingId <= 0) {
      throw new Error('Invalid rating id')
    }

    const api = useApiClient()

    return api<RatingResponse>(`/api/admin/ratings/${ratingId}`, {
      method: 'PATCH',
      body: payload
    })
  }
}
