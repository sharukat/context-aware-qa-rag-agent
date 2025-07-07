import os
import logging
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from langchain_groq import ChatGroq
from langchain_mcp_adapters.tools import load_mcp_tools
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import InMemorySaver

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

os.environ["GROQ_API_KEY"] = os.environ.get("GROQ_API_KEY")

llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0,
    streaming=True
)

# Get the absolute path to server.py relative to this file
current_dir = os.path.dirname(os.path.abspath(__file__))
server_py_path = os.path.join(current_dir, "server.py")

server_params = StdioServerParameters(
    command="python3",
    args=[server_py_path],
    env=None,
)

checkpointer = InMemorySaver()

async def agent(question: str, thread_id: str = None):
    """
    This function establishes a connection to an MCP server, loads available tools,
    and creates a ReAct agent that can use those tools to answer questions.
    
    Args:
        question (str): The user's question to answer using MCP server tools
        thread_id (str, optional): Unique identifier for maintaining conversation history.
        
    Yields:
        tuple: (content, is_tool_call) where:
            - content (str): Response content or tool result from MCP server
            - is_tool_call (bool): True if the chunk is from a tool call, False if it's content
    """
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await load_mcp_tools(session)
            agent = create_react_agent(
                model=llm,
                tools=tools,
                prompt="You are a helpful assistant. Respond concisely and only answer the specific question asked.",
                checkpointer=checkpointer
            )
            config = {"configurable": {"thread_id": thread_id}} if thread_id else {}
            logger.info(f"Conversation thread ID: {thread_id}")

            message = {"messages": [{"role": "user", "content": question}]}

            async for chunk in agent.astream(message, config, stream_mode="messages"):
                message = chunk[0]
                yield (message.content, True if hasattr(message, "tool_call_id") else False)
                