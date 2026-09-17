import apiClient from './client'

export interface StudioSessionState {
  conversations: unknown[]
  conversationNotices: Record<string, unknown>
  activeConversationId: string
}

export interface StudioSessionLoadResult {
  schema_version: number
  state: StudioSessionState | null
  updated_at?: string
}

export async function loadStudioSessionState(): Promise<StudioSessionLoadResult> {
  return apiClient.get<StudioSessionLoadResult, StudioSessionLoadResult>('/api/studio-sessions')
}

export async function saveStudioSessionState(state: StudioSessionState): Promise<void> {
  await apiClient.put('/api/studio-sessions', { state })
}

export async function clearStudioSessionState(): Promise<void> {
  await apiClient.delete('/api/studio-sessions')
}
