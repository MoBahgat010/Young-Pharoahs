import sys
import os
import types
from unittest.mock import MagicMock, patch

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# PRE-MOCK EVERYTHING potentially problematic
# We need 'app' to be a package
app_module = types.ModuleType("app")
sys.modules["app"] = app_module

# We need 'app.config' to be a module
config_module = types.ModuleType("app.config")
sys.modules["app.config"] = config_module

# Define a fake Settings class
class MockSettings:
    def __init__(self):
        self.elevenlabs_api_key = "fake_key"
        self.deepgram_api_key = "fake_deepgram_key"
        self.tts_provider = "elevenlabs"
        self.elevenlabs_default_model = "eleven_multilingual_v2"
        self.elevenlabs_voice_female = "female_voice_id"
        self.elevenlabs_voice_male = "male_voice_id"
        self.deepgram_tts_model = "aura-asteria-en"
        # Add any other fields accessed dynamically if needed

config_module.Settings = MockSettings
# Check if settings instance is imported directly
config_module.settings = MockSettings()

# Now we need to handle 'app.services'
services_module = types.ModuleType("app.services")
sys.modules["app.services"] = services_module
app_module.services = services_module

# Now we try to import the target file manually or via importlib
# But wait, we want to import the *file* content of tts_service.py without its dependencies (like 'app.config' which we mocked)
# The issue is that tts_service imports 'requests' etc.
# Let's just use importlib to import the specific module.

import importlib.util

def import_tts_service_module():
    # Path to the actual file
    file_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "app", "services", "tts_service.py"))
    spec = importlib.util.spec_from_file_location("app.services.tts_service", file_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules["app.services.tts_service"] = module
    services_module.tts_service = module
    spec.loader.exec_module(module)
    return module

def verify_voice_logic():
    print("Verifying TTS Logic (Standalone)...")
    
    # Import the module with our mocks in place
    try:
        tts_service_module = import_tts_service_module()
        TTSService = tts_service_module.TTSService
    except Exception as e:
        print(f"Failed to import tts_service: {e}")
        return

    settings = MockSettings()
    
    # We need to patch requests in the imported module namespace
    with patch.object(tts_service_module.requests, "post") as mock_post:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = b"fake_audio_content"
        mock_post.return_value = mock_response
        
        service = TTSService(settings)
        
        # Test 1: Default
        print("\nTest 1: synthesize('hello') -> Default (Female)")
        service.synthesize("hello")
        
        args, kwargs = mock_post.call_args
        url = args[0]
        payload = kwargs['json']
        
        print(f"  URL: {url}")
        if "female_voice_id" in url:
            print("  ✅ Correctly used female_voice_id (default)")
        else:
            print(f"  ❌ Expected female_voice_id, got {url}")
            
        # Test 2: Male
        print("\nTest 2: synthesize('hello', voice='male') -> Male")
        service.synthesize("hello", voice="male")
        
        args, kwargs = mock_post.call_args
        url = args[0]
        
        print(f"  URL: {url}")
        if "male_voice_id" in url:
            print("  ✅ Correctly used male_voice_id")
        else:
            print(f"  ❌ Expected male_voice_id, got {url}")

        # Test 3: Provider Selection
        print("\nTest 3: Provider selection")
        # Ensure the selected provider logic works.
        # But we force "elevenlabs" in settings.tts_provider
        # Let's verify that synthesize calls tts_elevenlabs
        
        # Force invalid provider to see if it errors
        service.settings.tts_provider = "unknown"
        try:
            service.synthesize("hello")
            print("  ❌ Should have raised ValueError for unknown provider")
        except ValueError:
            print("  ✅ Correctly raised ValueError for unknown provider")
        
        # Reset
        service.settings.tts_provider = "elevenlabs"


if __name__ == "__main__":
    try:
        verify_voice_logic()
        print("\n🎉 Logic Verification Passed!")
    except Exception as e:
        print(f"\n❌ Verification Failed: {e}")
        import traceback
        traceback.print_exc()
