from django.urls import path
from rag.views import ingest_document, rag_chat

urlpatterns = [
    path("api/ingest/", ingest_document, name="ingest_document"),
    path("api/rag-chat/", rag_chat, name="rag_chat"),
]