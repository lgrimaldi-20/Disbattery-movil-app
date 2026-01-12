// Escuchar en tiempo real los clientes asignados desde la colección 'asignacionesRuta' (admin)
const escucharClientesAsignados = (userEmail: string, userName: string, setMiRuta: any) => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayKey = `${yyyy}-${mm}-${dd}`;
  return onSnapshot(collection(db, 'asignacionesRuta'), async (asignacionesSnap) => {
    let asignadosHoy: string[] = [];
    asignacionesSnap.forEach(docSnap => {
      const data = docSnap.data();
      if (
        (data.usuario === userEmail || data.usuario === userName) &&
        data.fecha === todayKey &&
        Array.isArray(data.clientes)
      ) {
        asignadosHoy = data.clientes as string[];
      }
    });
    if (asignadosHoy && asignadosHoy.length > 0) {
      const clientesSnap = await getDocs(collection(db, 'clientes'));
      const clientesAsignados: any[] = [];
      clientesSnap.forEach(docSnap => {
        if (asignadosHoy.includes(docSnap.id)) {
          clientesAsignados.push({ id: docSnap.id, ...docSnap.data() });
        }
      });
      setMiRuta((prev: any[]) => {
        const yaEstan = prev.filter(c => (c.fecha ? c.fecha.substring(0,10) : todayKey) === todayKey).map(c => c.id);
        const nuevos = clientesAsignados.filter((c: any) => !yaEstan.includes(c.id)).map((c: any) => ({
          id: c.id,
          nombre: c.nombre,
          direccion: c.direccion,
          tipo: c.tipo,
          status: 'pending',
          fecha: todayKey,
        }));
        return [...prev, ...nuevos];
      });
    }
  });
};
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Button,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, setDoc, doc, onSnapshot } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

import { saveData, getData } from '../hooks/use-offline-storage';

// Types

interface VisitPoint {
  id: string;
  clientName: string;
  location: string;
  estimatedTime: number;
  status: 'pending' | 'in-progress' | 'completed' | string;
  fecha?: string;
  rif?: string;
  tipo?: string;
  direccion?: string;
  nombre?: string;
}


interface Ruta {
  id: string;
  nombre: string;
  fecha?: string;
  status?: string;
  puntos?: any[];
  clientName?: string;
}

interface Cliente {
  id: string;
  nombre: string;
  rif: string;
  direccion: string;
  tipo: string;
}


