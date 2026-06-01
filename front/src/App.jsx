import { useState, useEffect } from 'react';
import Login from './Login';
import Dictionary from './Dictionary';
import Review from './Review';
import Documents from './Documents';
import Admin from './Admin';

function App() {
    const [userId, setUserId] = useState(localStorage.getItem('userId') || null);
    const [userName, setUserName] = useState(localStorage.getItem('userName') || '');
    const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || 'user'); 
    const [activeTab, setActiveTab] = useState(localStorage.getItem('userRole') === 'admin' ? 'admin' : 'dictionary');

    const handleLogout = () => {
        setUserId(null);
        setUserName('');
        setUserRole('user');
        localStorage.clear();
        setActiveTab('dictionary');
    };

    if (!userId) {
        return <Login onLoginSuccess={(id, name, role) => {
            setUserId(id);
            setUserName(name);
            setUserRole(role);
            localStorage.setItem('userId', id);
            localStorage.setItem('userName', name);
            localStorage.setItem('userRole', role);
            setActiveTab(role === 'admin' ? 'admin' : 'dictionary');
        }} />;
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto', color: '#eee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #444', paddingBottom: '10px' }}>
                <h1>Технічний довідник ХТМ {userRole === 'admin' && <span style={{fontSize: '16px', color: '#dc3545', marginLeft: '10px'}}>(Панель Управління)</span>}</h1>
                <div>
                    <span style={{ marginRight: '15px' }}>{userRole === 'admin' ? 'Керівник:' : 'Співробітник:'} <strong>{userName}</strong></span>
                    <button onClick={handleLogout} style={{ padding: '5px 10px', cursor: 'pointer', background: '#444', color: '#fff', border: 'none', borderRadius: '4px' }}>Вийти</button>
                </div>
            </div>

            {/* Меню користувача */}
            {userRole === 'user' && (
                <div style={{ margin: '20px 0', display: 'flex', gap: '10px' }}>
                    <button onClick={() => setActiveTab('dictionary')} style={{ padding: '10px 20px', cursor: 'pointer', background: activeTab === 'dictionary' ? '#646cff' : '#333', color: '#fff', border: 'none', borderRadius: '4px' }}>📔 Словник</button>
                    <button onClick={() => setActiveTab('review')} style={{ padding: '10px 20px', cursor: 'pointer', background: activeTab === 'review' ? '#646cff' : '#333', color: '#fff', border: 'none', borderRadius: '4px' }}>🧠 Тестування</button>
                    <button onClick={() => setActiveTab('documents')} style={{ padding: '10px 20px', cursor: 'pointer', background: activeTab === 'documents' ? '#646cff' : '#333', color: '#fff', border: 'none', borderRadius: '4px' }}>📄 Документація</button>
                </div>
            )}

            {/* Меню адміністратора */}
            {userRole === 'admin' && (
                 <div style={{ margin: '20px 0', display: 'flex' }}>
                     <button style={{ padding: '10px 20px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'default' }}>
                         🛡️ Адмін-панель
                     </button>
                 </div>
            )}

            {/* Основний контент */}
            {userRole === 'user' ? (
                <>
                    <div style={{ display: activeTab === 'dictionary' ? 'block' : 'none' }}>
                        <Dictionary userId={userId} activeTab={activeTab} />
                    </div>
                    <div style={{ display: activeTab === 'review' ? 'block' : 'none' }}>
                        <Review userId={userId} />
                    </div>
                    <div style={{ display: activeTab === 'documents' ? 'block' : 'none' }}>
                        <Documents userId={userId} />
                    </div>
                </>
            ) : (
                <div style={{ display: 'block' }}>
                    <Admin />
                </div>
            )}
        </div>
    );
}

export default App;