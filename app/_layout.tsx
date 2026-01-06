
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import Dashboard from '../components/Dashboard';
import LoginPage from '../components/LoginPage';

export default function RootLayout() {
  const [showHeader, setShowHeader] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && 'serviceWorker' in navigator && !__DEV__) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js');
      });
    }
    // Detectar si estamos en login o dashboard
    const observer = new MutationObserver(() => {
      const login = document.querySelector('input[type="password"]');
      setShowHeader(!login); // Si hay input password, estamos en login
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ background: darkMode ? '#181a20' : '#f8f9fa', minHeight: '100vh', width: '100vw', overflowY: 'auto' }}>
      <div style={{ width: '100%', background: darkMode ? '#23242a' : '#fff', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '0 2vw', height: 56, gap: 6 }}>
        {showHeader && (
          <>
            <button
              style={{ background: darkMode ? '#222' : '#eee', color: darkMode ? '#fff' : '#222', border: 'none', borderRadius: 14, padding: '5px 12px', fontWeight: 'bold', fontSize: 13, cursor: 'pointer', marginRight: 4, display: 'flex', alignItems: 'center' }}
              onClick={() => setDarkMode((prev) => !prev)}
            >
              <span style={{ marginRight: 4 }}>{darkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
              <span style={{ fontSize: 15 }}>{darkMode ? '☀️' : '🌙'}</span>
            </button>
            <button
              style={{ background: '#f44336', color: '#fff', border: 'none', borderRadius: 14, padding: '5px 12px', fontWeight: 'bold', fontSize: 13, cursor: 'pointer' }}
              onClick={() => setUser(null)}
            >
              CERRAR SESIÓN
            </button>
          </>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: 'calc(100vh - 56px)', width: '100%', padding: '2vw' }}>
        {user ? (
          <div style={{ width: '100%', maxWidth: 900 }}>
            <Dashboard user={user} onLogout={() => setUser(null)} darkMode={darkMode} />
          </div>
        ) : (
          <div style={{ marginTop: 32, width: '100%', maxWidth: 400 }}>
            <LoginPage onLogin={setUser} />
          </div>
        )}
      </div>
    </div>
  );
}
