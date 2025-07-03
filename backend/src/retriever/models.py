from pydantic import BaseModel

class QuestionRequest(BaseModel):
    question: str
    
class ContextResponse(BaseModel):
    response: str