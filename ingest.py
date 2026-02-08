import os
import sys
import time
import glob
import argparse

import torch
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
from langchain_pinecone import PineconeVectorStore
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings

load_dotenv()

# ── defaults ────────────────────────────────────────────────────────────────
DEFAULT_INDEX = os.getenv("PINECONE_INDEX", "cross-lingual-rag")
DEFAULT_CHUNK_SIZE = 512
DEFAULT_CHUNK_OVERLAP = 50
EMBEDDING_DIM = 1024  # BGE-M3


def get_embeddings(device: str | None = None) -> HuggingFaceEmbeddings:
    """Load the BGE-M3 embedding model."""
    if device is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[embeddings] Loading BGE-M3 on {device} …")
    return HuggingFaceEmbeddings(
        model_name="BAAI/bge-m3",
        model_kwargs={"device": device},
        encode_kwargs={"normalize_embeddings": True},
    )


def ensure_pinecone_index(index_name: str) -> None:
    """Create or recreate the Pinecone index with the correct dimensions."""
    pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
    existing = [idx["name"] for idx in pc.list_indexes()]

    if index_name in existing:
        desc = pc.describe_index(index_name)
        if int(desc.dimension) != EMBEDDING_DIM:
            print(f"[pinecone] Dimension mismatch ({desc.dimension} vs {EMBEDDING_DIM}), recreating …")
            pc.delete_index(index_name)
            while index_name in [i["name"] for i in pc.list_indexes()]:
                time.sleep(1)
        else:
            print(f"[pinecone] Index '{index_name}' already exists with correct dimensions.")
            return

    print(f"[pinecone] Creating index '{index_name}' (dim={EMBEDDING_DIM}) …")
    pc.create_index(
        name=index_name,
        dimension=EMBEDDING_DIM,
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
    )
    while not pc.describe_index(index_name).status["ready"]:
        time.sleep(1)
    print("[pinecone] Index ready.")


def load_and_chunk_pdfs(
    folder: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
):
    """Load every PDF in *folder* and split into chunks."""
    pdf_paths = sorted(glob.glob(os.path.join(folder, "*.pdf")))
    if not pdf_paths:
        print(f"[loader] No PDF files found in '{folder}'")
        sys.exit(1)

    print(f"[loader] Found {len(pdf_paths)} PDF(s) in '{folder}'")
    all_chunks = []
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )

    for path in pdf_paths:
        print(f"  • {os.path.basename(path)} …", end=" ")
        try:
            docs = PyPDFLoader(path).load()
            chunks = splitter.split_documents(docs)
            # tag every chunk with the source filename
            for c in chunks:
                c.metadata["source_file"] = os.path.basename(path)
            all_chunks.extend(chunks)
            print(f"{len(chunks)} chunks")
        except Exception as exc:
            print(f"ERROR: {exc}")

    print(f"[loader] Total chunks: {len(all_chunks)}")
    return all_chunks


def upsert_to_pinecone(chunks, embeddings, index_name: str, batch_size: int = 100):
    """Upload document chunks to Pinecone in batches."""
    print(f"[upload] Uploading {len(chunks)} chunks to '{index_name}' …")
    
    # Process in batches to avoid memory issues
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]
        print(f"  Batch {i // batch_size + 1}/{(len(chunks) - 1) // batch_size + 1} ({len(batch)} chunks)")
        
        if i == 0:
            vectorstore = PineconeVectorStore.from_documents(
                documents=batch,
                embedding=embeddings,
                index_name=index_name,
            )
        else:
            vectorstore.add_documents(batch)
    
    print("[upload] Done ✓")
    return vectorstore


def main():
    parser = argparse.ArgumentParser(description="Ingest PDFs into Pinecone with BGE-M3 embeddings")
    parser.add_argument("--folder", required=True, help="Path to folder containing PDF files")
    parser.add_argument("--index", default=DEFAULT_INDEX, help=f"Pinecone index name (default: {DEFAULT_INDEX})")
    parser.add_argument("--chunk-size", type=int, default=DEFAULT_CHUNK_SIZE, help="Chunk size in characters")
    parser.add_argument("--chunk-overlap", type=int, default=DEFAULT_CHUNK_OVERLAP, help="Chunk overlap in characters")
    parser.add_argument("--device", default=None, help="Device for embeddings (cuda/cpu, auto-detected)")
    parser.add_argument("--batch-size", type=int, default=100, help="Upload batch size")
    args = parser.parse_args()

    # validate
    if not os.path.isdir(args.folder):
        print(f"Error: '{args.folder}' is not a valid directory.")
        sys.exit(1)

    if not os.environ.get("PINECONE_API_KEY"):
        print("Error: PINECONE_API_KEY not set. Create a .env file or export it.")
        sys.exit(1)

    # run pipeline
    chunks = load_and_chunk_pdfs(args.folder, args.chunk_size, args.chunk_overlap)
    embeddings = get_embeddings(args.device)
    ensure_pinecone_index(args.index)
    upsert_to_pinecone(chunks, embeddings, args.index, args.batch_size)

    print("\nAll PDFs ingested successfully!")


if __name__ == "__main__":
    main()