export default function FormularioCompleto({ darkMode = false }: { darkMode?: boolean }) {
  // 1. TODOS LOS STATES AL PRINCIPIO
  const [userName, setUserName] = useState('');
  const [groupName] = useState('GRUPO VICTORIA');
  const [zoneName] = useState('Occidente');
  const [activeTab, setActiveTab] = useState('ruta');
  const [miRuta, setMiRuta] = useState<Ruta[]>([]);
  const [puntosVisita, setPuntosVisita] = useState<VisitPoint[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [historialRutas, setHistorialRutas] = useState<Ruta[]>([]);
  const [prospectos, setProspectos] = useState<Cliente[]>([]);
  const [clientesFirebase, setClientesFirebase] = useState<Cliente[]>([]);
  // States de búsqueda
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [paginaClientes, setPaginaClientes] = useState(1);

  // 2. LÓGICA DERIVADA (FILTRADO Y PAGINACIÓN)
  const clientesPorPagina = 20;
  const clientesFiltrados = busquedaCliente.trim().length > 0
    ? (clientesFirebase || []).filter((cliente: any) =>
        (cliente.nombre || '').toLowerCase().includes(busquedaCliente.toLowerCase())
      )
    : (clientesFirebase || []);
  const totalPaginas = Math.ceil(clientesFiltrados.length / clientesPorPagina);
  const clientesPaginados = clientesFiltrados.slice(
    (paginaClientes - 1) * clientesPorPagina,
    paginaClientes * clientesPorPagina
  );

  // 3. EFECTOS Y FUNCIONES
  useEffect(() => { setPaginaClientes(1); }, [busquedaCliente]);

  // Sincronizar historial de rutas con puntosVisita y fecha actual y guardar en Firestore
  const syncAndSaveHistorial = async () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayKey = `${yyyy}-${mm}-${dd}`;

    const todosClientes = [
      ...miRuta.filter(p => (p.fecha ? p.fecha.substring(0,10) : todayKey) === todayKey),
      ...puntosVisita.filter(p => (p.fecha ? p.fecha.substring(0,10) : todayKey) === todayKey && !miRuta.some(m => m.id === p.id))
    ];
    const completadas = todosClientes.filter(p => p.status === 'completed' || p.status === 'completada');
    const totalHoy = todosClientes.length;
    const diaCompletada = totalHoy > 0 && completadas.length === totalHoy;

    // Actualizar historial y estado visual inmediato
    let nuevoHistorial = historialRutas ? [...historialRutas] : [];
    const idxHoy = nuevoHistorial.findIndex(r => r.id === todayKey);
    let statusHoy = 'pendiente';
    if (totalHoy > 0) {
      if (completadas.length === totalHoy) {
        statusHoy = 'completada'; // SIEMPRE femenino, minúsculas, sin acento
      } else if (completadas.length > 0) {
        statusHoy = 'en-progreso';
      }
      // Guardar/actualizar el historial del día en Firestore
      try {
        await setDoc(doc(db, 'historialRutas', todayKey), {
          id: todayKey,
          fecha: todayKey,
          status: statusHoy,
          puntos: todosClientes,
        });
      } catch (e) {
        console.error('Error guardando historial en Firestore', e);
      }
      // Actualizar el estado local
      if (idxHoy >= 0) {
        nuevoHistorial[idxHoy] = { id: todayKey, nombre: 'Ruta ' + todayKey, fecha: todayKey, status: statusHoy, puntos: todosClientes };
      } else {
        nuevoHistorial.push({ id: todayKey, nombre: 'Ruta ' + todayKey, fecha: todayKey, status: statusHoy, puntos: todosClientes });
      }
      setHistorialRutas([...nuevoHistorial]);
    } else if (idxHoy >= 0) {
      // Si ya no hay visitas hoy, eliminar el registro del día
      nuevoHistorial.splice(idxHoy, 1);
      setHistorialRutas([...nuevoHistorial]);
      try {
        await setDoc(doc(db, 'historialRutas', todayKey), {});
      } catch (e) {
        console.error('Error eliminando historial en Firestore', e);
      }
    }
    // Recargar historial desde Firestore para mantener sincronía visual
    cargarHistorialRutas();
  };

  useEffect(() => {
    syncAndSaveHistorial();
    if (activeTab === 'historial') {
      cargarHistorialRutas();
    }
  }, [miRuta, puntosVisita, activeTab]);

  const [nuevoProspecto, setNuevoProspecto] = useState({
    nombre: '',
    direccion: '',
    rif: '',
    tipo: '',
  });

  const [loadingProspecto, setLoadingProspecto] = useState(false);

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [rif, setRif] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [firebaseRegistros, setFirebaseRegistros] = useState<any[]>([]);
  const [errores, setErrores] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showProspectoModal, setShowProspectoModal] = useState(false);
  const [showProspectoForm, setShowProspectoForm] = useState(false);
  const [foto, setFoto] = useState<string | null>(null);
  const [nombreNegocio, setNombreNegocio] = useState('');
  const [direccionNegocio, setDireccionNegocio] = useState('');
  const [telefonoNegocio, setTelefonoNegocio] = useState('');
  const [tipoNegocio, setTipoNegocio] = useState('');
  const [comentarios, setComentarios] = useState('');

  // ----- CARGADORES -----

  const cargarMiRuta = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'miRuta'));
      const rutas: any[] = [];
      querySnapshot.forEach((doc) => rutas.push({ id: doc.id, ...doc.data() }));
      setMiRuta(rutas);
    } catch {}
  };

  const cargarPuntosVisita = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'puntosVisita'));
      const puntos: any[] = [];
      querySnapshot.forEach((doc) => puntos.push({ id: doc.id, ...doc.data() }));
      setPuntosVisita(puntos);
    } catch {}
  };

  const cargarHistorialRutas = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'historialRutas'));
      const historial: any[] = [];
      querySnapshot.forEach((doc) => historial.push({ id: doc.id, ...doc.data() }));
      setHistorialRutas(historial);
    } catch {}
  };

  const cargarProspectos = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'prospectos'));
      const lista: any[] = [];
      querySnapshot.forEach((doc) => lista.push({ id: doc.id, ...doc.data() }));
      setProspectos(lista);
    } catch {}
  };

  const cargarClientesFirebase = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'clientes'));
      const clientes: any[] = [];
      querySnapshot.forEach((doc) => {
        console.log('Cliente Firestore:', doc.id, doc.data());
        clientes.push({ id: doc.id, ...doc.data() });
      });
      setClientesFirebase(clientes);
      if (clientes.length === 0) {
        setErrores((prev) => [...prev, 'No se encontraron clientes en Firestore.']);
      }
    } catch (e: any) {
      setClientesFirebase([]);
      setErrores((prev) => [...prev, 'Error al cargar clientes: ' + (e && e.message ? e.message : String(e))]);
      console.error('Error al cargar clientes:', e);
    }
  };

  // ----- EFECTOS DE CARGA -----
  useEffect(() => {
    if (activeTab === 'ruta') cargarMiRuta();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'puntos' || activeTab === 'cliente') cargarPuntosVisita();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'historial') cargarHistorialRutas();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'prospecto') {
      cargarProspectos();
    }
    if (activeTab === 'clientes' || activeTab === 'prospecto') {
      cargarClientesFirebase();
    }
  }, [activeTab]);

  useEffect(() => {
    const auth = getAuth();
    let unsubscribeAsignaciones: (() => void) | null = null;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const email = user.email || '';
        const displayName = user.displayName || email || 'Usuario';
        setUserName(displayName);
        // Escuchar clientes asignados desde admin en tiempo real
        if (unsubscribeAsignaciones) unsubscribeAsignaciones();
        unsubscribeAsignaciones = escucharClientesAsignados(email, displayName, setMiRuta);
      } else {
        setUserName('');
        if (unsubscribeAsignaciones) unsubscribeAsignaciones();
      }
    });
    return () => {
      unsubscribe();
      if (unsubscribeAsignaciones) unsubscribeAsignaciones();
    };
  }, []);

  // ----- FUNCIONES -----

  // Al seleccionar un cliente, lo agrega a la ruta (puntosVisita) si no está ya
  const seleccionarCliente = (cliente: any) => {
    setClienteSeleccionado(cliente);
    // Evitar duplicados en puntosVisita
    setPuntosVisita((prev) => {
      if (prev.some((c) => c.id === cliente.id)) return prev;
      // Adaptar a estructura VisitPoint
      const nuevoPunto = {
        id: cliente.id,
        clientName: cliente.nombre,
        nombre: cliente.nombre,
        direccion: cliente.direccion,
        tipo: cliente.tipo,
        status: 'pending',
        location: cliente.direccion,
        estimatedTime: 30,
        fecha: new Date().toISOString(),
      };
      return [...prev, nuevoPunto];
    });
    // Evitar duplicados en miRuta
    setMiRuta((prev) => {
      if (prev.some((c) => c.id === cliente.id && (c.fecha ? c.fecha.substring(0,10) : '') === (new Date().toISOString().substring(0,10)))) return prev;
      const nuevoCliente = {
        id: cliente.id,
        nombre: cliente.nombre,
        direccion: cliente.direccion,
        tipo: cliente.tipo,
        status: 'pending',
        fecha: new Date().toISOString(),
      };
      return [...prev, nuevoCliente];
    });
    setActiveTab('ruta'); // Cambia a la pestaña de ruta automáticamente
  };

  const guardarNuevoProspecto = async () => {
    setLoadingProspecto(true);
    try {
      await addDoc(collection(db, 'prospectos'), nuevoProspecto);
      setNuevoProspecto({ nombre: '', direccion: '', rif: '', tipo: '' });
      cargarProspectos();
    } catch {}
    setLoadingProspecto(false);
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) return alert('Permiso de cámara denegado');

    const result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (!result.canceled && result.assets?.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  const pickImageFromGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert('Permiso de galería denegado');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.5 });
    if (!result.canceled && result.assets?.length > 0) {
      setFoto(result.assets[0].uri);
    }
  };

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return alert('Permiso de ubicación denegado');

    const location = await Location.getCurrentPositionAsync({});
    setCoords({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
  };

  const handleGuardar = async () => {
    const erroresTemp = [];

    if (!nombre.trim()) erroresTemp.push('El nombre es obligatorio');
    if (!email.trim()) erroresTemp.push('El email es obligatorio');
    else if (!/^\S+@\S+\.\S+$/.test(email)) erroresTemp.push('El email no es válido');

    if (!telefono.trim()) erroresTemp.push('El teléfono es obligatorio');

    if (!rif.trim()) erroresTemp.push('El RIF es obligatorio');

    if (erroresTemp.length > 0) {
      setErrores(erroresTemp);
      setShowModal(true);
      return;
    }

    setLoading(true);

    await saveData('registro', { nombre, email, telefono, direccion, rif, image, coords });

    try {
      await addDoc(collection(db, 'registros'), {
        nombre,
        email,
        telefono,
        direccion,
        rif,
        image,
        coords,
        fecha: new Date().toISOString(),
      });
    } catch (error: any) {
      setErrores(['Error al guardar en Firebase: ' + error.message]);
      setShowModal(true);
    }

    setLoading(false);
    setSuccess(true);

    setNombre('');
    setEmail('');
    setTelefono('');
    setDireccion('');
    setRif('');
    setImage(null);
    setCoords(null);

    setTimeout(() => setSuccess(false), 2000);
  };

  // Métricas calculadas
  const [metrics, setMetrics] = useState({
    visitasHoy: 0,
    visitasSemana: 0,
    visitasMes: 0,
    clientesUnicos: 0,
    promedioDiario: 0,
    rutasCompletadas: 0,
  });

  useEffect(() => {
    // Calcular visitas usando Mi Ruta (si existe), si no, puntosVisita
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayKey = `${yyyy}-${mm}-${dd}`;

    const getFecha = (item: { fecha?: string }) => item.fecha ? item.fecha.substring(0,10) : todayKey;
    const getFechaObj = (item: { fecha?: string }) => item.fecha ? new Date(item.fecha) : today;
    // Usar miRuta como fuente principal para métricas
    const fuente = miRuta && miRuta.length > 0 ? miRuta : puntosVisita;

    // Visitas hoy: si no hay fecha, se asume hoy
    const visitasHoy = fuente.filter(p => getFecha(p) === todayKey).length;

    // Visitas semana: si no hay fecha, se asume hoy
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const visitasSemana = fuente.filter(p => {
      const fechaP = getFechaObj(p);
      return fechaP >= startOfWeek && fechaP <= today;
    }).length;

    // Visitas mes: si no hay fecha, se asume hoy
    const visitasMes = fuente.filter(p => {
      const fechaP = getFechaObj(p);
      return fechaP.getMonth() === today.getMonth() && fechaP.getFullYear() === today.getFullYear();
    }).length;

    // Clientes únicos: usar los clientes de Mi Ruta si existen, si no, usar puntosVisita
    let clientesUnicos = 0;
    if (miRuta && miRuta.length > 0) {
      clientesUnicos = new Set(miRuta.map(r => r.nombre || r.clientName)).size;
    } else {
      clientesUnicos = new Set(puntosVisita.map(p => p.clientName)).size;
    }

    // Promedio diario (simple)
    const totalDias = puntosVisita.length > 0 ? Math.max(1, new Set(puntosVisita.map(p => p.fecha && p.fecha.substring(0,10))).size) : 1;
    const promedioDiario = puntosVisita.length / totalDias;

    // Rutas completadas: contar días en historialRutas con status 'completada'
      const rutasCompletadas = historialRutas.filter((r: any) => r.status === 'completada' || r.status === 'completed').length;

    setMetrics({
      visitasHoy,
      visitasSemana,
      visitasMes,
      clientesUnicos,
      promedioDiario: Math.round(promedioDiario * 10) / 10,
      rutasCompletadas,
    });
  }, [puntosVisita, miRuta, clientesFirebase, historialRutas]);

  // Get formatted date
  const getFormattedDate = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    return today.toLocaleDateString('es-ES', options);
  };

  // ----- RENDER -----

  return (
    <ScrollView style={[styles.container, darkMode && { backgroundColor: '#181a20' }]}> 
      <View style={[styles.header, darkMode && { backgroundColor: '#23242a', borderColor: '#23242a' }]}> 
        <View style={styles.headerTop}>
          <View style={styles.userIconContainer}>
            <Text style={styles.userIcon}>👤</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, darkMode && { color: '#fff' }]}>¡Hola, {userName}!</Text>
            <Text style={[styles.headerDate, darkMode && { color: '#bbb' }]}>{getFormattedDate()}</Text>
          </View>
        </View>
        <View style={styles.headerBottom}>
          <View style={[styles.headerGroupInfo, darkMode && { backgroundColor: '#23242a', borderColor: '#333' }]}> 
            <Text style={styles.headerTrophy}>🏆</Text>
            <Text style={[styles.headerGroupName, darkMode && { color: '#fff', backgroundColor: '#23242a', borderColor: '#333' }]}>{groupName}</Text>
          </View>
          <View style={[styles.headerZoneInfo, darkMode && { backgroundColor: '#23242a', borderColor: '#333' }]}> 
            <Text style={styles.headerLocationIcon}>📍</Text>
            <Text style={[styles.headerZoneName, darkMode && { color: '#fff', backgroundColor: '#23242a', borderColor: '#333' }]}>{zoneName}</Text>
          </View>
        </View>
      </View>

      {/* Metrics Section */}
      <View style={[styles.metricsCard, darkMode && { backgroundColor: '#23242a', borderColor: '#333' }]}> 
        <View style={styles.metricsHeader}>
          <Text style={[styles.metricsIcon, darkMode && { color: '#fff' }]}>📊</Text>
          <Text style={[styles.metricsTitle, darkMode && { color: '#fff' }]}>Mis Métricas</Text>
        </View>
        <View style={styles.metricsGrid}>
          <View style={[styles.metricBox, styles.metricBlue, darkMode && { backgroundColor: '#1976d2' }]}> 
            <Text style={[styles.metricValue, darkMode && { color: '#fff' }]}>{metrics.visitasHoy}</Text>
            <Text style={[styles.metricLabel, darkMode && { color: '#fff' }]}>Visitas Hoy</Text>
          </View>
          <View style={[styles.metricBox, styles.metricPink, darkMode && { backgroundColor: '#e5396a' }]}> 
            <Text style={[styles.metricValue, darkMode && { color: '#fff' }]}>{metrics.visitasSemana}</Text>
            <Text style={[styles.metricLabel, darkMode && { color: '#fff' }]}>Esta Semana</Text>
          </View>
          <View style={[styles.metricBox, styles.metricGreen, darkMode && { backgroundColor: '#43a047' }]}> 
            <Text style={[styles.metricValue, darkMode && { color: '#fff' }]}>{metrics.visitasMes}</Text>
            <Text style={[styles.metricLabel, darkMode && { color: '#fff' }]}>Este Mes</Text>
          </View>
          <View style={[styles.metricBox, styles.metricOrange, darkMode && { backgroundColor: '#ff9800' }]}> 
            <Text style={[styles.metricValue, darkMode && { color: '#fff' }]}>{metrics.clientesUnicos}</Text>
            <Text style={[styles.metricLabel, darkMode && { color: '#fff' }]}>Clientes Únicos</Text>
          </View>
        </View>
        <View style={[styles.metricsPerformance, darkMode && { backgroundColor: '#23242a', borderColor: '#333' }] }>
          <View style={styles.performanceHeader}>
            <Text style={[styles.performanceIcon, darkMode && { color: '#fff' }]}>📈</Text>
            <Text style={[styles.performanceTitle, darkMode && { color: '#fff' }]}>Rendimiento</Text>
          </View>
          <View style={styles.performanceRow}>
            <Text style={[styles.performanceLabel, darkMode && { color: '#bbb' }]}>Promedio diario:</Text>
            <Text style={[styles.performanceValue, darkMode && { color: '#fff' }]}>{metrics.promedioDiario} visitas</Text>
          </View>
          <View style={styles.performanceRow}>
            <Text style={[styles.performanceLabel, darkMode && { color: '#bbb' }]}>Rutas completadas:</Text>
            <Text style={[styles.performanceValue, darkMode && { color: '#fff' }]}>{metrics.rutasCompletadas}</Text>
          </View>
        </View>
      </View>

      {/* Tabs Section */}
      <View style={[styles.tabsCard, darkMode && { backgroundColor: '#23242a', borderColor: '#333' }]}> 
        <View style={[styles.tabBar, darkMode && { backgroundColor: '#23242a' }]}> 
          {['ruta', 'clientes', 'historial'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={styles.tabIcon}>
                {tab === 'ruta' ? '🗺️' : tab === 'clientes' ? '👥' : '📅'}
              </Text>
              <Text style={activeTab === tab ? styles.tabTextActive : styles.tabText}>
                {tab === 'ruta' ? 'Mi Ruta' : tab === 'clientes' ? 'Selecciona Cliente' : 'Historial de Rutas'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.tabContent, darkMode && { backgroundColor: '#23242a' }]}> 
          {/* TAB MI RUTA */}
          {activeTab === 'ruta' && (
            <View>
              {/* Botón Nuevo Prospecto */}
              <TouchableOpacity style={styles.newProspectButton} onPress={() => setShowProspectoModal(true)}>
                <Text style={styles.newProspectIcon}>➕</Text>
                <Text style={styles.newProspectText}>Nuevo Prospecto</Text>
              </TouchableOpacity>

              {/* Estado de la Ruta */}
              {(() => {
                // Mostrar estado solo si hay clientes para hoy
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                const todayKey = `${yyyy}-${mm}-${dd}`;
                const clientesHoy = [
                  ...miRuta.filter(p => (p.fecha ? p.fecha.substring(0,10) : todayKey) === todayKey),
                  ...puntosVisita.filter(p => (p.fecha ? p.fecha.substring(0,10) : todayKey) === todayKey && !miRuta.some(m => m.id === p.id))
                ];
                if (clientesHoy.length > 0) {
                  return (
                    <View style={styles.routeStatusCard}>
                      <View style={styles.routeStatusHeader}>
                        <Text style={styles.routeStatusTitle}>Estado de mi ruta:</Text>
                        <View style={[styles.statusBadge, styles.statusInProgress]}>
                          <Text style={styles.statusBadgeText}>En Progreso</Text>
                        </View>
                      </View>
                      <Text style={styles.routeStatusSubtitle}>Ruta de {userName}</Text>
                      <Button
                        title="🏁 Finalizar mi ruta"
                        onPress={async () => {
                          // Obtener la fecha de hoy en formato YYYY-MM-DD
                          const today = new Date();
                          const yyyy = today.getFullYear();
                          const mm = String(today.getMonth() + 1).padStart(2, '0');
                          const dd = String(today.getDate()).padStart(2, '0');
                          const todayKey = `${yyyy}-${mm}-${dd}`;


                          // Guardar historial ANTES de limpiar los arrays
                          await syncAndSaveHistorial();

                          // Limpiar miRuta y puntosVisita solo para hoy
                          setMiRuta((prev) => prev.filter(p => (p.fecha ? p.fecha.substring(0,10) : todayKey) !== todayKey));
                          setPuntosVisita((prev) => prev.filter(p => (p.fecha ? p.fecha.substring(0,10) : todayKey) !== todayKey));

                          // Opcional: limpiar cliente seleccionado
                          setClienteSeleccionado(null);
                        }}
                      />
                    </View>
                  );
                } else {
                  return (
                    <Text style={{textAlign:'center',marginVertical:24,fontSize:16,color:'#888'}}>No hay rutas asignada para hoy.</Text>
                  );
                }
              })()}

              {/* Puntos de Visita */}
              <View style={styles.visitPointsSection}>
                <View style={styles.visitPointsHeader}>
                  <Text style={[styles.visitPointsIcon, darkMode && { color: '#bbb' }]}>👥</Text>
                  <Text style={[styles.visitPointsTitle, darkMode && { color: '#fff' }]}>{puntosVisita.length} clientes</Text>
                </View>
                {puntosVisita.length === 0 ? (
                  <Text style={[styles.emptyText, darkMode && { color: '#bbb' }]}>No hay puntos de visita asignados.</Text>
                ) : (
                  puntosVisita.map((punto: any) => (
                    <View key={punto.id} style={{ marginBottom: 24 }}>
                      <View style={[styles.detalleBox, { marginTop: 0, marginBottom: 0 }]}> 
                        <Text style={styles.detalleTitle}>Detalles del Cliente</Text>
                        <Text>
                          <Text style={{ fontWeight: 'bold' }}>{punto.nombre || punto.clientName || ''}</Text>{'  '}
                          <Text style={{ color: punto.status === 'completed' ? '#1976d2' : '#e63946', fontWeight: 'bold' }}>
                            {punto.status === 'completed' ? ' (Completada)' : ' (Pendiente)'}
                          </Text>
                        </Text>
                        <Text><Text style={{ fontWeight: 'bold' }}>Dirección: </Text>{punto.direccion || ''}</Text>
                        {punto.rif && <Text><Text style={{ fontWeight: 'bold' }}>RIF: </Text>{punto.rif}</Text>}
                        <Text><Text style={{ fontWeight: 'bold' }}>Tipo: </Text>{punto.tipo}</Text>
                      </View>
                      {/* Botones de acción debajo del cuadro */}
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, alignSelf: 'flex-start', flexWrap: 'wrap' }}>
                        <TouchableOpacity
                          style={[styles.visitCardActionReady, {backgroundColor: '#e6f0ff', borderColor: '#b8d4ff', borderWidth: 1}]}
                          onPress={async () => {
                            setPuntosVisita((prev) => {
                              const nuevos = prev.map((pv) =>
                                pv.id === punto.id ? { ...pv, status: 'completed' } : pv
                              );
                              return nuevos;
                            });
                            setTimeout(() => {
                              syncAndSaveHistorial();
                            }, 100);
                          }}
                        >
                          <Text style={styles.visitCardActionIcon}>✔️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.visitCardActionCancel, {backgroundColor: '#fff0f0', borderColor: '#ffb8b8', borderWidth: 1}]}
                          onPress={() => {
                            setPuntosVisita((prev) => prev.filter((pv) => pv.id !== punto.id));
                          }}
                        >
                          <Text style={styles.visitCardActionIcon}>⛔</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.smallFotoBtn, {backgroundColor: '#f5f6fa', borderColor: '#e0e0e0', borderWidth: 1}]} onPress={pickImageFromGallery}>
                          <Text style={styles.smallFotoIcon}>📷</Text>
                          <Text style={styles.smallFotoText}>Foto</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}

          {/* TAB CLIENTES */}
          {activeTab === 'clientes' && (
              <View style={styles.tabContent}>
                {errores.length > 0 && (
                  <View style={{ backgroundColor: '#fee', padding: 8, borderRadius: 8, marginBottom: 8 }}>

                    {errores.map((err, idx) => (
                      <Text key={idx} style={{ color: 'red', fontSize: 13 }}>{err}</Text>
                    ))}
                  </View>
                )}
                {/* Barra de búsqueda */}
                <View style={{ marginBottom: 12 }}>
                  <TextInput
                    style={{
                      backgroundColor: darkMode ? '#23242a' : '#fff',
                      color: darkMode ? '#fff' : '#222',
                      borderColor: darkMode ? '#333' : '#e3e8f0',
                      borderWidth: 1,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                    placeholder="Buscar cliente por nombre..."
                    placeholderTextColor={darkMode ? '#888' : '#aaa'}
                    value={busquedaCliente}
                    onChangeText={setBusquedaCliente}
                  />
                </View>
                {/* Lista de clientes paginados y filtrados */}
                {clientesFiltrados.length === 0 ? (
                  <Text style={[styles.emptyText, darkMode && { color: '#bbb' }]}>No se encontraron clientes.</Text>
                ) : (
                  <>
                    {clientesPaginados.map((cliente: any) => (
                      <View key={cliente.id} style={[styles.visitCard, darkMode && { backgroundColor: '#23242a', borderColor: '#333' }, {flexDirection: 'column', alignItems: 'stretch', padding: 0}]}> 
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
                            <View style={[styles.visitCardIconBox, darkMode && { backgroundColor: '#23242a' }] }>
                              <Text style={[styles.visitCardIcon, darkMode && { color: '#fff' }]}>🧑‍💼</Text>
                            </View>
                            <Text
                              style={[styles.visitCardTitle, darkMode && { color: '#fff' }, { flex: 1, minWidth: 0, fontSize: 15 }]}
                            >
                              {cliente.nombre || ''}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <TouchableOpacity style={styles.visitCardActionReady} onPress={() => seleccionarCliente(cliente)}>
                              <Text style={styles.visitCardActionIcon}>✔️</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.visitCardActionCancel} onPress={() => setPuntosVisita((prev) => prev.filter((pv) => pv.id !== cliente.id))}>
                              <Text style={styles.visitCardActionIcon}>⛔</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4, width: '100%' }}>
                          <Text style={[styles.visitCardSubIcon, { fontSize: 13 }]}>📍</Text>
                          <Text
                            style={[styles.visitCardSubtitle, darkMode && { color: '#bbb' }, { flex: 1, minWidth: 0, fontSize: 13 }]}
                          >
                            {cliente.direccion || ''}
                          </Text>
                        </View>
                        {cliente.tipo ? (
                          <View style={{ flexDirection: 'row', marginTop: 2, width: '100%' }}>
                            <Text style={[styles.visitCardTipo, darkMode && { color: '#bbb', backgroundColor: '#23242a' }, { fontSize: 12 }]}>{cliente.tipo}</Text>
                          </View>
                        ) : null}
                      </View>
                    ))}
                    {/* Paginación tipo 1,2,3... */}
                    {/* Paginación compacta: solo 3 botones y avance */}
                    <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16, flexWrap: 'wrap', gap: 4 }}>
                      {(() => {
                        // Determinar el grupo de paginación actual
                        const grupo = Math.floor((paginaClientes - 1) / 3);
                        const inicio = grupo * 3 + 1;
                        const fin = Math.min(inicio + 2, totalPaginas);
                        const paginas = [];
                        for (let i = inicio; i <= fin; i++) {
                          paginas.push(i);
                        }
                        return (
                          <>
                            {paginas.map((num) => (
                              <TouchableOpacity
                                key={num}
                                style={{
                                  backgroundColor: paginaClientes === num ? (darkMode ? '#1976d2' : '#1976d2') : (darkMode ? '#23242a' : '#fff'),
                                  borderColor: darkMode ? '#333' : '#1976d2',
                                  borderWidth: 1,
                                  borderRadius: 6,
                                  paddingHorizontal: 12,
                                  paddingVertical: 6,
                                  marginHorizontal: 2,
                                }}
                                onPress={() => setPaginaClientes(num)}
                              >
                                <Text style={{ color: paginaClientes === num ? '#fff' : (darkMode ? '#fff' : '#1976d2'), fontWeight: 'bold' }}>{num}</Text>
                              </TouchableOpacity>
                            ))}
                            {/* Botón avanzar */}
                            {fin < totalPaginas && (
                              <TouchableOpacity
                                style={{
                                  backgroundColor: darkMode ? '#23242a' : '#fff',
                                  borderColor: darkMode ? '#333' : '#1976d2',
                                  borderWidth: 1,
                                  borderRadius: 6,
                                  paddingHorizontal: 12,
                                  paddingVertical: 6,
                                  marginHorizontal: 2,
                                }}
                                onPress={() => setPaginaClientes(fin + 1)}
                              >
                                <Text style={{ color: darkMode ? '#fff' : '#1976d2', fontWeight: 'bold' }}>{'>'}</Text>
                              </TouchableOpacity>
                            )}
                            {/* Botón retroceder */}
                            {grupo > 0 && (
                              <TouchableOpacity
                                style={{
                                  backgroundColor: darkMode ? '#23242a' : '#fff',
                                  borderColor: darkMode ? '#333' : '#1976d2',
                                  borderWidth: 1,
                                  borderRadius: 6,
                                  paddingHorizontal: 12,
                                  paddingVertical: 6,
                                  marginHorizontal: 2,
                                }}
                                onPress={() => setPaginaClientes(inicio - 3)}
                              >
                                <Text style={{ color: darkMode ? '#fff' : '#1976d2', fontWeight: 'bold' }}>{'<'}</Text>
                              </TouchableOpacity>
                            )}
                          </>
                        );
                      })()}
                    </View>
                  </>
                )}
              </View>
          )}

          {/* TAB HISTORIAL */}
          {activeTab === 'historial' && (
            <View style={styles.historialContainer}>
              <Text style={styles.historialTitle}>Historial de Rutas</Text>
              <View style={styles.calendarHeader}>
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
                  <Text key={d} style={styles.calendarHeaderCell}>{d}</Text>
                ))}
              </View>
              {/* Calendario real vinculado a historialRutas */}
              <View style={styles.calendarGrid}>
                {(() => {
                  const today = new Date();
                  const yyyy = today.getFullYear();
                  const mm = String(today.getMonth() + 1).padStart(2, '0');
                  // Primer día del mes
                  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                  // getDay(): 0=Domingo, 1=Lunes, ..., 6=Sábado
                  let startDay = firstDay.getDay();
                  // Ajustar para que lunes sea 0
                  startDay = (startDay === 0) ? 6 : startDay - 1;
                  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                  const weeks = [];
                  let dayNum = 1;
                  for (let week = 0; week < 6; week++) {
                    const days = [];
                    for (let day = 0; day < 7; day++) {
                      if (week === 0 && day < startDay) {
                        days.push(<View key={`empty-${week}-${day}`} style={styles.calendarCell} />);
                      } else if (dayNum > daysInMonth) {
                        days.push(<View key={`empty-${week}-${day}`} style={styles.calendarCell} />);
                      } else {
                        const dd = String(dayNum).padStart(2, '0');
                        const dateKey = `${yyyy}-${mm}-${dd}`;
                        const registroDia = historialRutas.find(r => r.fecha && r.fecha.substring(0,10) === dateKey);
                        let cellStyle = { ...styles.calendarCell };
                        let textStyle = styles.calendarCellText;
                        if (registroDia) {
                          if (registroDia.status && registroDia.status.trim().toLowerCase() === 'completada') {
                            cellStyle = { ...cellStyle, ...styles.calendarCellDone };
                          } else if (registroDia.status && registroDia.status.trim().toLowerCase() === 'en-progreso') {
                            cellStyle = { ...cellStyle, ...styles.calendarCellProgress };
                            textStyle = styles.calendarCellTextProgress;
                          }
                        }
                        // Si es el día actual y está en progreso, prioriza el color de progreso
                        if (parseInt(dd) === today.getDate() && registroDia && registroDia.status && registroDia.status.trim().toLowerCase() === 'en-progreso') {
                          cellStyle = { ...cellStyle, ...styles.calendarCellProgress, ...styles.calendarCellToday };
                          textStyle = styles.calendarCellTextProgress;
                        } else if (parseInt(dd) === today.getDate()) {
                          cellStyle = { ...cellStyle, ...styles.calendarCellToday };
                        }
                        days.push(
                          <View key={dayNum} style={cellStyle}>
                            <Text style={textStyle}>{dayNum}</Text>
                          </View>
                        );
                        dayNum++;
                      }
                    }
                    weeks.push(<View key={week} style={styles.calendarRow}>{days}</View>);
                  }
                  return weeks;
                })()}
              </View>
              {/* Leyenda */}
              <View style={[styles.calendarLegendBox, darkMode && { backgroundColor: '#23242a', borderColor: '#333' }]}> 
                <Text style={[styles.calendarLegendTitle, darkMode && { color: '#fff' }]}>Leyenda del Calendario:</Text>
                <View style={styles.calendarLegendRow}>
                  <View style={styles.calendarLegendCol}>
                    <Text style={[styles.calendarLegendSubtitle, darkMode && { color: '#fff' }]}>Estados:</Text>
                    <View style={styles.calendarLegendItem}><View style={[styles.calendarLegendColor, {backgroundColor:'#d1f7d6', borderColor: darkMode ? '#333' : '#e0e0e0'}]} /> <Text style={darkMode ? { color: '#fff' } : {}}>Con actividad completada</Text></View>
                    <View style={styles.calendarLegendItem}><View style={[styles.calendarLegendColor, {backgroundColor:'#fff3cd', borderColor: darkMode ? '#333' : '#e0e0e0'}]} /> <Text style={darkMode ? { color: '#fff' } : {}}>Rutas en progreso</Text></View>
                    <View style={styles.calendarLegendItem}><View style={[styles.calendarLegendColor, {backgroundColor: darkMode ? '#23242a' : '#f5f6fa', borderWidth:1, borderColor: darkMode ? '#333' : '#e0e0e0'}]} /> <Text style={darkMode ? { color: '#fff' } : {}}>Sin actividad</Text></View>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Modal para Nuevo Prospecto */}
      <Modal
        visible={showProspectoModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProspectoModal(false)}
      >
        <View style={[styles.modalOverlay, darkMode && { backgroundColor: 'rgba(24,26,32,0.85)' }] }>
          <View style={[styles.prospectoModalCard, darkMode && { backgroundColor: '#23242a', borderColor: '#333' }] }>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={[styles.prospectoIconCircle, darkMode && { backgroundColor: '#333', borderColor: '#444' }]}> 
                <Text style={[styles.prospectoIcon, darkMode && { color: '#fff' }]}>🧑‍💼</Text>
              </View>
              <Text style={[styles.prospectoModalTitle, darkMode && { color: '#fff' }]}>Registrar Cliente Prospecto</Text>
            </View>
            <Text style={[styles.prospectoModalSubtitle, darkMode && { color: '#bbb' }]}>¿Encontraste un nuevo punto de venta?</Text>
            <Text style={[styles.prospectoModalText, darkMode && { color: '#bbb' }]}>Registra clientes potenciales que encuentres durante tu ruta para futuras visitas</Text>
            <TouchableOpacity style={[styles.prospectoModalButton, darkMode && { backgroundColor: '#1976d2' }]} onPress={() => { setShowProspectoForm(true); setShowProspectoModal(false); }}>
              <Text style={[styles.prospectoModalButtonText, darkMode && { color: '#fff' }]}>Registrar Nuevo Prospecto</Text>
            </TouchableOpacity>
            <View style={[styles.prospectoInfoBox, darkMode && { backgroundColor: '#181a20', borderColor: '#333' }] }>
              <Text style={[styles.prospectoInfoTitle, darkMode && { color: '#fff' }]}>¿Qué información necesitas capturar?</Text>
              <Text style={[styles.prospectoInfoItem, darkMode && { color: '#fff' }]}>• <Text style={{color: darkMode ? '#e63946' : '#e63946'}}>🏪 Nombre del negocio *</Text></Text>
              <Text style={[styles.prospectoInfoItem, darkMode && { color: '#fff' }]}>• <Text style={{color: darkMode ? '#e63946' : '#e63946'}}>📍 Dirección exacta *</Text></Text>
              <Text style={[styles.prospectoInfoItem, darkMode && { color: '#fff' }]}>• <Text style={{color: darkMode ? '#e63946' : '#e63946'}}>🏷️ Tipo de negocio *</Text></Text>
              <Text style={[styles.prospectoInfoItem, darkMode && { color: '#bbb' }]}>• <Text style={{color: darkMode ? '#bbb' : '#6c757d'}}>📞 Teléfono (opcional)</Text></Text>
              <Text style={[styles.prospectoInfoItem, darkMode && { color: '#bbb' }]}>• <Text style={{color: darkMode ? '#bbb' : '#6c757d'}}>📷 Foto del establecimiento (opcional)</Text></Text>
              <Text style={[styles.prospectoInfoItem, darkMode && { color: '#bbb' }]}>• <Text style={{color: darkMode ? '#bbb' : '#6c757d'}}>💬 Comentarios adicionales (opcional)</Text></Text>
              <Text style={[styles.prospectoInfoItem, darkMode && { color: '#bbb' }]}>• <Text style={{color: darkMode ? '#bbb' : '#6c757d'}}>📡 Ubicación GPS automática</Text></Text>
              <Text style={[styles.prospectoInfoNote, darkMode && { color: '#bbb' }]}>* Campos obligatorios</Text>
            </View>
            <TouchableOpacity style={[styles.prospectoModalClose, darkMode && { backgroundColor: '#23242a' }]} onPress={() => setShowProspectoModal(false)}>
              <Text style={[styles.prospectoModalCloseText, darkMode && { color: '#fff' }]}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL FORMULARIO PROSPECTO */}
      <Modal
        visible={showProspectoForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProspectoForm(false)}
      >
        <View style={[styles.modalOverlay, darkMode && { backgroundColor: 'rgba(24,26,32,0.85)' }] }>
          <View style={[styles.prospectoFormCard, darkMode && { backgroundColor: '#23242a', borderColor: '#333' }] }>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, justifyContent: 'space-between', width: '100%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.prospectoIcon, darkMode && { color: '#fff' }]}>🧑‍💼</Text>
                <Text style={[styles.prospectoFormTitle, darkMode && { color: '#fff' }]}> Registrar Cliente Prospecto</Text>
              </View>
              <TouchableOpacity onPress={() => setShowProspectoForm(false)}>
                <Text style={{ fontSize: 22, color: darkMode ? '#fff' : '#222' }}>×</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.prospectoFormSubtitle}>Captura información de un nuevo punto de venta potencial</Text>
                        <Text style={[styles.prospectoFormSubtitle, darkMode && { color: '#bbb' }]}>Captura información de un nuevo punto de venta potencial</Text>
            {/* Foto */}
            <Text style={styles.prospectoFormLabel}>Foto del Establecimiento (Opcional)</Text>
                        <Text style={[styles.prospectoFormLabel, darkMode && { color: '#fff' }]}>Foto del Establecimiento (Opcional)</Text>
            <TouchableOpacity style={styles.prospectoFotoBtn} onPress={pickImageFromGallery}>
              <Text style={[styles.prospectoFotoIcon, darkMode && { color: '#fff' }]}>📷</Text>
              <Text style={[styles.prospectoFotoText, darkMode && { color: '#fff' }]}>Tomar Foto</Text>
            </TouchableOpacity>
            {foto ? (
              <Image source={{ uri: foto }} style={{ width: 120, height: 120, borderRadius: 10, alignSelf: 'center', marginVertical: 8 }} />
            ) : null}
            {/* Nombre */}
            <Text style={styles.prospectoFormLabel}>Nombre del Negocio *</Text>
            <Text style={[styles.prospectoFormLabel, darkMode && { color: '#fff' }]}>Nombre del Negocio *</Text>
            <TextInput
              style={[styles.prospectoInput, darkMode && { backgroundColor: '#181a20', color: '#fff', borderColor: '#444' }]}
              placeholder="Ej: Farmacia San José"
              placeholderTextColor={darkMode ? '#888' : undefined}
              value={nombreNegocio}
              onChangeText={setNombreNegocio}
            />
            {/* Dirección */}
            <Text style={styles.prospectoFormLabel}>Dirección *</Text>
            <Text style={[styles.prospectoFormLabel, darkMode && { color: '#fff' }]}>Dirección *</Text>
            <TextInput
              style={[styles.prospectoInput, { minHeight: 48 }, darkMode && { backgroundColor: '#181a20', color: '#fff', borderColor: '#444' }]}
              placeholder="Dirección completa del establecimiento"
              placeholderTextColor={darkMode ? '#888' : undefined}
              value={direccionNegocio}
              onChangeText={setDireccionNegocio}
              multiline
            />
            {/* Teléfono */}
            <Text style={styles.prospectoFormLabel}>Teléfono (Opcional)</Text>
            <Text style={[styles.prospectoFormLabel, darkMode && { color: '#fff' }]}>Teléfono (Opcional)</Text>
            <TextInput
              style={[styles.prospectoInput, darkMode && { backgroundColor: '#181a20', color: '#fff', borderColor: '#444' }]}
              placeholder="Ej: 0414-1234567"
              placeholderTextColor={darkMode ? '#888' : undefined}
              value={telefonoNegocio}
              onChangeText={setTelefonoNegocio}
              keyboardType="phone-pad"
            />
            {/* Tipo de Negocio */}
            <Text style={styles.prospectoFormLabel}>Tipo de Negocio *</Text>
            <Text style={[styles.prospectoFormLabel, darkMode && { color: '#fff' }]}>Tipo de Negocio *</Text>
            <View style={styles.prospectoSelectBox}>
              <TextInput
                style={[styles.prospectoInput, darkMode && { backgroundColor: '#181a20', color: '#fff', borderColor: '#444' }]}
                placeholder="Selecciona el tipo de negocio"
                placeholderTextColor={darkMode ? '#888' : undefined}
                value={tipoNegocio}
                onChangeText={setTipoNegocio}
              />
            </View>
            {/* Comentarios */}
            <Text style={styles.prospectoFormLabel}>Comentarios Adicionales</Text>
            <Text style={[styles.prospectoFormLabel, darkMode && { color: '#fff' }]}>Comentarios Adicionales</Text>
            <TextInput
              style={[styles.prospectoInput, { minHeight: 44 }, darkMode && { backgroundColor: '#181a20', color: '#fff', borderColor: '#444' }]}
              placeholder="Observaciones, horarios, contactos, etc..."
              placeholderTextColor={darkMode ? '#888' : undefined}
              value={comentarios}
              onChangeText={setComentarios}
              multiline
            />
            {/* Botones */}
            <View style={styles.prospectoFormBtnRow}>
              <TouchableOpacity style={[styles.prospectoFormCancelBtn, darkMode && { backgroundColor: '#333' }]} onPress={() => setShowProspectoForm(false)}>
                <Text style={[styles.prospectoFormCancelText, darkMode && { color: '#fff' }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.prospectoFormRegisterBtn, darkMode && { backgroundColor: '#1976d2' }]}>
                <Text style={[styles.prospectoFormRegisterText, darkMode && { color: '#fff' }]}>Registrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
