from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import date, timedelta
import google.generativeai as genai
import json
import os
import PyPDF2
from fastapi.responses import FileResponse
from gtts import gTTS
import models
import schemas
from database import engine, get_db
from pydantic import BaseModel
import chardet
import io
from fastapi.middleware.cors import CORSMiddleware

# Створення таблиць
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Tech Vocab API для КП «ХТМ»")

# Папки для файлів
AUDIO_DIR = "audio_files"
os.makedirs(AUDIO_DIR, exist_ok=True)

DOCS_DIR = "uploaded_docs"
os.makedirs(DOCS_DIR, exist_ok=True)

# Налаштування CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Налаштування Gemini
genai.configure(api_key="AIzaSyDCSQxY857-sJZLtEbAsKAaLB4SJwWv6iQ")

@app.get("/test-db")
def test_database_connection(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "success", "message": "Підключення до MySQL успішно встановлено!"}
    except Exception as e:
        return {"status": "error", "message": f"Помилка підключення: {str(e)}"}

@app.post("/users/")
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Цей Email вже зареєстровано")
    
    new_user = models.User(
        email=user.email,
        password_hash=user.password, 
        full_name=user.full_name,
        department=user.department
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "Користувача успішно створено!", "user_id": new_user.id, "name": new_user.full_name}

@app.get("/documents/user/{user_id}")
def get_user_documents(user_id: int, db: Session = Depends(get_db)):
    docs = db.query(models.Document).filter(models.Document.user_id == user_id).all()
    return [{"id": doc.id, "filename": doc.filename} for doc in docs]

