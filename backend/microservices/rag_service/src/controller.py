import json
import logging
import aiohttp
from pathlib import Path
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from .entities import ChatRequest
from .services.retriever import retrieve_documents
from .services.generate import generate

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/v1/rag",
    tags=["Documents"]
)


@router.post('/generate')
async def rag_stream(request: ChatRequest):    
    """
    This endpoint implements a Retrieval-Augmented Generation (RAG) system that:
    1. Retrieves relevant documents from the vector database based on the question
    2. Falls back to web search if no documents are found
    3. Provides citations for the sources used
    
    Args:
        request (ChatRequest): Request containing the question and chat ID
        
    Returns:
        StreamingResponse: Server-Sent Events (SSE) stream containing:
            - 'content': Generated response chunks
            - 'citations': List of source citations with title and page numbers
            - 'error': Error message if generation fails
    """
    logger.info("Executing RAG microservice")
    async def generate_response():
        try:
            # Retrieve documents
            docs = retrieve_documents(request.question)
            logger.info(f"Length of docs: {len(docs)}")
            
            citations = []
            context = ""
            
            if docs:
                # Build context from documents
                page_contents = []
                cite_hash = set()
                
                for doc in docs:
                    key = (Path(doc.metadata["source"]).name, doc.metadata["page"])
                    if key not in cite_hash:
                        citations.append({"title": key[0], "citation": str(key[1])})
                        cite_hash.add(key)
                    page_contents.append(doc.page_content)
                
                context = "\n".join(page_contents)
                
            else:
                # Fallback to web search
                full_response = ""
                urls = []
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        "http://search-service:8000/v1/search",
                        json={
                            "question": request.question,
                            "chatId": request.chatId,
                        }
                    ) as response:
                        # Handle Server-Sent Events (SSE) response
                        async for line in response.content:
                            line = line.decode('utf-8').strip()
                            if line.startswith('data: '):
                                try:
                                    data = json.loads(line[6:])  # Remove 'data: ' prefix
                                    if 'content' in data:
                                        full_response += data['content']
                                    elif 'citations' in data:
                                        urls = data['citations']
                                except json.JSONDecodeError:
                                    logger.warning(f"Failed to parse SSE data: {line}")

                context = full_response
                citations = urls
            
            # Stream the generated response
            async for chunk in generate(request.question, context, request.chatId):
                yield f"data: {json.dumps({'content': chunk})}\n\n"
            
            # Send citations at the end
            if citations:
                yield f"data: {json.dumps({'citations': citations})}\n\n"
                    
        except Exception as e:
            logger.error(f"Error in RAG streaming: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
        }
    )