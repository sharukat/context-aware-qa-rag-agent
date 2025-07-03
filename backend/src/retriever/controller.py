from fastapi import APIRouter, HTTPException
from .models import QuestionRequest, ContextResponse
from .service import retrieve_documents

router = APIRouter(
    prefix="/api",
    tags=["Documents"]
)

@router.post('/getdocuments', response_model=ContextResponse)
def get_documents(request: QuestionRequest):
    docs = retrieve_documents(request.question)
    if docs:
        joined_content = "\n".join([doc.page_content for doc in docs])
        return ContextResponse(response=joined_content)
    raise HTTPException(status_code=404, detail="No documents found")