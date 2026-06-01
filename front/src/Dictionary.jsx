import { useState, useEffect } from 'react';
import api from './api';

export default function Dictionary({ userId, activeTab }) {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);

    // Стан редагування
    const [editingCard, setEditingCard] = useState(null);

    // Стани ручного додавання
    const [newWord, setNewWord] = useState('');
    const [newContext, setNewContext] = useState('');
    const [isTranslating, setIsTranslating] = useState(false);

    const fetchCards = async () => {
        try {
            const response = await api.get(`/flashcards/all/${userId}`);
            setCards(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Помилка завантаження словника:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId && activeTab === 'dictionary') {
            fetchCards();
        }
    }, [userId, activeTab]);

    // Додавання слова
    const handleAddWord = async (e) => {
        e.preventDefault();
        if (!newWord.trim()) return;
        setIsTranslating(true);
        
        try {
            await api.post('/flashcards/', {
                user_id: userId,
                word_en: newWord.trim(),
                context_sentence: newContext.trim()
            });
            
            setNewWord('');
            setNewContext('');
            fetchCards(); 
        } catch (error) {
            alert("Помилка додавання слова: " + (error.response?.data?.detail || error.message));
        } finally {
            setIsTranslating(false);
        }
    };

    const playAudio = async (word) => {
        try {
            const response = await api.get(`/audio/${word}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const audio = new Audio(url);
            audio.play();
        } catch (error) {
            alert("Помилка відтворення аудіо. Перевірте підключення до сервера.");
        }
    };

    const handleDelete = async (cardId) => {
        if (window.confirm("Ви впевнені, що хочете видалити це слово зі словника?")) {
            try {
                await api.delete(`/flashcards/${cardId}`);
                setCards(cards.filter(card => card.id !== cardId));
            } catch (error) {
                alert("Помилка при видаленні: " + (error.response?.data?.detail || error.message));
            }
        }
    };

    // Редагування
    const handleEditStart = (card) => {
        setEditingCard({ ...card }); 
    };

    const handleEditSave = async () => {
        try {
            await api.put(`/flashcards/${editingCard.id}`, {
                user_id: userId,
                word_en: editingCard.word_en,
                translation_uk: editingCard.translation_uk,
                transcription: editingCard.transcription,
                context_sentence: editingCard.context_sentence
            });

            setCards(cards.map(c => c.id === editingCard.id ? editingCard : c));
            setEditingCard(null); 
        } catch (error) {
            alert("Помилка при збереженні: " + (error.response?.data?.detail || error.message));
        }
    };

    const handleEditCancel = () => {
        setEditingCard(null); 
    };

    const today = new Date().toISOString().split('T')[0];
    const cardsToReview = cards.filter(c => c.next_review_date <= today).length;

    if (loading) return <p>Завантаження словника...</p>;

    return (
        <div>
            {/* Статистика */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', background: '#222', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #646cff' }}>
                <div>
                    <span style={{ color: '#aaa', fontSize: '14px' }}>Всього термінів у базі:</span>
                    <h2 style={{ margin: '5px 0 0 0', color: '#fff' }}>{cards.length}</h2>
                </div>
                <div style={{ borderLeft: '1px solid #444', paddingLeft: '20px' }}>
                    <span style={{ color: '#aaa', fontSize: '14px' }}>На черзі для тестування:</span>
                    <h2 style={{ margin: '5px 0 0 0', color: cardsToReview > 0 ? '#ffc107' : '#28a745' }}>
                        {cardsToReview} {cardsToReview === 0 && '🎉'}
                    </h2>
                </div>
            </div>

            {/* Форма додавання */}
            <form onSubmit={handleAddWord} style={{ display: 'flex', gap: '10px', marginBottom: '25px', background: '#222', padding: '15px', borderRadius: '8px', flexWrap: 'wrap' }}>
                <input 
                    type="text" 
                    placeholder="Англійський термін..." 
                    value={newWord} 
                    onChange={(e) => setNewWord(e.target.value)}
                    required
                    style={{ flex: '1', minWidth: '150px', padding: '10px', background: '#111', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
                />
                <input 
                    type="text" 
                    placeholder="Контекст (речення, де ви це зустріли)..." 
                    value={newContext} 
                    onChange={(e) => setNewContext(e.target.value)}
                    style={{ flex: '2', minWidth: '250px', padding: '10px', background: '#111', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
                />
                <button 
                    type="submit" 
                    disabled={isTranslating} 
                    style={{ padding: '10px 20px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: isTranslating ? 'not-allowed' : 'pointer' }}
                >
                    {isTranslating ? '⏳ ШІ обробляє...' : '➕ Додати вручну'}
                </button>
            </form>

            {/* Список карток */}
            {cards.length === 0 ? (
                <p style={{ color: '#aaa' }}>Ваш словник порожній. Перейдіть до розділу "Документація", щоб додати нові терміни, або впишіть слово вручну вище.</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                    {cards.map(card => {
                        const isEditing = editingCard?.id === card.id;

                        return (
                            <div key={card.id} style={{ border: '1px solid #444', borderRadius: '8px', padding: '15px', backgroundColor: '#222', color: '#eee' }}>
                                {/* Режим редагування */}
                                {isEditing ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <input 
                                            value={editingCard.word_en} 
                                            onChange={e => setEditingCard({...editingCard, word_en: e.target.value})}
                                            style={{ padding: '8px', background: '#111', color: '#fff', border: '1px solid #646cff', borderRadius: '4px', fontWeight: 'bold' }}
                                        />
                                        <input 
                                            value={editingCard.translation_uk} 
                                            onChange={e => setEditingCard({...editingCard, translation_uk: e.target.value})}
                                            style={{ padding: '8px', background: '#111', color: '#fff', border: '1px solid #555', borderRadius: '4px' }}
                                        />
                                        <input 
                                            value={editingCard.transcription} 
                                            onChange={e => setEditingCard({...editingCard, transcription: e.target.value})}
                                            style={{ padding: '8px', background: '#111', color: '#fff', border: '1px solid #555', borderRadius: '4px' }}
                                        />
                                        <textarea 
                                            value={editingCard.context_sentence} 
                                            onChange={e => setEditingCard({...editingCard, context_sentence: e.target.value})}
                                            style={{ padding: '8px', background: '#111', color: '#fff', border: '1px solid #555', borderRadius: '4px', minHeight: '60px', fontFamily: 'inherit' }}
                                        />
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                            <button onClick={handleEditSave} style={{ flex: 1, padding: '8px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>💾 Зберегти</button>
                                            <button onClick={handleEditCancel} style={{ flex: 1, padding: '8px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>❌ Скасувати</button>
                                        </div>
                                    </div>
                                ) : (
                                /* Режим перегляду */
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <h3 style={{ margin: '0 0 10px 0', color: '#646cff' }}>{card.word_en}</h3>
                                            <button 
                                                onClick={() => handleEditStart(card)}
                                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '0' }}
                                                title="Редагувати картку"
                                            >
                                                ✏️
                                            </button>
                                        </div>
                                        <p style={{ margin: '5px 0' }}><strong>Переклад:</strong> {card.translation_uk}</p>
                                        <p style={{ margin: '5px 0', color: '#aaa' }}><em>[{card.transcription}]</em></p>
                                        <div style={{ margin: '10px 0', fontSize: '13px', backgroundColor: '#111', padding: '8px', borderRadius: '4px', borderLeft: '3px solid #646cff' }}>
                                            <strong>Контекст:</strong> {card.context_sentence || "Немає контексту"}
                                        </div>
                                        
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                            <button 
                                                onClick={() => playAudio(card.word_en)}
                                                style={{ flex: '3', padding: '8px', cursor: 'pointer', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px' }}
                                            >
                                                🔊 Вимова
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(card.id)}
                                                style={{ flex: '1', padding: '8px', cursor: 'pointer', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}
                                                title="Видалити слово"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}