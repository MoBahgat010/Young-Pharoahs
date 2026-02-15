// Audio service - simulated for now, will integrate with API later

export interface AudioResponse {
  url: string;
  duration: number;
}

// Simulated audio URLs - replace with real API calls later
// Audio files should be placed on phone at: /sdcard/RamsesAR/
// Use: adb push D:\Young-Pharoahs\response_audio.mp3 /sdcard/RamsesAR/
const MOCK_AUDIO: Record<string, AudioResponse> = {
  ramses: {
    url: 'file:///sdcard/RamsesAR/response_audio.mp3',
    duration: 5000,
  },
  cleopatra: {
    url: 'file:///sdcard/RamsesAR/response_audio.mp3',
    duration: 5000,
  },
  tutankhamun: {
    url: 'file:///sdcard/RamsesAR/response_audio.mp3',
    duration: 5000,
  },
};

/**
 * Fetch audio for a character
 * Currently returns mock data, will be replaced with real API call
 */
export async function fetchCharacterAudio(
  characterId: string,
): Promise<AudioResponse> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const audio = MOCK_AUDIO[characterId];
  if (!audio) {
    throw new Error(`No audio found for character: ${characterId}`);
  }

  return audio;
}

/**
 * Future API integration point
 * Replace the implementation above with:
 *
 * export async function fetchCharacterAudio(characterId: string): Promise<AudioResponse> {
 *   const response = await fetch(`YOUR_API_URL/audio/${characterId}`);
 *   if (!response.ok) throw new Error('Failed to fetch audio');
 *   return response.json();
 * }
 */
