import requests
import base64
import wave
import struct
import math
import os
import time

def create_dummy_wav(filename="test_audio.wav", duration=1.0):
    """Creates a simple 1-second sine wave WAV file."""
    sample_rate = 44100
    frequency = 440.0  # A4
    num_samples = int(duration * sample_rate)
    
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 2 bytes per sample (16-bit)
        wav_file.setframerate(sample_rate)
        
        for i in range(num_samples):
            value = int(32767.0 * math.sin(2 * math.pi * frequency * i / sample_rate))
            data = struct.pack('<h', value)
            wav_file.writeframes(data)
    
    print(f"Created dummy audio file: {filename}")
    return filename

def test_voice_query():
    url = "http://localhost:8000/voice-query"
    audio_file = create_dummy_wav()
    
    print(f"Sending request to {url}...")
    
    try:
        with open(audio_file, 'rb') as f:
            files = {'audio': (audio_file, f, 'audio/wav')}
            data = {
                'top_k': 3,
                # 'tts_provider': 'elevenlabs', # Optional
                # 'model': 'gemini-1.5-flash' # Optional
            }
            
            start_time = time.time()
            response = requests.post(url, files=files, data=data)
            end_time = time.time()
            
            print(f"Response status: {response.status_code}")
            print(f"Time taken: {end_time - start_time:.2f}s")
            
            if response.status_code == 200:
                result = response.json()
                print("\n--- Response ---\n")
                print(f"Transcript: {result.get('transcript')}")
                print(f"Answer: {result.get('answer')}")
                print(f"TTS Provider: {result.get('tts_provider')}")
                
                audio_b64 = result.get('audio_base64')
                if audio_b64:
                    output_file = "response_audio.mp3"
                    with open(output_file, "wb") as f_out:
                        f_out.write(base64.b64decode(audio_b64))
                    print(f"\nSaved TTS audio to: {output_file}")
                else:
                    print("\nNo audio data received.")
            else:
                print(f"Error: {response.text}")
                
    except Exception as e:
        print(f"Test failed: {e}")
    finally:
        if os.path.exists(audio_file):
            os.remove(audio_file)
            print(f"Removed dummy file: {audio_file}")

if __name__ == "__main__":
    test_voice_query()
