from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from .agent import agent
from pydantic import BaseModel
import json

import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/v1",
    tags=["Tavily Search MCP"]
)

class ChatRequest(BaseModel):
    question: str
    chatId: str = None


@router.post('/search')
async def search_mcp(request: ChatRequest):
    logger.info("Executing search microservice")
    async def generate_response():
        urls = []
        async for chunk, isTool in agent(request.question, request.chatId):
            if chunk and isTool is True:
                chunk_dict = json.loads(chunk)
                if isinstance(chunk_dict, dict) and "results" in chunk_dict:
                    for result in chunk_dict["results"][:3]:
                        urls.append({"title": result["title"], "citation": result["url"]})
            if chunk and isTool is False:
                yield f"data: {json.dumps({'content': chunk})}\n\n"
        if urls:
            yield f"data: {json.dumps({'citations': urls})}\n\n"
    return StreamingResponse(
        generate_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
        }
    )