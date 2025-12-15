import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import { saveData } from '../hooks/use-offline-storage';

export default function FormularioDatos() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [guardado, setGuardado] = useState(false);

  const handleGuardar = async () => {
    await saveData('usuario', { nombre, email });
    setGuardado(true);
  };

  return (
    <View style={styles.container}>
      <Text>Nombre:</Text>
      <TextInput
        style={styles.input}
        value={nombre}
        onChangeText={setNombre}
        placeholder="Ingresa tu nombre"
      />
      <Text>Email:</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Ingresa tu email"
        keyboardType="email-address"
      />
      <Button title="Guardar" onPress={handleGuardar} />
      {guardado && <Text>¡Datos guardados localmente!</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginBottom: 12,
    borderRadius: 4,
  },
});
