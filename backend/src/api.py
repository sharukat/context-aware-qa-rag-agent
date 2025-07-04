from fastapi import FastAPI
from src.retriever.controller import router as retriever_router
from src.uploader.controller import router as uploader_router
from src.health.controller import router as health_router
from src.stocks_mcp.controller import router as stocks_mcp_router
from src.search_mcp.controller import router as search_mcp_rounter

def register_routes(app: FastAPI):
    app.include_router(health_router)
    app.include_router(retriever_router)
    app.include_router(uploader_router)
    app.include_router(stocks_mcp_router)
    app.include_router(search_mcp_rounter)
