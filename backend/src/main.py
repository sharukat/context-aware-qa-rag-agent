from fastapi import FastAPI
from fastapi_mcp import FastApiMCP
from fastapi.middleware.cors import CORSMiddleware
from .api import register_routes
from .logging import configure_logging, LogLevels
from src.stocks_mcp.controller import router as stocks_mcp_router


configure_logging(LogLevels.info)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_routes(app)

mcp = FastApiMCP(app)
mcp.mount(stocks_mcp_router)