// Removed duplicate visitCard style
// Removed duplicate visitCardTitle style
// Removed duplicate visitCardSubtitle style
// Removed duplicate visitCardTipo style
  visitCardSubIcon: {
    fontSize: 13,
    marginRight: 2,
  },
// ...existing code...
  smallFotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f6fa',
    borderRadius: 8, // igual que los otros botones
    paddingVertical: 8, // igual que los otros botones
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  smallFotoIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  smallFotoText: {
    fontSize: 14,
    color: '#222',
    fontWeight: '500',
  },
  // Container principal
  container: {
    flex: 1,
  },

  // Dashboard Header
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingTop: 60,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userIcon: {
    fontSize: 28,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 15,
    color: '#6c757d',
  },
  headerGroupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  headerTrophy: {
    fontSize: 18,
    marginRight: 6,
  },
  headerGroupName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#495057',
  },
  headerZoneInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  headerLocationIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  headerZoneName: {
    fontSize: 15,
    color: '#6c757d',
  },

  // Metrics Card
  metricsCard: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 2,
  },
  metricsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  metricsIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  metricsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  metricBox: {
    width: '48%',
    margin: '1%',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  metricBlue: {
    backgroundColor: '#007AFF',
  },
  metricPink: {
    backgroundColor: '#FF2D55',
  },
  metricGreen: {
    backgroundColor: '#34C759',
  },
  metricOrange: {
    backgroundColor: '#FF9500',
  },
  metricValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  metricsPerformance: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 14,
    marginTop: 12,
  },
  performanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  performanceIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  performanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  performanceLabel: {
    fontSize: 14,
    color: '#6c757d',
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },

  // Tabs Card
  tabsCard: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 18,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#007AFF',
  },
  tabIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  tabText: {
    fontSize: 14,
    color: '#6c757d',
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },

  // New Prospect Button
  newProspectButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
    marginBottom: 20,
  },
  newProspectIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  newProspectText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },

  // Route Status Card
  routeStatusCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 14,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  routeStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeStatusTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusInProgress: {
    backgroundColor: '#FFF3CD',
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#856404',
  },
  routeStatusSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 12,
  },

  // Visit Points Section
  visitPointsSection: {
    marginBottom: 20,
  },
  visitPointsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  visitPointsIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  visitPointsTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  visitPointsCount: {
    fontSize: 16,
    color: '#6c757d',
  },
  emptyText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    paddingVertical: 40,
  },

  // Visit Card
  visitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e3e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    justifyContent: 'space-between',
  },
  visitCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  visitCardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f6fb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  visitCardIcon: {
    fontSize: 22,
  },
  visitCardTitle: {
    fontWeight: 'bold',
    fontSize: 19,
    color: '#222',
    marginBottom: 2,
    flexShrink: 1,
    flexWrap: 'wrap',
    textAlign: 'left',
  },
  visitCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 4,
  },
