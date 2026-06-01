import { useState, useEffect } from 'react';
import api from './api';

export default function Documents({ userId }) {
    const [docs, setDocs] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null); 
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    // Завантаження історії
    const fetchDocs = async () => {
        try {
            const response = await api.get(`/documents/user/${userId}`);
            setDocs(response.data);
        } catch (error) { 
            console.error("Помилка завантаження історії", error); 
        }
    };

    useEffect(() => {
        if (userId) fetchDocs();
    }, [userId]);

    // Завантаження документа
    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;
        setIsUploading(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('user_id', userId);

        try {
            const response = await api.post('/documents/upload/', formData);
            alert("Документ безпечно оброблено в RAM!");
            
            // Відкриття з пам'яті
            setSelectedDoc({
                filename: response.data.filename,
                content: response.data.session_content
            });
            
            fetchDocs(); 
            setFile(null); 
        } catch (error) {
            alert("Помилка завантаження. " + (error.response?.data?.detail || ""));
        } finally {
            setIsUploading(false);
        }
    };

    // Повідомлення безпеки
    const handleHistoryClick = (docName) => {
        alert(`Документ "${docName}" є архівним логом.\n\nЗ міркувань безпеки КП «ХТМ», тексти інструкцій опрацьовуються виключно в RAM «на льоту» і не зберігаються на сервері.\n\nДля роботи з цим мануалом завантажте його знову.`);
    };

    // Обробка кліку на слово
    const handleWordClick = async (word, sentence) => {
        const cleanWord = word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");
        if (cleanWord.length < 2) return;

        if (window.confirm(`Додати слово "${cleanWord}" у словник?`)) {
            try {
                await api.post('/flashcards/', {
                    user_id: userId,
                    word_en: cleanWord,
                    context_sentence: sentence
                });
                alert(`Слово "${cleanWord}" додано з перекладом від ШІ!`);
            } catch (error) {
                alert("Помилка додавання слова");
            }
        }
    };

    const renderInteractiveText = (text) => {
        if (!text) return null;
        const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [text];
        return sentences.map((sentence, sIdx) => (
            <span key={sIdx} style={{ display: 'inline' }}>
                {sentence.split(' ').map((word, wIdx) => (
                    <span 
                        key={wIdx} 
                        onClick={() => handleWordClick(word, sentence)}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#646cff'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        style={{ cursor: 'pointer', transition: '0.2s', borderRadius: '3px', padding: '0 2px' }}
                    >
                        {word}{' '}
                    </span>
                ))}
            </span>
        ));
    };

    return (
        <div style={{ display: 'flex', gap: '20px' }}>
            {/* Ліва панель */}
            <div style={{ flex: '1', background: '#222', padding: '20px', borderRadius: '10px', height: 'fit-content' }}>
                <h3 style={{ marginTop: 0, color: '#fff' }}>📁 Новий мануал</h3>
                <form onSubmit={handleUpload}>
                    <input type="file" accept=".txt,.pdf" onChange={(e) => setFile(e.target.files[0])} style={{ marginBottom: '10px', width: '100%', color: '#aaa' }} />
                    <button type="submit" disabled={isUploading || !file} style={{ width: '100%', padding: '10px', background: (isUploading || !file) ? '#555' : '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: (isUploading || !file) ? 'not-allowed' : 'pointer' }}>
                        {isUploading ? 'Завантаження...' : 'Відправити на сервер'}
                    </button>
                </form>

                {/* Історія логів */}
                <div style={{ marginTop: '30px', borderTop: '1px solid #444', paddingTop: '20px' }}>
                    <h3 style={{ marginTop: 0, color: '#ffc107' }}>📚 Історія читання</h3>
                    <p style={{ fontSize: '12px', color: '#888', marginTop: '-10px', marginBottom: '15px' }}>
                        Тексти не зберігаються з міркувань безпеки
                    </p>
                    {docs.length === 0 ? (
                        <p style={{ color: '#888', fontSize: '14px' }}>Немає історії сесій</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {docs.map(doc => (
                                <button 
                                    key={doc.id}
                                    onClick={() => handleHistoryClick(doc.filename)}
                                    style={{
                                        padding: '10px',
                                        textAlign: 'left',
                                        background: '#333',
                                        color: '#bbb',
                                        border: '1px solid #444',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}
                                    title={`Лог завантаження: ${doc.filename}`}
                                >
                                    🕒 {doc.filename}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Область читання */}
            <div style={{ flex: '3', background: '#1a1a1a', padding: '30px', borderRadius: '10px', border: '1px solid #333', minHeight: '500px' }}>
                {selectedDoc ? (
                    <div>
                        <h2 style={{ color: '#646cff', borderBottom: '1px solid #333', paddingBottom: '10px', marginTop: 0 }}>
                            {selectedDoc.filename} <span style={{ fontSize: '14px', color: '#28a745', fontWeight: 'normal' }}>(Активна сесія)</span>
                        </h2>
                        <div style={{ lineHeight: '1.8', fontSize: '18px', color: '#ccc', textAlign: 'justify', whiteSpace: 'pre-wrap' }}>
                            {renderInteractiveText(selectedDoc.content)}
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', color: '#666', marginTop: '100px' }}>
                        <p style={{ fontSize: '50px', margin: '0 0 20px 0' }}>📖</p>
                        <p style={{ fontSize: '18px' }}>Завантажте новий мануал для початку безпечної сесії читання</p>
                    </div>
                )}
            </div>
        </div>
    );
}