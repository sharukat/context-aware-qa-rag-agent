import os
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from typing import List
from .models import UploadResponse
from .service import VectorDB
from src.utils.utils import clean_folder

UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")
QDRANT_FOLDER = os.path.join(os.getcwd(), "qdrant")

router = APIRouter(
    prefix="/api",
    tags=["Database"]
)

@router.post('/upload', response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def vectordb(files: List[UploadFile] = File(...)):
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

    # Create vector database if files were uploaded
    if uploaded_files:
        vectordb_service = VectorDB()
        vectordb_service.create_vectordb(UPLOAD_FOLDER)
    else:
        raise HTTPException(status_code=400, detail="No valid files uploaded")

    return UploadResponse(
        message="Files uploaded successfully",
        files=uploaded_files,
        count=len(uploaded_files)
    )