/**
 * API Service
 * ============
 * Communicates with the FastAPI backend for RAG queries,
 * voice queries, image descriptions, conversations, and TTS.
 */

import type {
  ConversationsListResponse,
  ConversationDetail,
  TTSResponse,
} from '../types/conversation';

const BASE_URL = 'http://192.241.170.15:80';

// ── Types ──────────────────────────────────────────────────────

export interface QueryResponse {
  answer: string;
  conversation_id: string;
  image_descriptions: string[];
  search_query: string;
  top_k: number;
  audio_base64?: string | null;
  tts_provider?: string | null;
  tts_model?: string | null;
}

export interface VoiceQueryResponse {
  transcript: string;
  answer: string;
  conversation_id: string;
  audio_base64: string;
  tts_provider: string;
  tts_model: string;
  search_query: string;
  top_k: number;
}

export interface ImageDescriptionResponse {
  descriptions: string[];
}

export interface Monument {
  name: string;
  details: string;
  location_name: string;
  location_url: string;
  image_url: string;
  location_image_url: string;
  certain_location?: string;
  uber_link?: string;
}

export interface PharaohDetailsResponse {
  king_name: string;
  monuments: Monument[];
}

export interface PharaohSearchResult {
  king_name: string;
  monuments: Monument[];
}

export interface PharaohSearchResponse {
  results: PharaohSearchResult[];
}

// ── Nearby Places Types ────────────────────────────────────────

export interface NearbyPlace {
  name: string;
  address: string;
  rating: number | null;
  total_ratings: number | null;
  location: {lat: number; lng: number};
  open_now: boolean | null;
  place_id: string;
  types: string[];
}

export interface MonumentNearbyResponse {
  king_name: string;
  monument: string;
  location: {lat: number; lng: number};
  uber_link: string;
  restaurants: NearbyPlace[];
  hotels: NearbyPlace[];
}

// ── Text Query ─────────────────────────────────────────────────

export async function sendTextQuery(
  prompt: string,
  imageDescriptions?: string[],
  gender: 'male' | 'female' = 'male',
  conversationId?: string | null,
): Promise<QueryResponse> {
  const body: Record<string, unknown> = {prompt, gender};
  if (imageDescriptions && imageDescriptions.length > 0) {
    body.image_descriptions = imageDescriptions;
  }
  if (conversationId) {
    body.conversation_id = conversationId;
  }

  const res = await fetch(`${BASE_URL}/query`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Query failed (${res.status}): ${err}`);
  }

  return res.json();
}

// ── Voice Query ────────────────────────────────────────────────

export async function sendVoiceQuery(
  audioFilePath: string,
  options?: {
    mimeType?: string;
    gender?: 'male' | 'female';
    tts_provider?: string;
    tts_model?: string;
    stt_model?: string;
    conversationId?: string | null;
  },
): Promise<VoiceQueryResponse> {
  const {mimeType = 'audio/wav', gender, tts_provider, tts_model, stt_model, conversationId} = options ?? {};
  const formData = new FormData();
  formData.append('audio', {
    uri: audioFilePath,
    type: mimeType,
    name: 'recording.wav',
  } as unknown as Blob);
  if (gender) { formData.append('gender', gender); }
  if (tts_provider) { formData.append('tts_provider', tts_provider); }
  if (tts_model) { formData.append('tts_model', tts_model); }
  if (stt_model) { formData.append('stt_model', stt_model); }
  if (conversationId) { formData.append('conversation_id', conversationId); }

  const res = await fetch(`${BASE_URL}/voice-query`, {
    method: 'POST',
    body: formData,
    // Don't set Content-Type — fetch auto-sets multipart boundary
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Voice query failed (${res.status}): ${err}`);
  }

  return res.json();
}

// ── Image Description ──────────────────────────────────────────

export async function describeImages(
  imageUris: string[],
): Promise<ImageDescriptionResponse> {
  const formData = new FormData();
  imageUris.forEach((uri, idx) => {
    formData.append('images', {
      uri,
      type: 'image/jpeg',
      name: `image_${idx}.jpg`,
    } as unknown as Blob);
  });

  const res = await fetch(`${BASE_URL}/describe-images`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Image description failed (${res.status}): ${err}`);
  }

  return res.json();
}

// ── Pharaoh Details (Monuments) ────────────────────────────────

export async function fetchPharaohMonuments(
  kingName: string,
): Promise<PharaohDetailsResponse> {
  const res = await fetch(`${BASE_URL}/pharaohs/${encodeURIComponent(kingName)}`);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pharaoh details failed (${res.status}): ${err}`);
  }

  return res.json();
}

// ── Search Pharaohs Monuments ──────────────────────────────────

export async function searchPharaohsMonuments(
  query: string = '',
): Promise<PharaohSearchResponse> {
  const res = await fetch(
    `${BASE_URL}/pharaohs/search?q=${encodeURIComponent(query)}`,
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pharaoh search failed (${res.status}): ${err}`);
  }

  return res.json();
}

// ── Text-to-Speech ─────────────────────────────────────────────

export async function sendTTS(
  text: string,
  conversationId?: string | null,
  gender?: 'male' | 'female',
  ttsModel?: string,
): Promise<TTSResponse> {
  const formData = new FormData();
  formData.append('text', text);
  if (conversationId) { formData.append('conversation_id', conversationId); }
  if (gender) { formData.append('gender', gender); }
  if (ttsModel) { formData.append('tts_model', ttsModel); }

  const res = await fetch(`${BASE_URL}/tts`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TTS failed (${res.status}): ${err}`);
  }

  return res.json();
}

// ── Conversations ──────────────────────────────────────────────

export async function fetchConversations(
  limit: number = 20,
): Promise<ConversationsListResponse> {
  const res = await fetch(`${BASE_URL}/conversations?limit=${limit}`);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Fetch conversations failed (${res.status}): ${err}`);
  }

  return res.json();
}

export async function fetchConversation(
  conversationId: string,
): Promise<ConversationDetail> {
  const res = await fetch(`${BASE_URL}/conversations/${encodeURIComponent(conversationId)}`);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Fetch conversation failed (${res.status}): ${err}`);
  }

  return res.json();
}

export async function createConversation(): Promise<{conversation_id: string}> {
  const res = await fetch(`${BASE_URL}/conversations`, {
    method: 'POST',
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Create conversation failed (${res.status}): ${err}`);
  }

  return res.json();
}

export async function deleteConversation(
  conversationId: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/conversations/${encodeURIComponent(conversationId)}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Delete conversation failed (${res.status}): ${err}`);
  }
}

// ── Monument Nearby Places ─────────────────────────────────────

export async function fetchMonumentNearby(
  kingName: string,
  monumentName: string,
): Promise<MonumentNearbyResponse> {
  const res = await fetch(
    `${BASE_URL}/pharaohs/${encodeURIComponent(kingName)}/monuments/${encodeURIComponent(monumentName)}/nearby`,
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Monument nearby failed (${res.status}): ${err}`);
  }

  return res.json();
}