// Removed duplicate visitCardSubIcon style
  visitCardSubtitle: {
    fontSize: 15,
    color: '#6c757d',
  },
  visitCardTipo: {
    fontSize: 13,
    color: '#1976d2',
    backgroundColor: '#f1f6fb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 2,
    fontWeight: '600',
    marginTop: 2,
  },
  visitCardRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
    gap: 8,
  },
  visitCardInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  visitCardTimeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginRight: 4,
  },
  visitCardTimeIcon: {
    fontSize: 14,
    marginRight: 2,
  },
  visitCardTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  visitCardStatus: {
    color: '#1976d2',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 4,
  },
  visitCardArrow: {
    fontSize: 20,
    color: '#222',
    marginLeft: 8,
    marginRight: 2,
  },
  visitCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  visitCardActionReady: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#1976d2',
    borderRadius: 8,
    padding: 8,
    marginRight: 2,
  },
  visitCardActionCancel: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e63946',
    borderRadius: 8,
    padding: 8,
  },
  visitCardActionIcon: {
    fontSize: 18,
    color: '#222',
  },

  // Empty States
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },

  // Legacy styles (para compatibilidad)
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  rutaBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e3e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  rutaTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  puntoBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e3e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  puntoTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  clienteBox: {
    backgroundColor: '#e6f0ff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#b8d4ff',
    shadowColor: '#007AFF',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  clienteTitle: {
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 2,
  },
  detalleBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e3e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  detalleTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 6,
  },
  historialBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e3e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  prospectoBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e3e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  // Tabs
  // Tabs (no duplicates)

  // (Removed duplicate tab styles. Only the first occurrence is kept above.)

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  prospectoModalCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 28,
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 8,
  },
  prospectoIconCircle: {
    backgroundColor: '#d1f7d6',
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  prospectoIcon: {
    fontSize: 38,
  },
  prospectoModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#222',
    textAlign: 'center',
  },
  prospectoModalSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginBottom: 6,
    textAlign: 'center',
  },
  prospectoModalText: {
    fontSize: 15,
    color: '#6c757d',
    marginBottom: 18,
    textAlign: 'center',
  },
  prospectoModalButton: {
    backgroundColor: '#c1121f',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 22,
    marginTop: 2,
    alignItems: 'center',
  },
  prospectoModalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
  },
  prospectoInfoBox: {
    backgroundColor: '#f1f6fb',
    borderRadius: 12,
    padding: 18,
    marginBottom: 18,
    width: '100%',
  },
  prospectoInfoTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
    color: '#1a1a1a',
  },
  prospectoInfoItem: {
    fontSize: 15,
    marginBottom: 2,
  },
  prospectoInfoNote: {
    fontSize: 13,
    color: '#1976d2',
    marginTop: 8,
  },
  prospectoModalClose: {
    marginTop: 6,
    padding: 8,
  },
  prospectoModalCloseText: {
    color: '#c1121f',
    fontWeight: 'bold',
    fontSize: 15,
  },

  // Prospecto Form Modal styles
  prospectoFormCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    width: '100%',
    maxWidth: 480,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 8,
  },
  prospectoFormTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginLeft: 8,
  },
  prospectoFormSubtitle: {
    fontSize: 15,
    color: '#6c757d',
    marginBottom: 18,
    textAlign: 'left',
  },
  prospectoFormLabel: {
    fontWeight: '600',
    fontSize: 15,
    marginTop: 10,
    marginBottom: 4,
    color: '#222',
  },
  prospectoFotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 0,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 8,
    backgroundColor: '#fafbfc',
  },
  prospectoFotoIcon: {
    fontSize: 22,
    marginRight: 8,
    color: '#222',
  },
  prospectoFotoText: {
    fontSize: 16,
    color: '#222',
  },
  prospectoInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: '#fafbfc',
    marginBottom: 2,
    width: '100%',
  },
  prospectoSelectBox: {
    width: '100%',
    marginBottom: 2,
  },
  prospectoFormBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    marginTop: 18,
    gap: 12,
  },
  prospectoFormCancelBtn: {
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginRight: 8,
  },
  prospectoFormCancelText: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 16,
  },
  prospectoFormRegisterBtn: {
    backgroundColor: '#1976d2',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  prospectoFormRegisterText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // Historial Calendar Styles
  historialContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 12,
    marginTop: 18,
  },
  historialTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 18,
    color: '#222',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    marginHorizontal: 2,
  },
  calendarHeaderCell: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
    color: '#7b7b7b',
    fontSize: 16,
    marginBottom: 2,
  },
  calendarGrid: {
    marginBottom: 18,
  },
  calendarRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  calendarCell: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#f5f6fa',
    borderRadius: 10,
    marginHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  calendarCellDone: {
    backgroundColor: '#d1f7d6',
    borderColor: '#b2e7b6',
  },
  calendarCellProgress: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffe082',
  },
  calendarCellToday: {
    borderColor: '#1976d2',
    borderWidth: 2,
  },
  calendarCellText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  calendarCellTextProgress: {
    fontSize: 18,
    fontWeight: '600',
    color: '#b8860b',
  },
  calendarLegendBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 18,
    marginTop: 18,
  },
  calendarLegendTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
    color: '#222',
  },
  calendarLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 18,
  },
  calendarLegendCol: {
    flex: 1,
  },
  calendarLegendSubtitle: {
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 6,
    color: '#222',
  },
  calendarLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  calendarLegendColor: {
    width: 18,
    height: 18,
    borderRadius: 5,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
});