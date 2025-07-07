import os
import logging
from typing import List
from langchain_cohere import CohereRerank
from langchain_core.documents import Document
from langchain.retrievers import contextual_compression
from langchain_qdrant import QdrantVectorStore, RetrievalMode
from langchain_qdrant import FastEmbedSparse
from langchain_nomic import NomicEmbeddings
# from .generate import generateHyde

logger = logging.getLogger(__name__)

os.environ["COHERE_API_KEY"] = os.getenv("COHERE_API_KEY")
os.environ["NOMIC_API_KEY"] = os.getenv("NOMIC_API_KEY")

# Initialize embeddings and retriever once
dense_embeddings = NomicEmbeddings(model="nomic-embed-text-v1.5")
sparse_embeddings = FastEmbedSparse(model_name="Qdrant/bm25")


def repack_documents(documents: List[Document]) -> List[Document]:
    """
    Sort documents by relevance score in ascending order.

    Args:
        documents (List[Document]): List of documents to sort

    Returns:
        List[Document]: Sorted list of documents by relevance score (ascending)
    """
    try:
        return sorted(
            documents,
            key=lambda doc: doc.metadata.get("relevance_score", 0),
            reverse=False,
        )
    except Exception as e:
        logging.info(e)
        raise ValueError(f"Error sorting documents: {e}")


def retrieve_documents(question: str) -> List[Document]:
    """
    This function implements a multi-stage retrieval process:
    1. Generates a hypothetical answer using HyDE
    2. Performs hybrid search on the vector database
    3. Reranks results using Cohere's rerank-v3.5 model
    4. Filters documents by relevance score threshold
    5. Sorts final results by relevance

    Args:
        question (str): The user's question to find relevant documents for

    Returns:
        List[Document]: List of relevant documents sorted by relevance score
    """
    vectordb = QdrantVectorStore.from_existing_collection(
        embedding=dense_embeddings,
        sparse_embedding=sparse_embeddings,
        collection_name="qdrantdb",
        path="./qdrant",
        retrieval_mode=RetrievalMode.HYBRID,
    )
    retriever = vectordb.as_retriever(search_kwargs={"k": 10})

    compressor = CohereRerank(model="rerank-v3.5", top_n=5)
    c_retriever = contextual_compression.ContextualCompressionRetriever(
        base_compressor=compressor, base_retriever=retriever
    )

    prefixed_question = f"search_query: {question}"
    reranked_docs = c_retriever.invoke(prefixed_question)
    max_relevance = 0
    filtered_docs = []
    for doc in reranked_docs:
        max_relevance = max(max_relevance, doc.metadata["relevance_score"])
        if doc.metadata["relevance_score"] > 0.5:
            filtered_docs.append(doc)
    return repack_documents(filtered_docs), max_relevance
