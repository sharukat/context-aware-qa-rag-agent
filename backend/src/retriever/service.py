import os
import logging
from typing import List
from dotenv import load_dotenv

from pydantic import BaseModel, Field
from langchain.chat_models import init_chat_model
from langchain_cohere import CohereRerank
from langchain_groq import ChatGroq
from langchain_core.documents import Document
from langchain.retrievers import contextual_compression
from langchain_qdrant import QdrantVectorStore, RetrievalMode
from langchain_qdrant import FastEmbedSparse
from langchain_nomic import NomicEmbeddings
from langchain_core.prompts import ChatPromptTemplate

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv(dotenv_path="../.env")
os.environ["GROQ_API_KEY"] = os.environ.get("GROQ_API_KEY")
os.environ["COHERE_API_KEY"] = os.getenv("COHERE_API_KEY")
os.environ["NOMIC_API_KEY"] = os.getenv("NOMIC_API_KEY")

llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0,
    streaming=True
)
llm = init_chat_model("groq:llama-3.3-70b-versatile", temperature=0)

# Initialize embeddings and retriever once
dense_embeddings = NomicEmbeddings(model="nomic-embed-text-v1.5")
sparse_embeddings = FastEmbedSparse(model_name="Qdrant/bm25")

def repack_documents(documents: List[Document]) -> List[Document]:
    try:
        return sorted(
            documents,
            key=lambda doc: doc.metadata.get("relevance_score", 0),
            reverse=False,
        )
    except Exception as e:
        logging.info(e)
        raise ValueError(f"Error sorting documents: {e}")

class ResponseFormatter(BaseModel):
    """Always use this tool to structure your response to the user."""
    answer: str = Field(description="The answer to the user's question")

def generateHyde(question: str) -> str:
    system = "You are an expert in question answering. Imagine you are given the resource mentioned within the question.Provide a concise answer assuming you are provided with the mentioned document."
    prompt = ChatPromptTemplate.from_messages([("system", system,), ("human", "{input}")])
    chain = prompt | llm.with_structured_output(ResponseFormatter)
    response = chain.invoke({"input": question})
    return response.answer


def retrieve_documents(question: str) -> List[Document]:
    hyde_text = generateHyde(question)
    vectordb = QdrantVectorStore.from_existing_collection(
        embedding=dense_embeddings,
        sparse_embedding=sparse_embeddings,
        collection_name="qdrantdb",
        path="./qdrant",
        retrieval_mode=RetrievalMode.HYBRID,
    )
    retriever = vectordb.as_retriever(search_kwargs={"k": 5})

    compressor = CohereRerank(model="rerank-v3.5", top_n=3)
    c_retriever = contextual_compression.ContextualCompressionRetriever(
        base_compressor=compressor, base_retriever=retriever
    )
    prefixed_question = f"search_query: {hyde_text}"
    reranked_docs = c_retriever.invoke(prefixed_question)
    filtered_docs = [doc for doc in reranked_docs if doc.metadata["relevance_score"] > 0.1]
    return repack_documents(filtered_docs)