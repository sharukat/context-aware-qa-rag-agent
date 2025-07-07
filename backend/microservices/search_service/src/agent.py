import os
import logging
from langchain_groq import ChatGroq
from langchain_tavily import TavilySearch
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import InMemorySaver

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

os.environ["GROQ_API_KEY"] = os.environ.get("GROQ_API_KEY")
os.environ["TAVILY_API_KEY"] = os.environ.get("TAVILY_API_KEY")

llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0,
    streaming=True
)

checkpointer = InMemorySaver()

async def agent(question: str, thread_id: str = None):
    """
    Create and execute a streaming agent for web search and response generation.
    
    Args:
        question (str): The user's question to search for and answer
        thread_id (str, optional): Unique identifier for maintaining conversation history.
        
    Yields:
        tuple: (content, is_tool_call) where:
            - content (str): Response content or tool result
            - is_tool_call (bool): True if the chunk is from a tool call, False if it's content
    """
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

            
                