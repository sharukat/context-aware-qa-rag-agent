from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from ..search_mcp.client import agent
import json

import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/mcp",
    tags=["Tavily Search MCP"]
)

class MCPRequest(BaseModel):
    question: str

@router.post('/search')
async def search_mcp(request: MCPRequest):
    async def generate_response():
        urls = []
        async for chunk, isTool in agent(request.question):
            if chunk and isTool is True:
                chunk_dict = json.loads(chunk)
                if isinstance(chunk_dict, dict) and "results" in chunk_dict:
                    for result in chunk_dict["results"][:3]:
                        urls.append({"title": result["title"], "url": result["url"]})
            if chunk and isTool is False:
                yield f"data: {json.dumps({'content': chunk})}\n\n"
        if urls:
            yield f"data: {json.dumps({'urls': urls})}\n\n"

    return StreamingResponse(
        generate_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
        }
    )