@app.post("/flashcards/")
def create_flashcard(card: schemas.FlashcardCreate, db: Session = Depends(get_db)):
    # Перевірка користувача
    user = db.query(models.User).filter(models.User.id == card.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Користувача не знайдено")

    # Автозаповнення через ШІ
    final_translation = card.translation_uk
    final_transcription = card.transcription

    if not final_translation or not final_transcription:
        try:
            model = genai.GenerativeModel(model_name="models/gemini-2.5-flash")
            prompt = f"""
            Ти — професійний технічний перекладач у сфері теплоенергетики, водопостачання, зварювальних робіт та експлуатації промислового обладнання. 
            Переклади англійський термін "{card.word_en}" українською мовою, використовуючи термінологію, зрозумілу для слюсарів, зварювальників та інженерів.
            Враховуй цей контекст: "{card.context_sentence}".
            ВАЖЛИВО: Надай вимову (транскрипцію) цього слова УКРАЇНСЬКИМИ ЛІТЕРАМИ так, як воно читається (наприклад, [велдінг], [пайп], [преше]). 
            Поверни відповідь СУВОРО у форматі JSON:
            {{
            "translation": "переклад терміну",
            "transcription": "вимова українськими літерами"
            }}
            """

            response = model.generate_content(prompt)
            clean_text = response.text.strip().replace('```json', '').replace('```', '')
            ai_data = json.loads(clean_text)
            
            final_translation = final_translation or ai_data.get("translation")
            final_transcription = final_transcription or ai_data.get("transcription")
        except Exception as e:
            if not final_translation:
                raise HTTPException(status_code=500, detail=f"Помилка ШІ під час автозаповнення: {str(e)}")

    # Інтервальне повторення
    first_interval = 1
    review_date = date.today() + timedelta(days=first_interval)

    # Збереження картки
    new_card = models.Flashcard(
        user_id=card.user_id,
        word_en=card.word_en,
        translation_uk=final_translation,
        transcription=final_transcription,
        context_sentence=card.context_sentence,
        repetition_count=0,
        ease_factor=2.5,
        interval_days=first_interval, 
        next_review_date=review_date
    )
    
    db.add(new_card)
    db.commit()
    db.refresh(new_card)
    
    return {
        "status": "success",
        "message": "Картка успішно додана!", 
        "data": {
            "id": new_card.id,
            "word": new_card.word_en,
            "translation": new_card.translation_uk,
            "transcription": new_card.transcription,
            "next_review": new_card.next_review_date
        }
    }

@app.get("/flashcards/review/{user_id}")
def get_cards_for_review(user_id: int, db: Session = Depends(get_db)):
    today = date.today()
    cards = db.query(models.Flashcard).filter(
        models.Flashcard.user_id == user_id,
        models.Flashcard.next_review_date <= today
    ).all()
    
    if not cards:
        return {"message": "На сьогодні немає слів для повторення. Відмінна робота!"}
    
    return {
        "date": today, 
        "cards_to_review": len(cards), 
        "cards": cards
    }

@app.get("/flashcards/all/{user_id}")
def get_all_cards(user_id: int, db: Session = Depends(get_db)):
    cards = db.query(models.Flashcard).filter(models.Flashcard.user_id == user_id).all()
    return cards

class ReviewAnswer(BaseModel):
    grade: int  # 1 - Важко, 2 - Добре, 3 - Легко

@app.put("/flashcards/answer/{card_id}")
def answer_flashcard(card_id: int, answer: ReviewAnswer, db: Session = Depends(get_db)):
    card = db.query(models.Flashcard).filter(models.Flashcard.id == card_id).first()
    
    if not card:
        raise HTTPException(status_code=404, detail="Картка не знайдена")

    # Розрахунок інтервалів
    if answer.grade == 1: 
        card.repetition_count = 0
        card.interval_days = 1
        card.ease_factor = max(1.3, card.ease_factor - 0.2)
    else: 
        card.repetition_count += 1
        if answer.grade == 3: 
            card.ease_factor += 0.15
            
        if card.repetition_count == 1:
            card.interval_days = 1
        elif card.repetition_count == 2:
            card.interval_days = 6
        else:
            card.interval_days = round(card.interval_days * card.ease_factor)

    card.next_review_date = date.today() + timedelta(days=card.interval_days)
    
    # Запис у журнал
    new_log = models.ReviewLog(
        flashcard_id=card.id,
        grade=answer.grade,
        review_date=date.today()
    )
    db.add(new_log)
    
    db.commit()
    db.refresh(card)
    
    return {
        "message": "Прогрес збережено та записано в журнал!",
        "word": card.word_en,
        "next_review_date": card.next_review_date
    }

@app.post("/ai/translate/")
def translate_word_with_ai(request: schemas.AITranslateRequest):
    try:
        model = genai.GenerativeModel(model_name="models/gemini-2.5-flash")
        prompt = f"""
        Ти - професійний технічний перекладач КП «ХТМ».
        Переклади термін "{request.word_en}" у контексті: "{request.context_sentence}".
        
        Поверни результат СУВОРО у форматі JSON:
        {{
            "translation_uk": "переклад українською",
            "transcription": "транскрипція"
        }}
        """
        response = model.generate_content(prompt)
        clean_text = response.text.strip().replace('```json', '').replace('```', '')
        return json.loads(clean_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Помилка ШІ: {str(e)}")
    
@app.delete("/flashcards/{card_id}")
def delete_flashcard(card_id: int, db: Session = Depends(get_db)):
    card = db.query(models.Flashcard).filter(models.Flashcard.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Картка не знайдена")
    
    db.delete(card)
    db.commit()
    return {"message": f"Слово '{card.word_en}' видалено зі словника"}

@app.put("/flashcards/{card_id}")
def update_flashcard(card_id: int, card_update: schemas.FlashcardCreate, db: Session = Depends(get_db)):
    db_card = db.query(models.Flashcard).filter(models.Flashcard.id == card_id).first()
    if not db_card:
        raise HTTPException(status_code=404, detail="Картка не знайдена")
    
    # Оновлення полів
    db_card.word_en = card_update.word_en
    db_card.translation_uk = card_update.translation_uk
    db_card.transcription = card_update.transcription
    db_card.context_sentence = card_update.context_sentence
    
    db.commit()
    db.refresh(db_card)
    return {"message": "Дані успішно оновлено", "card": db_card}

@app.post("/login")
def login(user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_data.email).first()
    
    if not user or user.password_hash != user_data.password:
        raise HTTPException(status_code=401, detail="Невірний email або пароль")
    
    return {
        "message": "Вхід успішний",
        "user_id": user.id,
        "full_name": user.full_name,
        "department": user.department,
        "role": user.role
    }

@app.get("/admin/stats")
def get_admin_stats(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    stats = []
    for u in users:
        card_count = db.query(models.Flashcard).filter(models.Flashcard.user_id == u.id).count()
        stats.append({
            "id": u.id,
            "name": u.full_name,
            "email": u.email,
            "department": u.department,
            "role": u.role,
            "cards": card_count
        })
    return stats

class NewPassword(BaseModel):
    new_password: str

@app.put("/admin/users/{user_id}/password")
def change_user_password(user_id: int, pwd_data: NewPassword, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Співробітника не знайдено")
    
    user.password_hash = pwd_data.new_password
    db.commit()
    return {"message": "Пароль успішно змінено"}

@app.delete("/admin/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Співробітника не знайдено")
    
    if user.role == 'admin':
        raise HTTPException(status_code=403, detail="Не можна видалити адміністратора через цю панель")

    db.delete(user)
    db.commit()
    return {"message": "Співробітника та всю його історію видалено"}

@app.get("/audio/{word}")
def get_audio(word: str):
    # Очищення слова
    clean_word = word.strip().lower().replace(" ", "_")
    file_path = os.path.join(AUDIO_DIR, f"{clean_word}.mp3")

    # Перевірка кешу
    if not os.path.exists(file_path):
        try:
            tts = gTTS(text=word, lang='en', slow=False)
            tts.save(file_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Помилка генерації аудіо: {str(e)}")

    return FileResponse(
        file_path, 
        media_type="audio/mpeg", 
        content_disposition_type="inline"
    )

@app.post("/documents/upload/")
async def upload_document(
    user_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Користувача не знайдено")

    # Читання в пам'ять
    raw_content = await file.read()
    content = ""

    # Обробка формату
    if file.filename.lower().endswith('.pdf'):
        try:
            pdf_file = io.BytesIO(raw_content)
            reader = PyPDF2.PdfReader(pdf_file)
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    content += text + "\n"
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Помилка читання PDF: {str(e)}")
            
    elif file.filename.lower().endswith('.txt'):
        detected_encoding = chardet.detect(raw_content)['encoding'] or 'utf-8'
        try:
            content = raw_content.decode(detected_encoding)
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="Не вдалося розпізнати кодування файлу. Використовуйте UTF-8.")
    else:
        raise HTTPException(status_code=400, detail="Підтримуються лише .txt та .pdf файли")

    # Збереження метаданих
    new_doc = models.Document(
        user_id=user_id,
        filename=file.filename
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    
    # Відправка тексту
    return {
        "message": "Документ безпечно оброблено в RAM",
        "document_id": new_doc.id,
        "filename": new_doc.filename,
        "session_content": content
    }