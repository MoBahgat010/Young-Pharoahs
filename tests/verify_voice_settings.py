from unittest.mock import MagicMock, patch
import os
import sys

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config import settings
from app.services.tts_service import TTSService

def verify_voice_settings():
    print("Verifying TTS Settings...")
    
    # Reload settings to ensure we get the latest
    # In a real app run, settings are loaded once, but here we want to check what we just changed
    # However, since we import 'settings' instance, it should reflect the file change if we re-instantiate or if we trust the file edit.
    # Let's just print what we see.
    print(f"Default TTS Provider: {settings.tts_provider}")
    assert settings.tts_provider == "elevenlabs", f"Expected 'elevenlabs', got '{settings.tts_provider}'"
    
    # Mock requests to avoid real API calls
    with patch("app.services.tts_service.requests.post") as mock_post:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = b"fake_audio"
        mock_post.return_value = mock_response
        
        service = TTSService(settings)
        
        # Test Case 1: Default (No voice specified) logic checks
        # If I call synthesize without voice, what happens?
        # The logic in tts_service.py:
        # synthesize -> tts_elevenlabs(voice=None)
        # tts_elevenlabs -> voice_id = voice (None)
        # if voice_id in (None, 'female', 'male') -> logic needed.
        # Wait, let's look at tts_service.py again.
        
        print("\nTest Case 1: synthesize(text='hello') [No params]")
        service.synthesize("hello")
        
        # Verify it called ElevenLabs
        args, kwargs = mock_post.call_args
        url = args[0]
        payload = kwargs['json']
        headers = kwargs['headers']
        
        print(f"Called URL: {url}")
        assert "api.elevenlabs.io" in url, "Should use ElevenLabs API"
        assert settings.elevenlabs_api_key in headers['xi-api-key'], "Should use configured API Key"
        
        # Check defaults logic in tts_service.py
        # if voice_id in (None, "female", "male"):
        #    if voice_id == "male": ... else: ... (defaults to female)
        # So None -> defaults to female voice ID
        expected_female_voice = settings.elevenlabs_voice_female or settings.elevenlabs_voice_male
        assert expected_female_voice in url, f"Expected female voice ID {expected_female_voice} in URL"
        print("✅ Default is ElevenLabs + Female Voice")

        # Test Case 2: Explicit Male Voice
        print("\nTest Case 2: synthesize(text='hello', voice='male')")
        service.synthesize("hello", voice="male")
        
        args, kwargs = mock_post.call_args
        url = args[0]
        expected_male_voice = settings.elevenlabs_voice_male or settings.elevenlabs_voice_female
        print(f"Called URL: {url}")
        assert expected_male_voice in url, f"Expected male voice ID {expected_male_voice} in URL"
        print("✅ voice='male' uses Male Voice ID")

        # Test Case 3: Explicit Female Voice
        print("\nTest Case 3: synthesize(text='hello', voice='female')")
        service.synthesize("hello", voice="female")
        
        args, kwargs = mock_post.call_args
        url = args[0]
        print(f"Called URL: {url}")
        assert expected_female_voice in url, f"Expected female voice ID {expected_female_voice} in URL"
        print("✅ voice='female' uses Female Voice ID")

if __name__ == "__main__":
    try:
        verify_voice_settings()
        print("\n🎉 All verifications passed!")
    except AssertionError as e:
        print(f"\n❌ Verification Failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ An error occurred: {e}")
        sys.exit(1)
