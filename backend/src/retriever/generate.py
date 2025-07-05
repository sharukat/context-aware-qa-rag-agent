import os
import logging
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import BaseMessage
from pydantic import BaseModel, Field
from langchain_core.runnables.history import RunnableWithMessageHistory

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv(dotenv_path="../.env")
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

store = {}

def get_by_session_id(session_id: str) -> BaseChatMessageHistory:
    if session_id not in store:
        store[session_id] = InMemoryHistory()
    return store[session_id]

async def generate(question: str, context: str, thread_id: str = None):
    logger.info("Executing the AI model")
    system = (
        "You are an expert in question answering."
        "First, analyze the question carefully and think step by step."
        "Provide accurate, factual answers based only on the context information.\n\n{context} "
        "If unsure about any details, clearly state that information might be inaccurate."
        )
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", system,),
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
        config={"configurable": {"session_id": thread_id}}
    ):
        if hasattr(chunk, 'content') and chunk.content:
            yield chunk.content
