import apiClient, { getAuthToken } from './client'

export const DEFAULT_STUDIO_CONTEXT_ROUNDS = 3

export function isStudioContextRounds(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1
}

export interface StudioSessionState {
  conversations: unknown[]
  conversationNotices: Record<string, unknown>
  activeConversationId?: string
}

export interface StudioSessionLoadResult {
  schema_version: number
  state: StudioSessionState | null
  context_rounds: number
  updated_at?: string | null
}

export async function loadStudioSessionState(expectedAuthToken = getAuthToken()): Promise<StudioSessionLoadResult> {
  const result = await apiClient.get<never, Omit<StudioSessionLoadResult, 'context_rounds'> & {
    context_rounds?: unknown
  }>('/api/studio-sessions', { expectedAuthToken })
  const rounds = result.context_rounds
  return {
    ...result,
    context_rounds: isStudioContextRounds(rounds) ? rounds : DEFAULT_STUDIO_CONTEXT_ROUNDS,
  }
}

export async function saveStudioSessionState(state: StudioSessionState, expectedAuthToken = getAuthToken()): Promise<void> {
  await apiClient.put<never, unknown>('/api/studio-sessions', { state }, { expectedAuthToken })
}

export async function deleteStudioConversation(conversationId: string, expectedAuthToken = getAuthToken()): Promise<void> {
  await apiClient.delete<never, unknown>(
    `/api/studio-sessions/conversations/${encodeURIComponent(conversationId)}`,
    { expectedAuthToken },
  )
}

export async function clearStudioSessionState(expectedAuthToken = getAuthToken()): Promise<void> {
  await apiClient.delete<never, unknown>('/api/studio-sessions', { expectedAuthToken })
}
