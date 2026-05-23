import os
import tempfile

from groq import Groq
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from .chroma_client import get_collection
from .embeddings import embed_texts


@api_view(["POST"])
@parser_classes([MultiPartParser])
def ingest_document(request):
    file = request.FILES.get("file")

    if not file:
        return Response({"status": "error", "message": "No file provided."}, status=400)
    if not file.name.lower().endswith(".pdf"):
        return Response({"status": "error", "message": "Only PDF files are supported."}, status=400)

    # Save to a temp file (PyPDFLoader needs a file path, not a stream)
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        for chunk in file.chunks():
            tmp.write(chunk)
        tmp_path = tmp.name

    try:
        # 1. Extract text from PDF
        loader = PyPDFLoader(tmp_path)
        pages = loader.load()

        # 2. Split into chunks
        splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        chunks = splitter.split_documents(pages)

        # 3. Embed all chunks
        texts = [c.page_content for c in chunks]
        embeddings = embed_texts(texts)

        # 4. Store in ChromaDB
        collection = get_collection()
        ids = [f"{file.name}_chunk_{i}" for i in range(len(texts))]
        metadatas = [{"source": file.name, "page": int(c.metadata.get("page", 0))} for c in chunks]
        collection.upsert(ids=ids, embeddings=embeddings, documents=texts, metadatas=metadatas)

        return Response({"status": "success", "message": f"Ingested {len(chunks)} chunks from '{file.name}'"})

    except Exception as e:
        return Response({"status": "error", "message": str(e)}, status=500)

    finally:
        os.unlink(tmp_path)  # always delete the temp file


@api_view(["POST"])
def rag_chat(request):
    user_message = request.data.get("message", "").strip()

    if not user_message:
        return Response({"status": "error", "message": "No message provided."}, status=400)

    try:
        # 1. Embed the question
        question_embedding = embed_texts([user_message])[0]

        # 2. Search ChromaDB for top 3 relevant chunks
        collection = get_collection()
        results = collection.query(query_embeddings=[question_embedding], n_results=3)

        context_chunks = results["documents"][0] if results.get("documents") else []
        sources = list({m.get("source", "unknown") for m in results["metadatas"][0]}) if results.get("metadatas") else []

        # 3. Build the prompt with context
        if context_chunks:
            context = "\n\n---\n\n".join(context_chunks)
            system_prompt = "You are a helpful assistant. Answer based on the provided document context. If the context doesn't have the answer, say so."
            user_prompt = f"Context:\n{context}\n\nQuestion: {user_message}"
        else:
            system_prompt = "You are a helpful technical coding assistant."
            user_prompt = user_message

        # 4. Send to Groq
        client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )

        return Response({
            "status": "success",
            "response": completion.choices[0].message.content,
            "sources": sources,
        })

    except Exception as e:
        return Response({"status": "error", "message": str(e)}, status=500)
