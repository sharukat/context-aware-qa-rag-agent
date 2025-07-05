from fastapi import FastAPI
from fastapi_mcp import FastApiMCP
from fastapi.middleware.cors import CORSMiddleware
from .controller import router as stocks_router


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stocks_router)

mcp = FastApiMCP(app)
mcp.mount(stocks_router)
