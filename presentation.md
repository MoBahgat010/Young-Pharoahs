# Young Pharaohs 🏛️

### _Your AI-Powered Guide to Ancient Egypt_

---

## The Problem

- **1.5 billion tourists** struggle to engage deeply with Egypt's history
- Traditional guides are expensive, limited in languages, and not always available
- Tourists miss out on nearby services (restaurants, hotels) at remote monument sites
- Historical knowledge is locked in academic texts — not accessible to everyone

---

## Our Solution

**Young Pharaohs** — an AI-powered mobile app that lets you **talk to the pharaohs themselves**.

Point your camera at a statue → the pharaoh comes to life through **AR chat** — speaking in your language, telling their own story.

> _"Imagine standing at Abu Simbel and having Ramses II himself tell you why he built it."_

---

## User Journey

### 1️⃣ Choose Your Pharaoh

The user opens the app and has **two ways** to start:

| Method                 | How it Works                                                            |
| ---------------------- | ----------------------------------------------------------------------- |
| 📋 **Browse the List** | Select from our curated collection of pharaohs                          |
| 📸 **Scan a Statue**   | Point the camera at any pharaoh statue — our AI identifies it instantly |

**Free users** get access to 3 pharaohs. **Premium** unlocks all.

---

### 2️⃣ AR Chat with the Pharaoh

Once the pharaoh is identified, the user enters an **immersive AR chat**:

- 🗣️ **Voice interaction** — speak in any language, the pharaoh responds naturally
- 📝 **Text chat** — type questions and get rich, historically-accurate answers
- 🌍 **Cross-lingual** — ask in Arabic, English, French, German, and more up to 100 languages
- 📚 **RAG-powered** — every answer is grounded in real historical documents

> The pharaoh doesn't just answer — they tell **their story** in first person.

---

### 3️⃣ Explore Monuments

After chatting, the user can browse the pharaoh's **most famous monuments**:

- 🏛️ See images, descriptions, and exact locations
- 📍 One tap to open in Google Maps
- 🗺️ Discover monuments you didn't know existed

_Example: Ramses II → Abu Simbel, The Ramesseum, Luxor Temple, Karnak..._

---

### 4️⃣ Discover Nearby Services

For each monument, explore what's nearby:

- 🍽️ **Restaurants** — rated, with directions
- 🏨 **Hotels** — nearby lodging options
- ⭐ **Promoted services** appear first (our ad revenue model)

> _Powered by Google Places API — real-time, accurate data._

---

## Technical Architecture

```
                    📱 Mobile App
                    ┌─────────────────┐
                    │  Camera / AR    │
                    │  Voice Input    │
                    │  Text Chat UI   │
                    └────────┬────────┘
                             │
                    ⚙️ FastAPI Backend
        ┌────────────────────┼────────────────────┐
        │                    │                     │
   🔐 Auth            🧠 RAG Pipeline         📍 Services
   JWT + bcrypt        │                      Google Places
                       ▼                      MongoDB
              ┌──────────────────┐
              │ 👁️ Gemini Vision  │  (image → pharaoh name)
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │ 🎤 Deepgram STT  │  (voice → text)
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │ 🧮 BGE-M3        │  (text → 1024-dim vector)
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │ 📊 Pinecone      │  (similarity search, top-30)
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │ 🎯 Reranker      │  (re-score → top-8)
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │ 🤖 Gemini LLM    │  (context → answer)
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │ 🔊 ElevenLabs    │  (text → speech)
              └──────────────────┘
```

### RAG Pipeline Summary

| Step | Component          | What Happens                                |
| ---- | ------------------ | ------------------------------------------- |
| 1    | **Gemini Vision**  | Identifies the pharaoh from a photo         |
| 2    | **Deepgram STT**   | Transcribes voice queries to text           |
| 3    | **BGE-M3**         | Converts query to 1024-dim embedding vector |
| 4    | **Pinecone**       | Retrieves top-30 relevant document chunks   |
| 5    | **Reranker**       | Re-scores and selects top-8 most relevant   |
| 6    | **Gemini LLM**     | Generates a historically-grounded answer    |
| 7    | **ElevenLabs TTS** | Converts the answer to natural speech       |

---

## Business Model

### Revenue Streams

```
    💰 Revenue
    ├── 🔓 Premium Subscriptions
    │       Monthly / Yearly plans
    ├── 📢 Promoted Services
    │       Restaurants & Hotels pay for top placement
    └── 🤝 Partnerships
            Tourism boards, museums, travel agencies
```

---

### 1. Freemium Subscriptions

| Feature            | Free    | Premium               |
| ------------------ | ------- | --------------------- |
| Pharaohs available | 3       | All (8+)              |
| AR Chat            | Limited | Unlimited             |
| Voice interaction  | ❌      | ✅                    |
| Monuments explorer | Basic   | Full details + images |
| Nearby services    | ❌      | ✅                    |
| **Price**          | Free    | $4.99/mo or $39.99/yr |

---

### 2. Promoted Services (Ads)

- Restaurants and hotels near monuments can **pay to be featured first** in results
- Non-intrusive placement — promoted results are labeled but prioritized
- **Pay-per-click** or **monthly featured listing** pricing model
- High-intent audience: tourists actively looking for services near monuments

---

### 3. Partnership Revenue

- **Tourism boards** can sponsor pharaoh content or feature specific monuments
- **Museums** (GEM, Egyptian Museum) can integrate ticketing
- **Travel agencies** can offer guided tours through the app

---

## Why Young Pharaohs Wins

| Advantage                    | Description                                              |
| ---------------------------- | -------------------------------------------------------- |
| 🎯 **AI-first**              | Not a static guide — a living, conversational experience |
| 🌍 **Cross-lingual**         | Works in any language, no translation barriers           |
| 📸 **Visual recognition**    | Just point and learn — no need to search                 |
| 📚 **Historically accurate** | RAG ensures answers are grounded in real sources         |
| 💰 **Dual revenue**          | Subscriptions + ad revenue = sustainable business        |
| 📍 **Location-aware**        | Real-time nearby services enhance the tourist experience |

---

## Roadmap

| Phase          | Timeline | Milestones                                                 |
| -------------- | -------- | ---------------------------------------------------------- |
| **Phase 1** ✅ | Now      | Core RAG API, Vision, Voice, Monuments, Nearby Services    |
| **Phase 2**    | Q2 2026  | Mobile app launch (iOS & Android), AR experience           |
| **Phase 3**    | Q3 2026  | Premium subscriptions, promoted services marketplace       |
| **Phase 4**    | Q4 2026  | Expand to other civilizations (Greek, Roman, Mesopotamian) |

---

## Team: Young Pharaohs 👑

_Building the future of cultural tourism, one pharaoh at a time._

---

> **Thank you!**
>
> Questions?
