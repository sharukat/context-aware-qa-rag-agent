from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from src.models import ChatRequest
from ..stocks_mcp.client import agent
import json


router = APIRouter(
    prefix="/mcp",
    tags=["Stock MCP"]
)


@router.post('/stocks')
async def stocks_mcp(request: ChatRequest):
    async def generate_response():
        urls = []
        async for chunk, isTool in agent(request.question, request.chatId):
            if chunk:
                if isTool:
                    # This is a tool call result (URLs)
                    try:
                        chunk_dict = json.loads(chunk)
                        if isinstance(chunk_dict, dict) and "results" in chunk_dict:
                            for result in chunk_dict["results"][:3]:
                                urls.append({"title": result["title"], "url": result["url"]})
                    except json.JSONDecodeError:
                        pass
                else:
                    # This is the final response content
                    yield f"data: {json.dumps({'content': chunk})}\n\n"
        
        # Send URLs at the end
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