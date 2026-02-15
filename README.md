# Young Pharaohs

An interactive AR-powered mobile app that brings ancient Egyptian pharaohs to life. Users explore pharaohs, chat with them using AI-driven conversations, view their monuments in AR, and discover nearby places.

## Project Structure

```
Young-Pharoahs/
├── app/                          # FastAPI backend (Python)
│   ├── routers/                  # API endpoints
│   ├── services/                 # Business logic (LLM, TTS, STT, RAG, etc.)
│   ├── models/                   # Pydantic request/response models
│   └── utils/                    # Helpers (prompts, image processing)
├── RamsesARProject/
│   ├── MyMobileApp/              # React Native mobile app (TypeScript)
│   │   ├── src/
│   │   │   ├── screens/          # App screens
│   │   │   ├── components/       # Reusable UI components
│   │   │   ├── services/         # API & audio services
│   │   │   ├── data/             # Static pharaoh data
│   │   │   └── types/            # TypeScript type definitions
│   │   ├── android/              # Android native project
│   │   └── ios/                  # iOS native project
│   └── unity/
│       └── RamsesAR/             # Unity AR project (C#)
│           ├── Assets/Scripts/   # AR logic (ARManager, CharacterPlacer, etc.)
│           ├── Assets/Scenes/    # Unity scenes
│           ├── Assets/Models/    # 3D pharaoh models
│           └── ProjectSettings/  # Unity config
├── main.py                       # Server entry point
├── ingest.py                     # PDF ingestion into vector store
└── requirements.txt              # Python dependencies
```

---

## Tech Stack

