import os
import logging
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_tavily import TavilySearch
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import InMemorySaver

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

checkpointer = InMemorySaver()

async def agent(question: str, thread_id: str = None):
    search_tool = TavilySearch(max_results=5, topic="general")
    agent = create_react_agent(
            model=llm, 
            tools=[search_tool],
            prompt="You are a helpful assistant. Respond concisely and only answer the specific question asked.",
            checkpointer=checkpointer
        )
    config = {"configurable": {"thread_id": thread_id}} if thread_id else {}
    logger.info(f"Conversation thread ID: {thread_id}")
    
    # Create the message with the current question
    message = {"messages": [{"role": "user", "content": question}]}
    
    # Stream the response with conversation history maintained
    async for chunk in agent.astream(message, config, stream_mode="messages"):
        message = chunk[0]
        yield (message.content, True if hasattr(message, "tool_call_id") else False)

            
                