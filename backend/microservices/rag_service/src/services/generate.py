import os
import logging
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from pydantic import BaseModel, Field
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.chat_message_histories import SQLChatMessageHistory

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

os.environ["GROQ_API_KEY"] = os.environ.get("GROQ_API_KEY")


llm = ChatGroq(
    model="llama-3.3-70b-versatile", temperature=0, streaming=True, max_retries=5
)


class ResponseFormatter(BaseModel):
    """Always use this tool to structure your response to the user."""

    answer: str = Field(description="The answer to the user's question")



async def generate(question: str, context: str, thread_id: str = None):
    """
    Generate a streaming AI response using RAG (Retrieval-Augmented Generation).

    Args:
        question (str): The user's question to answer
        context (str): Retrieved context information from documents or web search
        thread_id (str, optional): Unique identifier for maintaining conversation history.

    Yields:
        str: Streaming chunks of the generated response
    """
    logger.info("Executing the AI model")
    system = (
        "You are an expert in question answering."
        "First, analyze the question carefully and think step by step."
        "Provide accurate, factual answers based only on the context information.\n\n{context} "
        "If unsure about any details, clearly state that information might be inaccurate."
    )
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", system),
            MessagesPlaceholder(variable_name="history"),
            ("human", "Question:\n{question}"),
        ]
    )

    chain = prompt | llm
    chat = RunnableWithMessageHistory(
        chain,
        lambda session_id: SQLChatMessageHistory(
            session_id=thread_id, 
            connection_string="sqlite+aiosqlite:///./database/history.sqlite",
            async_mode=True
        ),
        input_messages_key="question",
        history_messages_key="history",
    )

    # Stream the response
    async for chunk in chat.astream(
        {"context": context, "question": question},
        config={"configurable": {"session_id": thread_id}},
    ):
        if hasattr(chunk, "content") and chunk.content:
            yield chunk.content
