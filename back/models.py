from sqlalchemy import Column, Integer, String, Text, Float, Date, ForeignKey, Enum, TIMESTAMP, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

# Модель користувача
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    department = Column(String(100), default="IT Department")
    role = Column(Enum('user', 'admin'), default='user')
    created_at = Column(TIMESTAMP, server_default=func.now())

    documents = relationship("Document", back_populates="owner", cascade="all, delete-orphan")
    flashcards = relationship("Flashcard", back_populates="owner", cascade="all, delete-orphan")

# Модель документа
class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    filename = Column(String(255), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", back_populates="documents")

# Модель навчальної картки
class Flashcard(Base):
    __tablename__ = "flashcards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    word_en = Column(String(100), nullable=False)
    translation_uk = Column(String(255), nullable=False)
    transcription = Column(String(100))
    context_sentence = Column(Text)
    
    # Інтервальне повторення
    repetition_count = Column(Integer, default=0)
    ease_factor = Column(Float, default=2.5)
    interval_days = Column(Integer, default=0)
    next_review_date = Column(Date, nullable=False)
    
    created_at = Column(TIMESTAMP, server_default=func.now())

    owner = relationship("User", back_populates="flashcards")
    logs = relationship("ReviewLog", back_populates="flashcard", cascade="all, delete-orphan")

# Модель логів
class ReviewLog(Base):
    __tablename__ = "review_logs"

    id = Column(Integer, primary_key=True, index=True)
    flashcard_id = Column(Integer, ForeignKey("flashcards.id", ondelete="CASCADE"), nullable=False)
    review_date = Column(TIMESTAMP, server_default=func.now())
    grade = Column(Integer, nullable=False)

    flashcard = relationship("Flashcard", back_populates="logs")