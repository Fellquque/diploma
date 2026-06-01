import { useState, useEffect } from 'react';
import api from './api';

export default function Review({ userId }) {
    const [cards, setCards] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchDueCards = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/flashcards/review/${userId}`);
            // Отримання карток з бекенду
            setCards(response.data.cards || []);
            setLoading(false);
        } catch (error) {
            console.error("Помилка завантаження карток для повторення:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDueCards();
    }, [userId]);

    const handleAnswer = async (grade) => {
        const currentCard = cards[currentIndex];
        try {
            // Відправка оцінки
            await api.put(`/flashcards/answer/${currentCard.id}`, { grade });
            
            if (currentIndex < cards.length - 1) {
                setCurrentIndex(currentIndex + 1);
                setShowAnswer(false);
            } else {
                setCards([]); 
            }
        } catch (error) {
            alert("Помилка збереження прогресу");
        }
    };

    if (loading) return <p>Завантаження плану повторень...</p>;

    if (cards.length === 0) return (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <h2>🎉 Всі терміни вивчено!</h2>
            <p>На сьогодні немає слів для повторення. Завантаж нову документацію або відпочинь.</p>
            <button onClick={fetchDueCards} style={{ padding: '10px', cursor: 'pointer' }}>Перевірити ще раз</button>
        </div>
    );

    const currentCard = cards[currentIndex];

    return (
        <div style={{ maxWidth: '500px', margin: '40px auto', textAlign: 'center' }}>
            <p>Залишилося карток: {cards.length - currentIndex}</p>
            
            <div style={{ 
                background: '#2c2c2c', 
                padding: '40px', 
                borderRadius: '15px', 
                minHeight: '250px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                border: '1px solid #444'
            }}>
                <h1 style={{ fontSize: '3rem', margin: 0, color: '#646cff' }}>{currentCard.word_en}</h1>
                
                {showAnswer && (
                    <div style={{ marginTop: '20px', borderTop: '1px solid #444', paddingTop: '20px' }}>
                        <h2 style={{ color: '#28a745' }}>{currentCard.translation_uk}</h2>
                        <p style={{ color: '#aaa' }}>[{currentCard.transcription}]</p>
                        <p style={{ fontStyle: 'italic', fontSize: '14px' }}>"{currentCard.context_sentence}"</p>
                    </div>
                )}
            </div>

            <div style={{ marginTop: '30px' }}>
                {!showAnswer ? (
                    <button 
                        onClick={() => setShowAnswer(true)}
                        style={{ padding: '15px 40px', fontSize: '18px', cursor: 'pointer', background: '#646cff', color: '#fff', border: 'none', borderRadius: '8px' }}
                    >
                        Показати відповідь
                    </button>
                ) : (
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button onClick={() => handleAnswer(1)} style={{ background: '#dc3545', color: '#fff', padding: '15px', border: 'none', borderRadius: '8px', cursor: 'pointer', flex: 1 }}>
                            ❌ Важко
                        </button>
                        <button onClick={() => handleAnswer(2)} style={{ background: '#ffc107', color: '#000', padding: '15px', border: 'none', borderRadius: '8px', cursor: 'pointer', flex: 1 }}>
                            🤔 Добре
                        </button>
                        <button onClick={() => handleAnswer(3)} style={{ background: '#28a745', color: '#fff', padding: '15px', border: 'none', borderRadius: '8px', cursor: 'pointer', flex: 1 }}>
                            ✅ Легко
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}