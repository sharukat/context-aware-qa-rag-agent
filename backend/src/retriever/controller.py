import json
import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from src.models import ChatRequest
from .models import QuestionRequest, ContextResponse
from .service import retrieve_documents
from src.search_mcp.client import agent
from .generate import generate

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api",
    tags=["Documents"]
)


@router.post('/rag')
async def rag_stream(request: ChatRequest):    
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
                async for chunk, is_tool in agent(request.question, request.chatId):
                    if chunk:
                        if is_tool:
                            try:
                                chunk_dict = json.loads(chunk)
                                if isinstance(chunk_dict, dict) and "results" in chunk_dict:
                                    for result in chunk_dict["results"][:3]:
                                        urls.append({"title": result["title"], "citation": result["url"]})
                            except json.JSONDecodeError:
                                logger.warning(f"Failed to parse tool call content: {chunk}")
                        else:
                            full_response += chunk
                
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

@router.post('/getdocuments', response_model=ContextResponse)
async def get_documents(request: QuestionRequest):
    docs = retrieve_documents(request.question)
    logger.info(f"Length of docs: {len(docs)}")
    citations = []
    cite_hash = set()
    if docs:
        page_contents = []
        for doc in docs:
            key = (Path(doc.metadata["source"]).name, doc.metadata["page"])
            if key not in cite_hash:
                citations.append({"title": key[0], "citation": str(key[1])})
                cite_hash.add(key)
            page_contents.append(doc.page_content)
        joined_content = "\n".join(page_contents)
        logger.info(citations)
        return ContextResponse(response=joined_content, citations=citations)
    else:
        # Use web search when no documents are found
        try:
            full_response = ""
            async for chunk, is_tool in agent(request.question):
                if chunk:
                    if is_tool:
                        try:
                            chunk_dict = json.loads(chunk)
                            if isinstance(chunk_dict, dict) and "results" in chunk_dict:
                                for result in chunk_dict["results"][:3]:
                                    citations.append({"title": result["title"], "citation": result["url"]})
                        except json.JSONDecodeError:
                            logger.warning(f"Failed to parse tool call content: {chunk}")
                    else:
                        full_response += chunk
            return ContextResponse(response=full_response, citations=citations)
        except Exception as e:
            logger.error(f"Error in web search: {e}")
            raise HTTPException(status_code=500, detail="Error performing web search")

    raise HTTPException(status_code=404, detail="No documents found")