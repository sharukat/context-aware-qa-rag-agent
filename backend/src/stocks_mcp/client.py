import os
from dotenv import load_dotenv
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from langchain_groq import ChatGroq
from langchain_mcp_adapters.tools import load_mcp_tools
from langgraph.prebuilt import create_react_agent

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

async def agent(question: str):
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            # Initialize the connection
            await session.initialize()

            # Get tools
            tools = await load_mcp_tools(session)

            # Create and run the agent
            agent = create_react_agent(llm, tools)
            message = {"messages": [{"role": "user", "content": question}]}

            # Collect all messages to get the final response
            async for chunk in agent.astream(message, stream_mode="values"):
                    yield chunk["messages"][-1].content