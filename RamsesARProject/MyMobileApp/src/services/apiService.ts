/**
 * API Service
 * ============
 * Communicates with the FastAPI backend for RAG queries,
 * voice queries, and image descriptions.
 */

import {Platform} from 'react-native';

// Android emulator uses 10.0.2.2 to reach the host machine's localhost
// iOS simulator uses localhost directly
// For physical devices, replace with your machine's local IP
const BASE_URL = Platform.select({
  android: 'http://10.0.2.2:8000',
  ios: 'http://localhost:8000',
}) as string;

// ── Types ──────────────────────────────────────────────────────

export interface QueryResponse {
  answer: string;
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
  audio_base64: string;
  tts_provider: string;
  tts_model: string;
  search_query: string;
  top_k: number;
}

export interface ImageDescriptionResponse {
  descriptions: string[];
}

// ── Text Query ─────────────────────────────────────────────────

export async function sendTextQuery(
  prompt: string,
  imageDescriptions?: string[],
): Promise<QueryResponse> {
  const body: Record<string, unknown> = {prompt};
  if (imageDescriptions && imageDescriptions.length > 0) {
    body.image_descriptions = imageDescriptions;
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
  mimeType: string = 'audio/wav',
): Promise<VoiceQueryResponse> {
  const formData = new FormData();
  formData.append('audio', {
    uri: audioFilePath,
    type: mimeType,
    name: 'recording.wav',
  } as unknown as Blob);

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
