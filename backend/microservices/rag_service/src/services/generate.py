import os
import logging
from langchain_groq import ChatGroq
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import BaseMessage
from pydantic import BaseModel, Field
from langchain_core.runnables.history import RunnableWithMessageHistory

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

os.environ["GROQ_API_KEY"] = os.environ.get("GROQ_API_KEY")


llm = ChatGroq(
    model="llama-3.3-70b-versatile", temperature=0, streaming=True, max_retries=5
)


class InMemoryHistory(BaseChatMessageHistory, BaseModel):
    """In memory implementation of chat message history."""

    messages: list[BaseMessage] = Field(default_factory=list)

    def add_message(self, message: BaseMessage) -> None:
        """Add a message to the store"""
        self.messages.append(message)

    def add_messages(self, messages: list[BaseMessage]) -> None:
        """Add a list of messages to the store"""
        self.messages.extend(messages)

    def get_messages(self) -> list[BaseMessage]:
        """Get all messages from the store"""
        return self.messages

    def clear(self) -> None:
        self.messages = []


class ResponseFormatter(BaseModel):
    """Always use this tool to structure your response to the user."""

    answer: str = Field(description="The answer to the user's question")


def generateHyde(question: str) -> str:
    """
    This function creates a hypothetical answer to the question as if it were extracted from
    a relevant document, which can be used for better document retrieval in RAG systems.

    Args:
        question (str): The user's question to generate a hypothetical answer for

    Returns:
        str: A hypothetical answer that could be found in a relevant document
    """
    system = "You are an expert in question answering. Imagine you are given the resource mentioned within the question.Provide a concise answer assuming you are provided with the mentioned document."
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                system,
            ),
            ("human", "{input}"),
        ]
    )
    chain = prompt | llm.with_structured_output(ResponseFormatter)
    response = chain.invoke({"input": question})
    return response.answer


store = {}


def get_by_session_id(session_id: str) -> BaseChatMessageHistory:
    """
    Retrieve or create a chat message history for a given session ID.

    Args:
        session_id (str): Unique identifier for the chat session

    Returns:
        BaseChatMessageHistory: Chat message history for the specified session
    """
    if session_id not in store:
        store[session_id] = InMemoryHistory()
    return store[session_id]


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
        get_by_session_id,
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
