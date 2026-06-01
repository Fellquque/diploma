import { useState, useEffect } from 'react';
import api from './api';

export default function Admin() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedUser, setSelectedUser] = useState(null); 
    const [userCards, setUserCards] = useState([]);
    const [editingCard, setEditingCard] = useState(null);

    const fetchStats = async () => {
        try {
            const response = await api.get('/admin/stats');
            setUsers(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Помилка завантаження статистики", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const handleDeleteUser = async (userId, userName) => {
        if (window.confirm(`⚠️ Видалити співробітника ${userName} та всі його дані?`)) {
            try {
                await api.delete(`/admin/users/${userId}`);
                setUsers(users.filter(u => u.id !== userId));
                if (selectedUser?.id === userId) setSelectedUser(null);
            } catch (error) { alert("Помилка видалення"); }
        }
    };

    const handleChangePassword = async (userId, userName) => {
        const newPassword = window.prompt(`Новий пароль для ${userName}:`);
        if (newPassword) {
            try {
                await api.put(`/admin/users/${userId}/password`, { new_password: newPassword });
                alert("Пароль змінено");
            } catch (error) { alert("Помилка"); }
        }
    };

    const viewUserCards = async (user) => {
        try {
            const response = await api.get(`/flashcards/all/${user.id}`);
            setUserCards(response.data);
            setSelectedUser(user);
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        } catch (error) { alert("Не вдалося завантажити картки"); }
    };

    const handleDeleteCard = async (cardId) => {
        if (window.confirm("Видалити цю картку?")) {
            try {
                await api.delete(`/flashcards/${cardId}`);
                setUserCards(userCards.filter(c => c.id !== cardId));
                fetchStats();
            } catch (error) { alert("Помилка"); }
        }
    };

    const handleEditSave = async () => {
        try {
            await api.put(`/flashcards/${editingCard.id}`, {
                user_id: selectedUser.id,
                word_en: editingCard.word_en,
                translation_uk: editingCard.translation_uk,
                transcription: editingCard.transcription,
                context_sentence: editingCard.context_sentence
            });
            setUserCards(userCards.map(c => c.id === editingCard.id ? editingCard : c));
            setEditingCard(null);
        } catch (error) { alert("Помилка збереження"); }
    };

    if (loading) return <p>Завантаження...</p>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {/* Таблиця користувачів */}
            <div style={{ background: '#222', padding: '20px', borderRadius: '10px' }}>
                <h2 style={{ color: '#ffc107', marginTop: 0 }}>🛡️ Панель Управління Персоналом</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#333', textAlign: 'left' }}>
                            <th style={{ padding: '12px', borderBottom: '2px solid #555' }}>Співробітник</th>
                            <th style={{ padding: '12px', borderBottom: '2px solid #555' }}>Відділ</th>
                            <th style={{ padding: '12px', borderBottom: '2px solid #555' }}>Слів</th>
                            <th style={{ padding: '12px', borderBottom: '2px solid #555', textAlign: 'center' }}>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid #444', background: selectedUser?.id === u.id ? '#2a2a2a' : 'transparent' }}>
                                <td style={{ padding: '12px' }}>{u.name} <br/><small style={{color: '#888'}}>{u.email}</small></td>
                                <td style={{ padding: '12px' }}>{u.department}</td>
                                <td style={{ padding: '12px' }}>
                                    {u.role !== 'admin' ? (
                                        <button 
                                            onClick={() => viewUserCards(u)}
                                            style={{ background: '#646cff', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                                        >
                                            {u.cards} (Перегляд)
                                        </button>
                                    ) : (
                                        <span style={{ color: '#666' }}>—</span>
                                    )}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                    {u.role !== 'admin' ? (
                                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                            <button onClick={() => handleChangePassword(u.id, u.name)} style={{ padding: '5px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }} title="Змінити пароль">🔑</button>
                                            <button onClick={() => handleDeleteUser(u.id, u.name)} style={{ padding: '5px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }} title="Видалити користувача">🗑️</button>
                                        </div>
                                    ) : (
                                        <span style={{ color: '#dc3545', fontSize: '13px', fontWeight: 'bold' }}>Адміністратор</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Перегляд карток користувача */}
            {selectedUser && (
                <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '10px', border: '1px solid #646cff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0 }}>📚 Словник користувача: <span style={{color: '#646cff'}}>{selectedUser.name}</span></h3>
                        <button onClick={() => setSelectedUser(null)} style={{ background: 'transparent', color: '#888', border: '1px solid #444', cursor: 'pointer' }}>Закрити</button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '15px' }}>
                        {userCards.map(card => {
                            const isEditing = editingCard?.id === card.id;
                            return (
                                <div key={card.id} style={{ border: '1px solid #333', padding: '15px', borderRadius: '8px', background: '#222' }}>
                                    {isEditing ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <label style={{fontSize: '11px', color: '#888'}}>Термін:</label>
                                            <input value={editingCard.word_en} onChange={e => setEditingCard({...editingCard, word_en: e.target.value})} style={{background:'#111', color:'#fff', padding:'8px', border: '1px solid #444'}} />
                                            
                                            <label style={{fontSize: '11px', color: '#888'}}>Переклад:</label>
                                            <input value={editingCard.translation_uk} onChange={e => setEditingCard({...editingCard, translation_uk: e.target.value})} style={{background:'#111', color:'#fff', padding:'8px', border: '1px solid #444'}} />
                                            
                                            <label style={{fontSize: '11px', color: '#888'}}>Вимова:</label>
                                            <input value={editingCard.transcription} onChange={e => setEditingCard({...editingCard, transcription: e.target.value})} style={{background:'#111', color:'#fff', padding:'8px', border: '1px solid #444'}} />
                                            
                                            <label style={{fontSize: '11px', color: '#888'}}>Контекст:</label>
                                            <textarea 
                                                value={editingCard.context_sentence} 
                                                onChange={e => setEditingCard({...editingCard, context_sentence: e.target.value})} 
                                                style={{background:'#111', color:'#fff', padding:'8px', border: '1px solid #444', minHeight: '80px', fontFamily: 'inherit'}} 
                                            />
                                            
                                            <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                                                <button onClick={handleEditSave} style={{flex:1, background:'#28a745', color:'#fff', border:'none', padding:'8px', borderRadius:'4px', cursor: 'pointer'}}>Зберегти</button>
                                                <button onClick={() => setEditingCard(null)} style={{flex:1, background:'#555', color:'#fff', border:'none', padding:'8px', borderRadius:'4px', cursor: 'pointer'}}>Скасувати</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <h4 style={{ margin: 0, color: '#646cff' }}>{card.word_en}</h4>
                                                <div>
                                                    <button onClick={() => setEditingCard({...card})} style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginRight: '5px' }}>✏️</button>
                                                    <button onClick={() => handleDeleteCard(card.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>🗑️</button>
                                                </div>
                                            </div>
                                            <p style={{ margin: '10px 0 5px 0', fontSize: '14px' }}><strong>{card.translation_uk}</strong> <em>[{card.transcription}]</em></p>
                                            <p style={{ fontSize: '12px', color: '#aaa', fontStyle: 'italic', borderLeft: '2px solid #646cff', paddingLeft: '8px' }}>{card.context_sentence}</p>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}