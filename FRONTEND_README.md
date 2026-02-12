# Young Pharaohs — Frontend Integration Guide

> **Base URL:** `http://localhost:8000`
> **Interactive Docs:** `http://localhost:8000/docs` (Swagger UI)

---

## Quick Start Flow

```
1. User opens app → GET /pharaohs (show pharaoh list)
2. User uploads pharaoh image → POST /describe-images (get identity)
3. User asks a question → POST /query (get answer + conversation_id)
4. User asks follow-up → POST /query with same conversation_id (multi-turn)
5. User asks about a DIFFERENT pharaoh → same conversation_id (auto-switches persona)
6. User wants audio → POST /tts with conversation_id (voice auto-detected)
7. User uses voice → POST /voice-query (audio in → audio + text out)
```

---

## Endpoints

### 1. Text Query (with Conversation Memory)

```http
POST /query
Content-Type: application/json
```

**Request:**

```json
{
  "prompt": "Who is Ramses II?",
  "image_descriptions": ["A statue of Ramses II at Abu Simbel"],
  "conversation_id": null
}
```

| Field                | Type     | Required | Description                                    |
| -------------------- | -------- | -------- | ---------------------------------------------- |
| `prompt`             | string   | ✅       | User's question                                |
| `image_descriptions` | string[] | ❌       | Descriptions from `/describe-images`           |
| `conversation_id`    | string   | ❌       | Omit to start new session; include to continue |
| `gender`             | string   | ❌       | `"male"` or `"female"` (for TTS)               |

**Response:**

```json
{
  "answer": "I am Ramses the Great, ruler of...",
  "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
  "image_descriptions": ["A statue of Ramses II at Abu Simbel"],
  "search_query": "Ramses II statue Abu Simbel",
  "top_k": 10
}
```

#### Multi-Turn Conversation

```json
// 1st message → new conversation
{"prompt": "Who is Ramses II?"}
// Response: {"answer": "I am Ramses...", "conversation_id": "abc-123"}

// 2nd message → follow-up (uses history for better retrieval)
{"prompt": "Tell me about his temples", "conversation_id": "abc-123"}
// Response: {"answer": "I built the Great Temple at Abu Simbel..."}

// 3rd message → switch pharaoh (same conversation, persona auto-switches!)
{"prompt": "What about Hatshepsut?", "conversation_id": "abc-123"}
// Response: {"answer": "I am Hatshepsut, I built my mortuary temple..."}
```

> **Smart retrieval:** Follow-up queries like "Tell me about his temples" are rewritten internally (via LLM) to "Ramses II temples" before searching — so retrieval stays accurate even with vague references.

---

### 2. Image Description

```http
POST /describe-images
Content-Type: multipart/form-data
```

Upload images as the `images` field → get text descriptions back.

```json
// Response
{
  "descriptions": ["This appears to be a statue of Ramses II..."],
  "count": 1
}
```

> Pass the `descriptions` array into `/query` as `image_descriptions`.

---

### 3. Text-to-Speech (with Auto Gender Detection)

```http
POST /tts
Content-Type: multipart/form-data
```

| Field             | Type   | Required | Description                                       |
| ----------------- | ------ | -------- | ------------------------------------------------- |
| `text`            | string | ✅       | Text to synthesize                                |
| `conversation_id` | string | ❌       | **Auto-detects pharaoh gender from chat history** |
| `gender`          | string | ❌       | Manual override: `"male"` or `"female"`           |
| `tts_model`       | string | ❌       | TTS model override                                |

**Auto-detection:** If you pass `conversation_id` without `gender`, the backend asks Gemini to determine whether the pharaoh is male or female, then picks the right voice automatically.

```json
// Just pass conversation_id — no gender needed!
// POST /tts  text="I built the Great Pyramid..."  conversation_id="abc-123"

// Response
{
  "answer": "I built the Great Pyramid...",
  "conversation_id": "abc-123",
  "audio_base64": "UklGRjQA...",
  "tts_provider": "deepgram",
  "tts_model": "aura-helios-en"
}
```

---

### 4. Voice Query

```http
POST /voice-query
Content-Type: multipart/form-data
```

| Field             | Type   | Required | Description                    |
| ----------------- | ------ | -------- | ------------------------------ |
| `audio`           | file   | ✅       | Audio file (wav, mp3, m4a)     |
| `conversation_id` | string | ❌       | Continue a conversation        |
| `tts_provider`    | string | ❌       | `"elevenlabs"` or `"deepgram"` |
| `gender`          | string | ❌       | Voice gender                   |

**Response:**

```json
{
  "transcript": "Who is Ramses the second?",
  "answer": "I am Ramses the Great...",
  "audio_base64": "UklGRjQA...",
  "conversation_id": "abc-123",
  "tts_provider": "elevenlabs",
  "tts_model": "eleven_multilingual_v2",
  "search_query": "Ramses II",
  "top_k": 10
}
```

