import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_tavily import TavilySearch
from langgraph.prebuilt import create_react_agent

import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv(dotenv_path="../.env")
os.environ["GROQ_API_KEY"] = os.environ.get("GROQ_API_KEY")
os.environ["TAVILY_API_KEY"] = os.environ.get("TAVILY_API_KEY")

llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0,
    streaming=True
)

async def agent(question: str):
    search_tool = TavilySearch(max_results=5, topic="general")
    agent = create_react_agent(llm, [search_tool])
    message = {"messages": [{"role": "user", "content": question}]}
    async for chunk in agent.astream(message, stream_mode="messages"):
                message = chunk[0]
                yield (message.content, True if hasattr(message, "tool_call_id") else False)

            
                