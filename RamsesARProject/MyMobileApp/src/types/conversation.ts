/**
 * Conversation types for multi-turn chat and history management.
 * Aligned with the backend API contracts from FRONTEND_README.
 */

// ── Message Types ─────────────────────────────────────────────

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  audio_base64?: string;
  image_urls?: string[];
}

// ── Chat Message (local UI state) ─────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  imageUri?: string;
  audioBase64?: string;
  voiceFilePath?: string;
  voiceDurationMs?: number;
  isLoadingTTS?: boolean;
  generatedImageBase64?: string;
}

// ── Conversation List ─────────────────────────────────────────

export interface ConversationPreview {
  conversation_id: string;
  created_at: string;
  updated_at: string;
  last_message: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  };
}

export interface ConversationsListResponse {
  conversations: ConversationPreview[];
}

// ── Conversation Detail ───────────────────────────────────────

export interface ConversationDetail {
  conversation_id: string;
  messages: ConversationMessage[];
}

// ── TTS ───────────────────────────────────────────────────────

export interface TTSResponse {
  answer: string;
  conversation_id: string;
  audio_base64: string;
  tts_provider: string;
  tts_model: string;
}
