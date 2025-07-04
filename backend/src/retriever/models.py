from pydantic import BaseModel
from typing import List, Optional

class QuestionRequest(BaseModel):
    question: str
    
class Reference(BaseModel):
    title: str
    url: str
    
class ContextResponse(BaseModel):
    response: str
    urls: Optional[List[Reference]] = None