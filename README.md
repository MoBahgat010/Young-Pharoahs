# Pharaohs RAG Server

Cross-lingual RAG system: **Text + Images → Gemini Vision → BGE-M3 → Pinecone → Gemini LLM → Answer**

## Setup

```bash
cd server
pip install -r requirements.txt

# Copy and fill in your API keys
cp .env.example .env
```

## 1. Ingest PDFs

Put your PDFs in a folder, then run:

```bash
python ingest.py --folder ../  # or any folder with PDFs
```

Options:
| Flag | Default | Description |
|---|---|---|
| `--folder` | *required* | Path to folder with PDFs |

## 2. Start the Server

```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

Docs available at: `http://localhost:8000/docs`

## 3. API Endpoints

### Authentication

#### `POST /auth/signup`
Register a new user to access protected endpoints.

**Request Body (JSON):**
```json
{
  "username": "string",
  "age": 0,
  "country": "string",
  "password": "string (max 72 chars)"
}
```

**Response (JSON):**
```json
{
  "username": "string",
  "age": 0,
  "country": "string",
  "id": "string (user_id)"
}
```

#### `POST /auth/signin`
Login to receive an access token.

**Request Body (JSON):**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (JSON):**
```json
{
  "access_token": "string (jwt)",
  "token_type": "bearer"
}
```

---

### Public Endpoints
All endpoints are now public and do not require authentication.

#### `GET /pharaohs`
List all pharaohs with basic information.

**Response (JSON):**
```json
{
  "pharaohs": [
    {
      "king_name": "Ramses II"
    },
    ...
  ]
}
```

#### `GET /pharaohs/search`
Search for a pharaoh by name.

**Parameters:**
- `q` (query, string): Search query (case-insensitive partial match)

**Response (JSON):**
```json
{
  "results": [
    {
      "king_name": "Ramses II"
    }
  ]
}
```

#### `GET /pharaohs/{king_name}`
Get details about a specific Pharaoh.

**Parameters:**
- `king_name` (path, string): Name of the King (e.g., "Ramses II")

**Response (JSON):**
```json
{
  "king_name": "Ramses II",
  "monuments": [
    {
      "name": "The Great Temple of Abu Simbel",
      "details": "...",
      "location_name": "Abu Simbel",
      "location_url": "...",
      "image_url": "...",
      "location_image_url": "..."
    }
  ]
}
```

#### `POST /describe-images` (Multipart)
Upload images to get their textual descriptions from the vision model.

**Request (Multipart/Form-Data):**
- `images`: List of image files (jpg, png, etc.)

**Response (JSON):**
```json
{
  "descriptions": [
    "Ramses II"
  ]
}
```

#### `POST /query` (JSON)
Submit a RAG query with text and optional image descriptions.

**Request Body (JSON):**
```json
{
  "prompt": "Who is this king?",
  "image_descriptions": [
    "Ramses II"
  ],
  "gender": "female"
}
```
*   `image_descriptions`: List of strings (outputs from `/describe-images`).
*   `gender`: `male` or `female`.

**Response (JSON):**
```json
{
  "answer": "This is Ramses II...",
  "image_descriptions": [...],
  "search_query": "...",
  "top_k": 5,
  "audio_base64": null,
  "tts_provider": null,
  "tts_model": null
}
```

#### `POST /voice-query` (Multipart)
Send audio file to perform RAG and get audio response.

**Request (Multipart/Form-Data):**
- `audio`: Audio file (wav, mp3, m4a)
- `gender`: Optional `male` or `female`
- `tts_provider`: Optional `elevenlabs` or `deepgram`
- `tts_model`: Optional model override
- `stt_model`: Optional STT model override

**Response (JSON):**
```json
{
  "transcript": "Tell me about Ramses II",
  "answer": "Ramses II was...",
  "audio_base64": "<base64_string>",
  "tts_provider": "elevenlabs",
  "tts_model": "eleven_multilingual_v2",
  "search_query": "...",
  "top_k": 5
}
```

## Architecture

```
User (text + images)
       │
       ▼
  ┌─────────────┐    images    ┌──────────────────┐
  │  FastAPI     │───────────▶ │  Gemini Vision    │
  │  /query      │◀────────── │  (image → text)   │
  └─────┬───────┘             └──────────────────┘
        │
        │  query + image descriptions
        ▼
  ┌─────────────┐
  │  BGE-M3     │  (text → 1024-dim vector)
  └─────┬───────┘
        │
        ▼
  ┌─────────────┐
  │  Pinecone   │  (similarity search)
  └─────┬───────┘
        │  top-k chunks
        ▼
  ┌─────────────┐
  │  Gemini LLM │  (RAG generation)
  └─────┬───────┘
        │
        ▼
     Response
```
