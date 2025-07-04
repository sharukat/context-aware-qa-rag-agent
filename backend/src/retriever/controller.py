import json
import logging
from fastapi import APIRouter, HTTPException
from .models import QuestionRequest, ContextResponse
from .service import retrieve_documents
from src.search_mcp.client import agent

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api",
    tags=["Documents"]
)

@router.post('/getdocuments', response_model=ContextResponse)
async def get_documents(request: QuestionRequest):
    docs = retrieve_documents(request.question)
    logger.info(f"Length of docs: {len(docs)}")
    if docs:
        joined_content = "\n".join([doc.page_content for doc in docs])
        return ContextResponse(response=joined_content)
    else:
        # Use web search when no documents are found
        try:
            full_response = ""
            urls = []
            
            async for chunk, is_tool in agent(request.question):
                if chunk:
                    if is_tool:
                        try:
                            chunk_dict = json.loads(chunk)
                            if isinstance(chunk_dict, dict) and "results" in chunk_dict:
                                for result in chunk_dict["results"][:3]:
                                    urls.append({"title": result["title"], "url": result["url"]})
                        except json.JSONDecodeError:
                            logger.warning(f"Failed to parse tool call content: {chunk}")
                    else:
                        full_response += chunk
            logger.info(urls)
            return ContextResponse(response=full_response, urls=urls)
        except Exception as e:
            logger.error(f"Error in web search: {e}")
            raise HTTPException(status_code=500, detail="Error performing web search")

    raise HTTPException(status_code=404, detail="No documents found")