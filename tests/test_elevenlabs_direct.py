import os
import json
import urllib.request
import urllib.error

def load_env_key():
    """Manually load ELEVENLABS key from .env"""
    try:
        with open(".env", "r") as f:
            for line in f:
                line = line.strip()
                if line.startswith("ELEVENLABS="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    except FileNotFoundError:
        print("Error: .env file not found")
        return None
    return None

def test_elevenlabs_permission():
    api_key = load_env_key()
    if not api_key:
        print("Could not find ELEVENLABS key in .env")
        return

    # print(f"Testing API Key: {api_key[:4]}...{api_key[-4:]}")

    # Endpoint: User Subscription Info (usually safe to check)
    url = "https://api.elevenlabs.io/v1/user/subscription"
    
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json"
    }

    req = urllib.request.Request(url, headers=headers)

    try:
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                print("✅ API Key is valid.")
                print("Subscription Info:")
                print(f"  Tier: {data.get('tier', 'unknown')}")
                print(f"  Character Count: {data.get('character_count', 0)}")
                print(f"  Character Limit: {data.get('character_limit', 0)}")
                print(f"  Can Use Instant Voice Cloning: {data.get('can_use_instant_voice_cloning', False)}")
                print(f"  Can Use Professional Voice Cloning: {data.get('can_use_professional_voice_cloning', False)}")
                
                # Check for specific permissions if listed, but usually 'tier' implies capabilities.
                # The error 'text_to_speech' permission missing usually means the key is restricted or invalid for TTS.

    except urllib.error.HTTPError as e:
        print(f"❌ API Request Failed: {e.code} {e.reason}")
        error_body = e.read().decode()
        print(f"Response Body: {error_body}")
    except Exception as e:
        print(f"❌ An error occurred: {e}")

    # Also try a small TTS generation (dry run if possible, but real one is better to trigger the specific error)
    # We'll try to generate "Hello" just to see if TTS works.
    print("\nAttempting small TTS generation...")
    tts_url = "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM" # Default Rachel voice
    data = {
        "text": "Hello",
        "model_id": "eleven_monolingual_v1", # reliable model
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.5
        }
    }
    
    req_tts = urllib.request.Request(tts_url, data=json.dumps(data).encode('utf-8'), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req_tts) as response:
            if response.status == 200:
                print("✅ TTS Generation Successful (audio data received)")
    except urllib.error.HTTPError as e:
        print(f"❌ TTS Generation Failed: {e.code} {e.reason}")
        print(f"Response Body: {e.read().decode()}")

if __name__ == "__main__":
    test_elevenlabs_permission()
