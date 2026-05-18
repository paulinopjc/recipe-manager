import { apiClient } from './client'
import type { HomepageSpecial } from '@/types/category'

type UpdateInput = Partial<Pick<HomepageSpecial, 'label' | 'style' | 'items' | 'position' | 'is_active'>>

export const homepageSpecialApi = {
  list(): Promise<HomepageSpecial[]> {
    return apiClient.get('/api/v1/homepage-specials').then(r => r.data.data)
  },

  update(type: string, input: UpdateInput): Promise<HomepageSpecial> {
    return apiClient.patch(`/api/v1/homepage-specials/${type}`, input).then(r => r.data.data)
  },
}
