import apiClient from './client'

export interface StudioSessionState {
  conversations: unknown[]
  conversationNotices: Record<string, unknown>
  activeConversationId?: string
}

export interface StudioSessionLoadResult {
  schema_version: number
  state: StudioSessionState | null
  updated_at?: string | null
}

export async function loadStudioSessionState(): Promise<StudioSessionLoadResult> {
  return apiClient.get<never, StudioSessionLoadResult>('/api/studio-sessions')
}

export async function saveStudioSessionState(state: StudioSessionState): Promise<void> {
  await apiClient.put<never, unknown>('/api/studio-sessions', { state })
}

export async function deleteStudioConversation(conversationId: string): Promise<void> {
  await apiClient.delete<never, unknown>(
    `/api/studio-sessions/conversations/${encodeURIComponent(conversationId)}`,
  )
}

export async function clearStudioSessionState(): Promise<void> {
  await apiClient.delete<never, unknown>('/api/studio-sessions')
}
