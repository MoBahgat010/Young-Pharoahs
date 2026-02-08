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

### `POST /query` (multipart form)

Send text + optional images:

```bash
# Text only
curl -X POST http://localhost:8000/query \
  -F "prompt=من هو رمسيس الثاني؟"

# Text + image
curl -X POST http://localhost:8000/query \
  -F "prompt=What is shown in this image?" \
  -F "images=@pharaoh.jpg"
```

### `POST /query/json` (JSON body)

Send text + optional base64-encoded images:

```bash
curl -X POST http://localhost:8000/query/json \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Tell me about Ramses II", "top_k": 3}'
```

### Response

```json
{
  "answer": "Ramses II was...",
  "image_descriptions": ["The image shows..."],
  "sources": [
    {"content": "chunk text...", "metadata": {"page": 1, "source_file": "ramses.pdf"}}
  ],
  "search_query": "original or enriched query",
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
