import os
import logging
from dotenv import load_dotenv
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from langchain_groq import ChatGroq
from langchain_mcp_adapters.tools import load_mcp_tools
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import InMemorySaver

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv(dotenv_path="../.env")
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
                