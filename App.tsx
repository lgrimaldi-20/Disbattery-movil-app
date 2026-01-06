import React, { useState } from 'react';
import { SafeAreaView } from 'react-native';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';

// Registrar el service worker para PWA (solo en producción y navegador)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

export default function App() {
  const [user, setUser] = useState<string | null>(null);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {user ? (
        <Dashboard user={user} onLogout={() => setUser(null)} />
      ) : (
        <LoginPage onLogin={setUser} />
      )}
    </SafeAreaView>
  );
}
