import os
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from typing import List
from pydantic import BaseModel
from .service import VectorDB
from .utils.utils import clean_folder

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class UploadResponse(BaseModel):
    message: str
    files: List[str]
    count: int

UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")
QDRANT_FOLDER = os.path.join(os.getcwd(), "qdrant")

router = APIRouter(
    prefix="/v1",
    tags=["Database"]
)

@router.post('/file-upload', response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def vectordb(files: List[UploadFile] = File(...)):
    """    
    This endpoint accepts multiple files, saves them to the upload directory,
    cleans existing data, and creates a vector database collection from the uploaded files.
    
    Args:
        files (List[UploadFile]): List of files to upload and process.
    
    Returns:
        UploadResponse: Response containing upload status, list of processed files,
                        and count of successfully uploaded files.
    """
    logger.info("Executing file upload microservice")
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    # Clean uploads and qdrant folders
    for folder in [UPLOAD_FOLDER, QDRANT_FOLDER]:
        if os.path.exists(folder):
            clean_folder(folder)
        else:
            os.makedirs(folder, exist_ok=True)

    uploaded_files = []

    for file in files:
        if not file.filename:
            continue
        file_path = os.path.join(UPLOAD_FOLDER, file.filename)
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())
        uploaded_files.append(file.filename)

    if uploaded_files:
        logger.info("Starting vector database creation...")
        try:
            vectordb_service = VectorDB()
            vectordb_service.create_vectordb(UPLOAD_FOLDER)
            logger.info("Vector database creation completed successfully")
        except Exception as e:
            logger.error(f"Error creating vector database: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to create vector database: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="No valid files uploaded")

    logger.info(f"File upload completed. {len(uploaded_files)} files processed")
    return UploadResponse(
        message="Files uploaded successfully",
        files=uploaded_files,
        count=len(uploaded_files)
    )