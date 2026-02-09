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

### `POST /describe-images` (multipart form)

Upload images to get their textual descriptions from the vision model.

```bash
curl -X POST http://localhost:8000/describe-images \
  -F "images=@pharaoh1.jpg" \
  -F "images=@pharaoh2.jpg"
```

### Response

```json
{
  "descriptions": ["Ramesses II"]
}
```

### `POST /query` (JSON)

Send text + optional image descriptions (obtained from `/describe-images`):

```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is shown in these images?",
    "image_descriptions": [
        "Khofo",
        "Ramses II"
    ],
  }'
```


### Response

```json
{
  "answer": ""
}
```

### `POST /voice-query` (multipart form)

Send audio file to perform RAG and get audio response.

```bash
curl -X POST http://localhost:8000/voice-query \
  -F "audio=@query.wav" \
  -F "gender=female" \
  -F "tts_provider=elevenlabs"
```

Options:
- `audio`: Audio file (wav, mp3, m4a)
- `gender`: Voice gender (`male` or `female`)
- `tts_provider`: `elevenlabs` or `deepgram`

### Response

```json
{
  "answer": "",
  "audio_base64": ""
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
