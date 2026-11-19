import apiClient from './client'

export interface UserKey {
  id: string
  name: string
  role: 'user' | 'admin'
  enabled: boolean
  created_at?: string | null
  last_used_at?: string | null
  daily_image_limit?: number | null
  image_usage?: {
    day: string
    used: number
    reserved: number
    limit: number | null
    remaining: number | null
  } | null
}

export interface UserKeysResponse {
  items: UserKey[]
}

export interface UserKeyCreatePayload {
  name: string
  key?: string
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

  create: (payload: UserKeyCreatePayload) =>
    apiClient.post<UserKeyCreatePayload, UserKeyCreateResponse>('/api/auth/users', payload),

  update: (keyId: string, updates: UserKeyUpdatePayload) =>
    apiClient.post<UserKeyUpdatePayload, UserKeyUpdateResponse>(`/api/auth/users/${encodeURIComponent(keyId)}`, updates),

  rotate: (keyId: string) =>
    apiClient.post<never, UserKeyCreateResponse>(`/api/auth/users/${encodeURIComponent(keyId)}/rotate`),

  delete: (keyId: string) =>
    apiClient.delete<never, UserKeyDeleteResponse>(`/api/auth/users/${encodeURIComponent(keyId)}`),
}
