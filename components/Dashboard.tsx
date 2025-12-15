import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import FormularioCompleto from './FormularioCompleto';

export default function Dashboard({ user, onLogout }: { user: string; onLogout: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Disbattery</Text>
      <Text style={styles.title}>Bienvenido, {user}</Text>
      <View style={styles.logoutWrapper}>
        <Button title="Cerrar sesión" onPress={onLogout} color="#FF3B30" />
      </View>
      <FormularioCompleto />
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
