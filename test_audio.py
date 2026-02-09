"""
Test Script for Voice Query Endpoint
====================================
This script tests the /voice-query endpoint of the Pharaohs RAG Server.
It sends an audio file and prints the results including transcription and answer.
If successful, it saves the returned audio to 'output_response.mp3'.
"""

import os
import logging
import requests
import base64
import json

# 1. Configure Logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("test_audio")

# 2. Configuration
API_URL = "http://localhost:8000/voice-query"
AUDIO_FILE = "audio.mp3"  # Ensure this file exists in the same directory
OUTPUT_AUDIO_FILE = "response_audio.mp3"

def test_voice_endpoint():
    logger.info("Starting Voice Query Endpoint Test")
    
    # Check if input audio file exists
    if not os.path.exists(AUDIO_FILE):
        logger.error(f"Input audio file not found: {AUDIO_FILE}")
        return

    logger.info(f"Using audio file: {AUDIO_FILE}")
    logger.info(f"Target Endpoint: {API_URL}")

    try:
        # Prepare the request
        with open(AUDIO_FILE, "rb") as f:
            files = {
                "audio": (AUDIO_FILE, f, "audio/mpeg")
            }
            # Add form data: tts_provider=deepgram is known to work
            data = {
                "tts_provider": "deepgram",
                "top_k": 3
            }
            
            logger.info("Sending POST request...")
            response = requests.post(API_URL, files=files, data=data)
            
        # Check response status
        logger.info(f"Response Status Code: {response.status_code}")
        
        if response.status_code == 200:
            logger.info("Request Successful!")
            
            result = response.json()
            
            # Print key details
            logger.info("-" * 40)
            logger.info(f"TRANSCRIPT: {result.get('transcript')}")
            logger.info(f"ANSWER (Audio Text): {result.get('answer')}")
            sources = result.get('sources', [])
            logger.info(f"SOURCES   : {len(sources)} documents retrieved")
            if sources:
                logger.info(f"Top Source: {sources[0].get('content')[:100]}...")
            
            logger.info(f"PROVIDER  : {result.get('tts_provider')}")
            logger.info(f"MODEL     : {result.get('tts_model')}")
            logger.info("-" * 40)
            
            # Handle Audio Output
            audio_b64 = result.get("audio_base64")
            if audio_b64:
                try:
                    audio_bytes = base64.b64decode(audio_b64)
                    with open(OUTPUT_AUDIO_FILE, "wb") as f_out:
                        f_out.write(audio_bytes)
                    logger.info(f"Generated audio response saved to: {OUTPUT_AUDIO_FILE}")
                    logger.info(f"Audio size: {len(audio_bytes)} bytes")
                except Exception as e:
                    logger.error(f"Failed to decode/save audio: {e}")
            else:
                logger.warning("No audio_base64 field in response")
                
        else:
            logger.error("Request Failed!")
            logger.error(f"Response Body: {response.text}")
            
    except requests.exceptions.ConnectionError:
        logger.error("Could not connect to the server. Is it running on localhost:8000?")
    except Exception as e:
        logger.exception(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    test_voice_endpoint()
