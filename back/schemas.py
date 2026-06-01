from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    department: str = "IT Department" 

class FlashcardCreate(BaseModel):
    user_id: int
    word_en: str
    context_sentence: str
    translation_uk: Optional[str] = None
    transcription: Optional[str] = None

class AITranslateRequest(BaseModel):
    word_en: str
    context_sentence: str

class UserLogin(BaseModel):
    email: str
    password: str

class DocumentResponse(BaseModel):
    id: int
    filename: str
    uploaded_at: datetime
    
    class Config:
        from_attributes = True