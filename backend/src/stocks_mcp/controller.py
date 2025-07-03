from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from ..stocks_mcp.client import agent
import json


router = APIRouter(
    prefix="/mcp",
    tags=["Stock MCP"]
)

class MCPRequest(BaseModel):
    question: str

@router.post('/')
async def stocks_mcp(request: MCPRequest):
    async def generate_response():
        async for chunk in agent(request.question):
            if chunk:
                yield f"data: {json.dumps({'content': chunk})}\n\n"
    
    return StreamingResponse(
        generate_response(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
        }
    )