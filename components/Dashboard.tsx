
import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity } from 'react-native';
import FormularioCompleto from './FormularioCompleto';

export default function Dashboard({ user, onLogout }: { user: string; onLogout: () => void }) {
  const [darkMode, setDarkMode] = useState(false);
  return (
    <View style={[styles.container, darkMode && { backgroundColor: '#181a20' }]}> 
      {/* Botón global dark mode */}
      <View style={{ alignItems: 'flex-end', marginBottom: 8 }}>
        <TouchableOpacity
          onPress={() => setDarkMode((prev) => !prev)}
          style={{
            backgroundColor: darkMode ? '#222' : '#eee',
            borderRadius: 20,
            paddingVertical: 6,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: darkMode ? '#444' : '#ccc',
          }}
        >
          <Text style={{ color: darkMode ? '#fff' : '#222', fontWeight: 'bold', marginRight: 6 }}>
            {darkMode ? 'Modo Claro' : 'Modo Oscuro'}
          </Text>
          <Text style={{ fontSize: 18 }}>{darkMode ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.header, darkMode && { color: '#2196f3' }]}>Disbattery</Text>
      <Text style={[styles.title, darkMode && { color: '#fff' }]}>Bienvenido, {user}</Text>
      <View style={styles.logoutWrapper}>
        <TouchableOpacity
          onPress={onLogout}
          style={{ backgroundColor: '#f44336', borderRadius: 6, paddingHorizontal: 18, paddingVertical: 8 }}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>CERRAR SESIÓN</Text>
        </TouchableOpacity>
      </View>
      <FormularioCompleto darkMode={darkMode} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    maxWidth: 700,
    minWidth: 320,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#007AFF',
    letterSpacing: 1,
  },
  title: {
    fontSize: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  logoutWrapper: {
    alignSelf: 'center',
    marginBottom: 16,
    minWidth: 120,
    maxWidth: 150,
  },
});
