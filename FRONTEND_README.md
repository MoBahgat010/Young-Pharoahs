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
5. User uses voice → POST /voice-query (audio in → audio + text out)
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

- First message: omit or set `conversation_id` to `null` → a new session is created
- Follow-up: pass the `conversation_id` from the previous response

**Response:**

```json
{
  "answer": "I am Ramses the Great, ruler of...",
  "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
  "image_descriptions": ["A statue of Ramses II at Abu Simbel"],
  "search_query": "Ramses II A statue of Ramses II at Abu Simbel",
  "top_k": 10
}
```

---

### 2. Image Description

```http
POST /describe-images
Content-Type: multipart/form-data
```

**Request:** Upload one or more image files as `images` field.

**Response:**

```json
{
  "descriptions": ["This appears to be a statue of Ramses II..."],
  "count": 1
}
```

> Pass the `descriptions` array into `/query` as `image_descriptions`.

---

### 3. Voice Query

```http
POST /voice-query
Content-Type: multipart/form-data
```

| Form Field        | Type   | Required | Description                    |
| ----------------- | ------ | -------- | ------------------------------ |
| `audio`           | file   | ✅       | Audio file (wav, mp3, m4a)     |
| `conversation_id` | string | ❌       | Continue a conversation        |
| `gender`          | string | ❌       | `"male"` or `"female"`         |
| `tts_provider`    | string | ❌       | `"elevenlabs"` or `"deepgram"` |

**Response:**

```json
{
  "transcript": "Who is Ramses the second?",
  "answer": "I am Ramses the Great...",
  "audio_base64": "UklGRjQA...",
  "conversation_id": "550e8400-...",
  "tts_provider": "elevenlabs",
  "tts_model": "eleven_multilingual_v2",
  "search_query": "Who is Ramses the second?",
  "top_k": 10
}
```

> **Playing the audio:** decode `audio_base64` from base64 and play as an audio blob.

---

### 4. Conversations (History Management)

#### List conversations (with last message preview)

```http
GET /conversations?limit=20
```

**Response:**

```json
{
  "conversations": [
    {
      "conversation_id": "550e8400-...",
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

**Response:**

```json
{
  "conversation_id": "550e8400-...",
  "created_at": "2026-02-11T19:30:00Z",
  "updated_at": "2026-02-11T19:35:00Z",
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
      "content": "I built the Great Temple at Abu Simbel...",
      "timestamp": "...",
      "audio_base64": "..."
    }
  ]
}
```

> Voice query messages include `audio_base64`. Text query messages do not.

#### Delete a conversation

```http
DELETE /conversations/{conversation_id}
```

---

### 5. Pharaohs Data

```http
GET /pharaohs                    # List all pharaohs
GET /pharaohs/search?name=ramses # Search by name
GET /pharaohs/{king_name}        # Get one pharaoh's details
GET /pharaohs/{king_name}/monuments                          # List monuments
GET /pharaohs/{king_name}/monuments/{monument_name}/nearby   # Nearby places
```

**Pharaoh object shape:**

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

**Nearby places** (query param `type=restaurant` or `type=hotel`):

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

### 6. Auth

```http
POST /auth/signup
Content-Type: application/json

{ "name": "Ahmed", "email": "ahmed@example.com", "password": "secret123" }
```

```http
POST /auth/signin
Content-Type: application/json

{ "email": "ahmed@example.com", "password": "secret123" }
```

**Response:** `{ "access_token": "eyJ...", "token_type": "bearer" }`

---

## Typical Frontend Flow

```
┌──────────────┐     ┌────────────────┐     ┌──────────────┐
│  Chat Screen │────>│ POST /query    │────>│  Show Answer │
│              │     │ {prompt, id?}  │     │  + save id   │
└──────────────┘     └────────────────┘     └──────────────┘
       │                                           │
       │  follow-up question                       │
       └───────────── POST /query {prompt, id} ────┘

┌──────────────┐     ┌────────────────────┐     ┌──────────────┐
│  Chat List   │────>│ GET /conversations │────>│ Show preview │
│  Screen      │     │                    │     │ last_message │
└──────────────┘     └────────────────────┘     └──────────────┘
```

---

## Error Handling

All errors return:

```json
{ "detail": "Error description here" }
```

| Status | Meaning                                   |
| ------ | ----------------------------------------- |
| 400    | Bad request (empty prompt, invalid input) |
| 404    | Not found (pharaoh, conversation)         |
| 502    | Upstream service failure (LLM, STT, TTS)  |
| 500    | Internal server error                     |
