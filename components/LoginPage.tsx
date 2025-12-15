import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from '../firebaseConfig';

export default function LoginPage({ onLogin }: { onLogin: (user: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Usuario y contraseña requeridos');
      return;
    }
    setError('');
    try {
      const auth = getAuth(app);
      const userCredential = await signInWithEmailAndPassword(auth, username, password);
      onLogin(userCredential.user.email || '');
    } catch (e: any) {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
        setError('Usuario o contraseña incorrectos');
      } else if (e.code === 'auth/invalid-email') {
        setError('Correo inválido');
      } else {
        setError('Error de autenticación: ' + (e.message || e.code));
      }
    }
  };

  return (
    <View style={styles.background}>
      <View style={styles.card}>
        <Text style={styles.appTitle}>Disbattery Mercaderista</Text>
        <Text style={styles.subtitle}>por favor inicie sesión para continuar</Text>

        <Text style={styles.label}>Usuario</Text>
        <TextInput
          style={styles.input}
          placeholder="Ingrese su correo"
          value={username}
          onChangeText={setUsername}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#A0A0A0"
        />

        <Text style={styles.label}>Contraseña</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, { marginBottom: 0, flex: 1 }]}
            placeholder="Ingrese su contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholderTextColor="#A0A0A0"
          />
          <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
            <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
        </TouchableOpacity>

        <Text style={styles.forgotPassword}>¿Olvidó su contraseña?</Text>
        <Text style={styles.version}>Version: 1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: 340,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0A2A4D',
    textAlign: 'center',
    marginBottom: 4,
    marginTop: 0,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7A90',
    textAlign: 'center',
    marginBottom: 28,
  },
  label: {
    fontSize: 15,
    color: '#1A1A1A',
    marginBottom: 4,
    marginTop: 12,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 16,
    backgroundColor: '#F7F8FA',
    color: '#222',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F7F8FA',
    marginBottom: 16,
    paddingRight: 10,
  },
  eyeIcon: {
    fontSize: 18,
    color: '#A0A0A0',
    marginLeft: 4,
    marginRight: 4,
  },
  loginButton: {
    backgroundColor: '#002F5F',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  forgotPassword: {
    color: '#6B7A90',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 2,
  },
  version: {
    color: '#222',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '400',
  },
  error: {
    color: 'red',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
    marginTop: -8,
  },
});