> Voice query audio responses are **saved in MongoDB** alongside the assistant message.

**Playing the audio:** Decode `audio_base64` from base64 and play as an audio blob.

---

### 5. Conversations (History Management)

#### List conversations (with last message preview)

```http
GET /conversations?limit=20
```

```json
{
  "conversations": [
    {
      "conversation_id": "abc-123",
      "created_at": "2026-02-11T19:30:00Z",
      "updated_at": "2026-02-11T19:35:00Z",
      "last_message": {
        "role": "assistant",
        "content": "I am Ramses the Great...",
        "timestamp": "2026-02-11T19:35:00Z"
      }
    }
  ]
}
```

#### Get full conversation history

```http
GET /conversations/{conversation_id}
```

```json
{
  "conversation_id": "abc-123",
  "messages": [
    { "role": "user", "content": "Who is Ramses II?", "timestamp": "..." },
    {
      "role": "assistant",
      "content": "I am Ramses the Great...",
      "timestamp": "..."
    },
    {
      "role": "user",
      "content": "Tell me about his temples",
      "timestamp": "..."
    },
    {
      "role": "assistant",
      "content": "I built the Great Temple...",
      "timestamp": "...",
      "audio_base64": "..."
    }
  ]
}
```

> Voice query messages include `audio_base64`. Text query messages do not.

#### Create new conversation

```http
POST /conversations
```

#### Delete a conversation

```http
DELETE /conversations/{conversation_id}
```

---

### 6. Pharaohs Data

```http
GET /pharaohs                    # List all pharaohs
GET /pharaohs/search?name=ramses # Search by name
GET /pharaohs/{king_name}        # Get one pharaoh's details
GET /pharaohs/{king_name}/monuments                          # List monuments
GET /pharaohs/{king_name}/monuments/{monument_name}/nearby   # Nearby places
```

**Pharaoh object:**

```json
{
  "king_name": "Ramses II",
  "monuments": [
    {
      "name": "The Great Temple of Abu Simbel",
      "details": "A massive rock-cut temple...",
      "location_name": "Abu Simbel",
      "location_url": "https://google.com/maps/...",
      "image_url": "https://...",
      "location_image_url": "https://..."
    }
  ]
}
```

**Nearby places** (`type=restaurant` or `type=hotel`):

```json
{
  "places": [
    {
      "name": "Restaurant Name",
      "address": "...",
      "rating": 4.5,
      "location": { "lat": 25.7, "lng": 32.6 }
    }
  ]
}
```

---

    }
  ]
}

---

### 8. Image Generation (NEW)

Generate a scene based on the current conversation context.

```http
POST /generate-image
Content-Type: application/json
```

| Field             | Type   | Required | Description                              |
| ----------------- | ------ | -------- | ---------------------------------------- |
| `conversation_id` | string | ✅       | ID of the conversation to visualize      |

**Request Body:**

```json
{
  "conversation_id": "abc-123"
}
```

**Response:**

```json
{
  "conversation_id": "abc-123",
  "prompt_used": "A hyperrealistic photo of a golden throne room with hieroglyphs...",
  "image_base64": "iVBORw0KGgoAAAANSUhEUgAA..."
}
```

> **Note:** The backend uses **GPT4All** (local LLM) to summarize the chat history into a visual prompt, then **Stable Diffusion** to generate the image. This process may take 10-20 seconds on GPU.

---

### 7. Auth

```http
POST /auth/signup   →  {"name": "Ahmed", "email": "ahmed@example.com", "password": "secret123"}
POST /auth/signin   →  {"email": "ahmed@example.com", "password": "secret123"}
```

**Response:** `{"access_token": "eyJ...", "token_type": "bearer"}`

---

## Key Behaviors

| Feature                 | How it works                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **New conversation**    | Omit `conversation_id` in `/query` → auto-created                                       |
| **Follow-up queries**   | Pass `conversation_id` → history loaded, query rewritten for better retrieval           |
| **Pharaoh switching**   | Ask about a different pharaoh in the same conversation → persona switches automatically |
| **TTS gender**          | Pass `conversation_id` to `/tts` → gender auto-detected from conversation context       |
| **Voice audio storage** | Voice query responses saved with `audio_base64` in MongoDB                              |
| **Chat list preview**   | `GET /conversations` includes `last_message` for each conversation                      |

---

## Error Handling

All errors return `{"detail": "Error description"}`.

| Status | Meaning                                   |
| ------ | ----------------------------------------- |
| 400    | Bad request (empty prompt, invalid input) |
| 404    | Not found (pharaoh, conversation)         |
| 502    | Upstream service failure (LLM, STT, TTS)  |
| 500    | Internal server error                     |
