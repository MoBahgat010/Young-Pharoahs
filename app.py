"""
Cross-Lingual RAG FastAPI Server
=================================
Endpoints:
  POST /query   — text + optional images → Gemini vision → BGE-M3 → Pinecone → Gemini LLM → answer
  GET  /health  — liveness check
"""

import io
import os
import base64
from contextlib import asynccontextmanager
from typing import Optional

import torch
import PIL.Image
import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pinecone import Pinecone
from langchain_pinecone import PineconeVectorStore
from langchain_huggingface import HuggingFaceEmbeddings

load_dotenv()

# ── globals (populated in lifespan) ─────────────────────────────────────────
embeddings: HuggingFaceEmbeddings = None  # type: ignore
vectorstore: PineconeVectorStore = None  # type: ignore
gemini_model: genai.GenerativeModel = None  # type: ignore
gemini_vision_model: genai.GenerativeModel = None  # type: ignore

# ── config ──────────────────────────────────────────────────────────────────
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX = os.getenv("PINECONE_INDEX", "cross-lingual-rag")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL")
GEMINI_VISION_MODEL = os.getenv("GEMINI_VISION_MODEL")
TOP_K = int(os.getenv("TOP_K", "5"))


# ── lifespan: load heavy models once ────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global embeddings, vectorstore, gemini_model, gemini_vision_model

    # --- Embeddings ---
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[startup] Loading BGE-M3 on {device} …")
    embeddings = HuggingFaceEmbeddings(
        model_name="BAAI/bge-m3",
        model_kwargs={"device": device},
        encode_kwargs={"normalize_embeddings": True},
    )

    # --- Pinecone vector store ---
    print(f"[startup] Connecting to Pinecone index '{PINECONE_INDEX}' …")
    pc = Pinecone(api_key=PINECONE_API_KEY)
    index = pc.Index(PINECONE_INDEX)
    vectorstore = PineconeVectorStore(index=index, embedding=embeddings)

    # --- Gemini ---
    print("[startup] Configuring Gemini …")
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel(GEMINI_MODEL)
    gemini_vision_model = genai.GenerativeModel(GEMINI_VISION_MODEL)

    print("[startup] Ready ✓")
    yield
    print("[shutdown] Cleaning up …")


# ── app ─────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Cross-Lingual RAG API",
    description="Text + Image → Gemini Vision → BGE-M3 → Pinecone → Gemini LLM → Answer",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── helpers ─────────────────────────────────────────────────────────────────
def _images_to_pil(files: list[UploadFile]) -> list[PIL.Image.Image]:
    """Convert uploaded files to PIL Images."""
    images = []
    for f in files:
        data = f.file.read()
        images.append(PIL.Image.open(io.BytesIO(data)))
    return images


def _build_rag_prompt(query: str, context_docs: list[str], image_descriptions: list[str] = None) -> str:
    """Build the final prompt sent to Gemini LLM."""
    context_block = "\n\n---\n\n".join(context_docs)
    
    image_context_str = ""
    if image_descriptions:
        image_context_str = "\n\n### User Image Context:\n" + "\n".join(image_descriptions)

    return f"""You are a knowledgeable assistant specializing in ancient Egyptian history and culture. 
Use ONLY the following retrieved context to answer the user's question. 
If the context doesn't contain enough information to answer the question (considering both text and strict visual context from the image), explicitly state that you do not have the information.
Answer in the same language as the user's question.

### Retrieved Context:
{context_block}

{image_context_str}

### User Question:
{query}

### Answer:"""


# ── endpoints ───────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/query")
async def query_rag(
    prompt: str = Form(..., description="User question / prompt text"),
    images: Optional[list[UploadFile]] = File(None, description="Optional images"),
    top_k: Optional[int] = Form(None, description="Number of results to retrieve"),
):
    """
    Full RAG pipeline:
    1. If images are provided → Gemini Vision describes them
    2. Combine user prompt + image descriptions → search query
    3. Encode with BGE-M3 → similarity search in Pinecone
    4. Pass retrieved chunks + original query through Gemini LLM
    5. Return final answer + source chunks
    """
    k = top_k or TOP_K

    # ── Step 1: Vision — describe images if provided ────────────────────────
    image_descriptions: list[str] = []
    if images:
        pil_images = _images_to_pil(images)
        for i, img in enumerate(pil_images):
            try:
                vision_prompt = (
                    "Just tell me who is the king or queen in this image. do not add any description or additional information, just the name"
                )
                response = gemini_vision_model.generate_content([vision_prompt, img])
                image_descriptions.append(response.text)
            except Exception as exc:
                image_descriptions.append(f"[Image {i+1} could not be processed: {exc}]")

    # ── Step 2: Build the search query ──────────────────────────────────────
    search_query = prompt
    if image_descriptions:
        combined_desc = " ".join(image_descriptions)
        search_query = f"{combined_desc} {prompt}"

    # ── Step 3: Retrieve from Pinecone ──────────────────────────────────────
    try:
        results = vectorstore.similarity_search_with_score(search_query, k=k)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Vector search failed: {exc}")

    context_docs = [doc.page_content for doc, _score in results]
    sources = [
        {
            "content": doc.page_content,
            "metadata": doc.metadata,
            "score": _score
        }
        for doc, _score in results
    ]

    # ── Step 4: Generate final answer with Gemini LLM ──────────────────────
    rag_prompt = _build_rag_prompt(search_query, context_docs, image_descriptions)
    try:
        llm_response = gemini_model.generate_content(rag_prompt)
        answer = llm_response.text
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"LLM generation failed: {exc}")

    # ── Step 5: Return ──────────────────────────────────────────────────────
    return {
        "answer": answer,
        "image_descriptions": image_descriptions if image_descriptions else None,
        "sources": sources,
        "search_query": search_query,
        "top_k": k,
    }