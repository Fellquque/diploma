import { useState } from 'react';
import api from './api';

export default function Login({ onLoginSuccess }) {
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [department, setDepartment] = useState('Ремонтна бригада');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        try {
            if (isRegistering) {
                // Логіка реєстрації (UC1)
                await api.post('/users/', { 
                    email, 
                    password, 
                    full_name: fullName, 
                    department 
                });
                alert("Реєстрація успішна! Тепер увійдіть.");
                setIsRegistering(false); // Перемикаємо на форму входу
            } else {
                // Логіка входу
                const response = await api.post('/login', { email, password });
                // Передаємо id, ім'я та РОЛЬ в головний App
                onLoginSuccess(response.data.user_id, response.data.full_name, response.data.role);
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Помилка з\'єднання з сервером');
        }
    };

    return (
        <div style={{ maxWidth: '350px', margin: '50px auto', fontFamily: 'sans-serif', background: '#222', padding: '30px', borderRadius: '10px', color: '#eee' }}>
            <h2 style={{ textAlign: 'center', color: '#646cff' }}>
                {isRegistering ? "Реєстрація" : "Вхід у систему КП «ХТМ»"}
            </h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                {isRegistering && (
                    <>
                        <input type="text" placeholder="ПІБ (напр. Іванов І.І.)" value={fullName} onChange={(e) => setFullName(e.target.value)} required style={{ padding: '10px', borderRadius: '5px', border: '1px solid #444', background: '#111', color: '#fff' }} />
                        <input type="text" placeholder="Відділ" value={department} onChange={(e) => setDepartment(e.target.value)} required style={{ padding: '10px', borderRadius: '5px', border: '1px solid #444', background: '#111', color: '#fff' }} />
                    </>
                )}

                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '10px', borderRadius: '5px', border: '1px solid #444', background: '#111', color: '#fff' }} />
                <input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '10px', borderRadius: '5px', border: '1px solid #444', background: '#111', color: '#fff' }} />
                
                {error && <p style={{ color: '#ff4d4f', fontSize: '14px', margin: '0', textAlign: 'center' }}>{error}</p>}
                
                <button type="submit" style={{ padding: '12px', backgroundColor: '#646cff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
                    {isRegistering ? "Створити акаунт" : "Увійти"}
                </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', cursor: 'pointer', color: '#888' }} onClick={() => setIsRegistering(!isRegistering)}>
                {isRegistering ? "Вже є акаунт? Увійти" : "Немає акаунту? Зареєструватися"}
            </p>
        </div>
    );
}