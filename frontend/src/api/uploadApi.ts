import { apiClient } from './client'

export const uploadApi = {
  coverImage(file: File): Promise<{ url: string }> {
    const form = new FormData()
    form.append('file', file)
    return apiClient.post('/api/v1/upload/cover-image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
}