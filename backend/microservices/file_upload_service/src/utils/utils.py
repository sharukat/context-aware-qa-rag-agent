import os
import shutil
from langchain_qdrant import FastEmbedSparse
from langchain_nomic import NomicEmbeddings

os.environ["NOMIC_API_KEY"] = os.getenv("NOMIC_API_KEY")


def load_embedding_models():
    dense_embeddings = NomicEmbeddings(model="nomic-embed-text-v1.5")
    sparse_embeddings = FastEmbedSparse(model_name="Qdrant/bm25")
    return dense_embeddings, sparse_embeddings

def clean_folder(folder):
    """
    Remove all files and subdirectories from the specified folder.
    
    Args:
        folder (str): Path to the folder to clean
    """
    for filename in os.listdir(folder):
        file_path = os.path.join(folder, filename)
        try:
            if os.path.isfile(file_path) or os.path.islink(file_path):
                os.unlink(file_path)
            elif os.path.isdir(file_path):
                shutil.rmtree(file_path)
        except Exception as e:
            print(f'Failed to delete {file_path}. Reason: {e}')