| Layer             | Technology                                      |
| ----------------- | ----------------------------------------------- |
| **Mobile App**    | React Native 0.83, TypeScript, React Navigation |
| **AR Engine**     | Unity (C#), integrated via `react-native-unity` |
| **Backend**       | FastAPI (Python), Uvicorn                       |
| **LLM / Vision**  | Google Gemini (RAG + Vision + query rewriting)  |
| **Embeddings**    | BGE-M3 (1024-dim)                               |
| **Vector Store**  | Pinecone                                        |
| **Database**      | MongoDB (pharaohs, users, conversations)        |
| **Speech**        | Deepgram (STT + TTS), ElevenLabs (TTS)          |
| **Image Gen**     | GPT4All (Mistral 7B) + Stable Diffusion         |
| **Nearby Places** | Google Places API                               |

---

## Mobile App

### Screens

| Screen                      | Description                                           |
| --------------------------- | ----------------------------------------------------- |
| **HomeScreen**              | Landing page with pharaoh discovery                   |
| **KingsScreen**             | Browse all pharaohs with search                       |
| **ChatScreen**              | AI-powered conversation with a pharaoh (text + voice) |
| **ConversationsListScreen** | View and manage past conversations                    |
| **MonumentDetailsScreen**   | Monument info, location, nearby restaurants & hotels  |
| **LocationsScreen**         | Map view of monument locations                        |
| **ARScreen**                | Launch Unity AR experience to view 3D pharaoh models  |

### Key Features

- **Voice Chat** — Record audio → STT → RAG → TTS → playback, all in one flow
- **Image Recognition** — Upload a photo of a monument/statue → AI identifies the pharaoh
- **Multi-turn Conversations** — Context-aware follow-ups with automatic pharaoh persona switching
- **AR Experience** — Place 3D animated pharaoh characters in the real world via Unity
- **Nearby Places** — Discover restaurants and hotels near each monument (Google Places)

### Setup

```bash
cd RamsesARProject/MyMobileApp
npm install

# Android
npx react-native run-android

# iOS
cd ios && pod install && cd ..
npx react-native run-ios
```

> **Unity Integration:** The Unity AR project must be exported to `android/unity/` (Android) before building. See the [Unity Export Guide](https://github.com/nicmadrid/react-native-unity#readme) for details.

---

## Unity AR Project

Located in `RamsesARProject/unity/RamsesAR/`.

### Scripts

| Script                   | Purpose                                                       |
| ------------------------ | ------------------------------------------------------------- |
| `ARManager.cs`           | Core AR session manager, handles plane detection and tracking |
| `CharacterPlacer.cs`     | Places and positions 3D pharaoh models on detected surfaces   |
| `AudioController.cs`     | Manages audio playback for AR narration                       |
| `UnityMessageManager.cs` | Bridge for React Native ↔ Unity communication                 |

### Opening in Unity

1. Open Unity Hub → **Add** → select `RamsesARProject/unity/RamsesAR/`
2. Open with Unity 2022.3 LTS or later
3. Install required packages from `Packages/manifest.json` (auto-resolved)

---

## Backend Server

### Setup

```bash
pip install -r requirements.txt

# Copy and fill in your API keys
cp .env.example .env
```

### Environment Variables

```env
GEMINI_API_KEY=           # Google Gemini API key
PINECONE_API_KEY=         # Pinecone vector store
MONGODB_URI=              # MongoDB connection string
DEEPGRAM_API_KEY=         # Deepgram STT/TTS
ELEVENLABS_API_KEY=       # ElevenLabs TTS (optional)
GOOGLE_PLACES_API_KEY=    # Google Places API
CLOUDINARY_URL=           # Image hosting
```

### Ingest PDFs

```bash
python ingest.py --folder ../  # or any folder with PDFs
```

### Start the Server

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Docs available at: `http://localhost:8000/docs`

---

## API Endpoints

### Authentication

| Method | Endpoint       | Description            |
| ------ | -------------- | ---------------------- |
| `POST` | `/auth/signup` | Register a new user    |
| `POST` | `/auth/signin` | Login → `access_token` |

### Pharaohs

| Method | Endpoint                                            | Description                 |
| ------ | --------------------------------------------------- | --------------------------- |
| `GET`  | `/pharaohs`                                         | List all pharaohs           |
| `GET`  | `/pharaohs/search?name=ramses`                      | Search by name              |
| `GET`  | `/pharaohs/{king_name}`                             | Pharaoh details + monuments |
| `GET`  | `/pharaohs/{king_name}/monuments/{monument}/nearby` | Nearby restaurants & hotels |

### RAG & Chat

| Method | Endpoint           | Description                                                     |
| ------ | ------------------ | --------------------------------------------------------------- |
| `POST` | `/query`           | Text query with RAG (supports `conversation_id` for multi-turn) |
| `POST` | `/voice-query`     | Audio in → transcript + RAG answer + audio out                  |
| `POST` | `/describe-images` | Upload images → pharaoh identification                          |
| `POST` | `/tts`             | Text-to-speech with auto gender detection                       |
| `POST` | `/generate-image`  | Generate scene image from conversation context                  |

### Conversations

| Method   | Endpoint              | Description                                  |
| -------- | --------------------- | -------------------------------------------- |
| `GET`    | `/conversations`      | List conversations with last message preview |
| `GET`    | `/conversations/{id}` | Full conversation history                    |
| `POST`   | `/conversations`      | Create new conversation                      |
| `DELETE` | `/conversations/{id}` | Delete a conversation                        |

---

## Architecture

```
 Mobile App (React Native)
         │
         ├── AR Screen ──── Unity Engine (3D models + plane detection)
         │
         ▼
 ┌──────────────────────────────────────────────────────────────┐
 │                      FastAPI Server                          │
 │                                                              │
 │  ┌───────────────────────────────────────────────────────┐   │
 │  │ AI / ML Services                                      │   │
 │  │  Gemini Vision ──── image → pharaoh name              │   │
 │  │  BGE-M3 ─────────── text → 1024-dim embedding         │   │
 │  │  Gemini LLM ──────── RAG + query rewrite + gender det │   │
 │  │  Reranker ────────── rerank search results             │   │
 │  │  GPT4All (Mistral) ─ conversation → image prompt      │   │
 │  │  SD-Turbo ────────── prompt → generated image          │   │
 │  └───────────────────────────────────────────────────────┘   │
 │  ┌───────────────────────────────────────────────────────┐   │
 │  │ Speech Services                                       │   │
 │  │  Deepgram STT ────── audio → text                     │   │
 │  │  Deepgram TTS ────── text → audio (auto gender)       │   │
 │  └───────────────────────────────────────────────────────┘   │
 │  ┌───────────────────────────────────────────────────────┐   │
 │  │ External Integrations                                 │   │
 │  │  Google Places ───── nearby restaurants & hotels       │   │
 │  │  Uber ────────────── deep links to monument locations  │   │
 │  │  Cloudinary ──────── image hosting                     │   │
 │  └───────────────────────────────────────────────────────┘   │
 └──────────────────────┬───────────────────────────────────────┘
                        │
           ┌────────────┴────────────┐
           ▼                         ▼
    ┌─────────────┐          ┌──────────────┐
    │  Pinecone   │          │   MongoDB     │
    │  (vectors)  │          │   (data)      │
    │  BGE-M3     │          │  pharaohs     │
    │  embeddings │          │  users        │
    │             │          │  conversations │
    └─────────────┘          └──────────────┘
```

### Query Pipeline

```
User prompt + (optional images / conversation_id)
        │
        ├── images? ────────── Gemini Vision → pharaoh descriptions
        ├── conversation_id? ─ MongoDB → load history
        │
        ▼
   Query Rewriting (Gemini LLM)
   "his temples" + history → "Ramses II temples"
        │
        ▼
   BGE-M3 Embedding → Pinecone Search (top-k) → Reranker (top-8)
        │
        ▼
   Gemini LLM (RAG generation with conversation history)
   Pharaoh speaks in first-person, auto-switches persona
        │
        ▼
   Response (answer + conversation_id + optional audio)
```

### Voice Query Pipeline

```
Audio file → Deepgram STT → transcript
        │
        ▼
   RAG Pipeline (same as above)
        │
        ▼
   Auto gender detection (Gemini LLM) → Deepgram TTS → audio response
        │
        ▼
   Response (transcript + answer + audio_base64)
```
