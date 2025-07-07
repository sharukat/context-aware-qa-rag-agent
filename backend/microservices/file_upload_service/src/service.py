import os
import logging
from typing import List
from langchain_qdrant import QdrantVectorStore, RetrievalMode
from .utils.text_splitter import SemanticChunker
from langchain_community.document_loaders import PDFPlumberLoader
from langchain_community.document_loaders import UnstructuredHTMLLoader
from langchain_core.documents import Document
from langchain_qdrant import FastEmbedSparse
from langchain_nomic import NomicEmbeddings

logger = logging.getLogger(__name__)

os.environ["NOMIC_API_KEY"] = os.getenv("NOMIC_API_KEY")


class VectorDB:
    """
    A class for creating and managing vector databases from document collections.
    """
    def __init__(self) -> None:
        self.dense_embeddings = NomicEmbeddings(model="nomic-embed-text-v1.5")
        self.sparse_embeddings = FastEmbedSparse(model_name="Qdrant/bm25")


    def chunking(self, documents: List[Document]) -> List[dict]:
        """
        Uses semantic chunking with percentile-based breakpoint threshold
        to create document chunks that preserve context.
        
        Args:
            documents (List[Document]): List of documents to be chunked
            
        Returns:
            List[dict]: List of document chunks with metadata
        """
        chunker = SemanticChunker(
            embeddings=self.dense_embeddings,
            breakpoint_threshold_type="percentile"
        )
        chunks = chunker.split_documents(documents)
        return chunks


    def add_prefix_to_documents(self, documents: List[Document]):
        """
        Prepends "search_document: " to each document's page content to
        improve retrieval accuracy.
        
        Args:
            documents (List[Document]): List of documents to modify
            
        Returns:
            List[Document]: Modified documents with search prefix added
        """
        for doc in documents:
            doc.page_content = f"search_document: {doc.page_content}"
        return documents


    def create_vectordb(self, folder_path: str):
        """
        Create a Qdrant vector database with hybrid retrieval capabilities 
        using both dense and sparse embeddings.
        
        Args:
            folder_path (str): Path to the folder containing documents to process
        """
        try:
            if not os.path.exists("./qdrant"):
                os.makedirs("qdrant")

            all_documents = []
            if not os.path.isdir(folder_path):
                raise ValueError("Not a valid directory")

            for filename in os.listdir(folder_path):
                file_path = os.path.join(folder_path, filename)

                if not os.path.isfile(file_path):
                    continue

                if filename.lower().endswith('.pdf'):
                    loader = PDFPlumberLoader(file_path)
                    documents = loader.load()
                    all_documents.extend(documents)
                elif filename.lower().endswith('.html'):
                    loader = UnstructuredHTMLLoader(file_path)
                    documents = loader.load()
                    all_documents.extend(documents)

            if all_documents:
                chunks = self.chunking(all_documents)
                prefixed_chunks = self.add_prefix_to_documents(chunks)
                QdrantVectorStore.from_documents(
                    documents=prefixed_chunks,
                    collection_name="qdrantdb",
                    embedding=self.dense_embeddings,
                    sparse_embedding=self.sparse_embeddings,
                    prefer_grpc=False,
                    path="./qdrant",
                    retrieval_mode=RetrievalMode.HYBRID,
                )
                print(f"{len(chunks)} documents added to the vector store.")
        except Exception as e:
            raise e
