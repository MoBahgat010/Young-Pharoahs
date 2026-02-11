/**
 * API Service
 * ============
 * Communicates with the FastAPI backend for RAG queries,
 * voice queries, and image descriptions.
 */

const BASE_URL = 'https://8jhl85nn-8000.uks1.devtunnels.ms';

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
): Promise<QueryResponse> {
  const body: Record<string, unknown> = {prompt, gender};
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
  options?: {
    mimeType?: string;
    gender?: 'male' | 'female';
    tts_provider?: string;
    tts_model?: string;
    stt_model?: string;
  },
): Promise<VoiceQueryResponse> {
  const {mimeType = 'audio/wav', gender, tts_provider, tts_model, stt_model} = options ?? {};
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
