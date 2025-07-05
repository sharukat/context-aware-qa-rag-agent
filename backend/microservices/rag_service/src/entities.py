from pydantic import BaseModel
from typing import List, Optional

class QuestionRequest(BaseModel):
    question: str
    
class Reference(BaseModel):
    title: str
    citation: str
    
class ContextResponse(BaseModel):
    response: str
    citations: Optional[List[Reference]] = None

class ChatRequest(BaseModel):
    question: str
    chatId: str = None