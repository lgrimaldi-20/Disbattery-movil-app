// Este hook permite guardar y leer datos offline usando AsyncStorage (móvil) y IndexedDB (web)
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let idb: typeof import('idb-keyval') | undefined;
if (Platform.OS === 'web') {
  idb = require('idb-keyval');
}

export async function saveData(key: string, value: any) {
  if (Platform.OS === 'web' && idb) {
    return idb.set(key, value);
  } else {
    return AsyncStorage.setItem(key, JSON.stringify(value));
  }
}

export async function getData(key: string) {
  if (Platform.OS === 'web' && idb) {
    return idb.get(key);
  } else {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }
}

export async function removeData(key: string) {
  if (Platform.OS === 'web' && idb) {
    return idb.del(key);
  } else {
    return AsyncStorage.removeItem(key);
  }
}
