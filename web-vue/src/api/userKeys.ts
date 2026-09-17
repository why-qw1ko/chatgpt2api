import apiClient from './client'

export interface UserKey {
  id: string
  name: string
  role: 'user' | 'admin'
  enabled: boolean
  created_at?: string | null
  last_used_at?: string | null
  daily_image_limit?: number | null
}

export interface UserKeysResponse {
  items: UserKey[]
}

export interface UserKeyCreatePayload {
  name: string
  daily_image_limit?: number | null
}
export interface UserKeyCreateResponse {
  item: UserKey
  raw_key: string
}

export interface UserKeyUpdatePayload {
  name?: string
  enabled?: boolean
  key?: string
  daily_image_limit?: number | null
}

export interface UserKeyUpdateResponse {
  item: UserKey
}

export interface UserKeyDeleteResponse {
  deleted_id: string
}

export const userKeysApi = {
  list: () => apiClient.get<never, UserKeysResponse>('/api/auth/users'),

  create: (name: string, dailyImageLimit?: number | null) =>
    apiClient.post<UserKeyCreatePayload, UserKeyCreateResponse>('/api/auth/users', {
      name,
      ...(dailyImageLimit != null ? { daily_image_limit: dailyImageLimit } : {}),
    }),

  update: (keyId: string, updates: UserKeyUpdatePayload) =>
    apiClient.post<UserKeyUpdatePayload, UserKeyUpdateResponse>(`/api/auth/users/${keyId}`, updates),

  delete: (keyId: string) =>
    apiClient.delete<never, UserKeyDeleteResponse>(`/api/auth/users/${keyId}`),
}
