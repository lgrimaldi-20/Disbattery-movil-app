
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FormularioCompleto from './FormularioCompleto';

export default function Dashboard({ user, onLogout, darkMode }: { user: string; onLogout: () => void; darkMode: boolean }) {
  return (
    <View style={[styles.container, darkMode && { backgroundColor: '#181a20' }]}> 
      <Text style={[styles.header, darkMode && { color: '#2196f3' }]}>Disbattery</Text>
      <Text style={[styles.title, darkMode && { color: '#fff' }]}>Bienvenido, {user}</Text>
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
    borderRadius: 16,
    marginTop: 0,
    marginBottom: 0,
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
