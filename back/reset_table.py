from database import engine
import models

print("Починаємо оновлення бази даних...")

# 1. Видаляємо СТАРУ таблицю документів (якщо вона існує)
models.Document.__table__.drop(engine, checkfirst=True)
print("Стара таблиця видалена.")

# 2. Створюємо НОВУ таблицю з правильними колонками (filename)
models.Base.metadata.create_all(bind=engine)
print("Нова таблиця успішно створена!")