  // Sincronizar historial de rutas con puntosVisita y fecha actual
  useEffect(() => {
    // Obtener fecha actual en formato YYYY-MM-DD
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayKey = `${yyyy}-${mm}-${dd}`;

    // Contar visitas completadas hoy
    const completadas = puntosVisita.filter(p => p.status === 'completed');
    setHistorialRutas((prev) => {
      // Si ya existe el día, actualizarlo
      const otrosDias = prev.filter(r => r.id !== todayKey);
      if (completadas.length > 0) {
        return [
          ...otrosDias,
          {
            id: todayKey,
            nombre: todayKey,
            fecha: todayKey,
            visitas: completadas.length,
            puntos: completadas,
            status: 'completada',
          },
        ];
      } else {
        // Si no hay visitas completadas hoy, eliminar el día del historial
        return otrosDias;
      }
    });
  }, [puntosVisita]);
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

import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import { saveData, getData } from '../hooks/use-offline-storage';

// Types
interface VisitPoint {
  id: string;
  clientName: string;
  location: string;
  estimatedTime: number;
  status: 'pending' | 'in-progress' | 'completed';
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
}

interface Cliente {
  id: string;
  nombre: string;
  rif: string;
  direccion: string;
  tipo: string;
}

export default function FormularioCompleto() {
  // User info
  const [userName, setUserName] = useState('');
  const [groupName] = useState('GRUPO VICTORIA');
  const [zoneName] = useState('Occidente');
  
  const [activeTab, setActiveTab] = useState('ruta');

  // Estados con tipos
  const [miRuta, setMiRuta] = useState<Ruta[]>([]);
  const [puntosVisita, setPuntosVisita] = useState<VisitPoint[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [historialRutas, setHistorialRutas] = useState<Ruta[]>([]);
  const [prospectos, setProspectos] = useState<Cliente[]>([]);
  const [clientesFirebase, setClientesFirebase] = useState<Cliente[]>([]);

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
    } catch (e) {
      setClientesFirebase([]);
      setErrores((prev) => [...prev, 'Error al cargar clientes: ' + (e?.message || e)]);
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserName(user.displayName || user.email || 'Usuario');
      } else {
        setUserName('');
      }
    });
    return unsubscribe;
  }, []);

  // ----- FUNCIONES -----

  // Al seleccionar un cliente, lo agrega a la ruta (puntosVisita) si no está ya
  const seleccionarCliente = (cliente: any) => {
    setClienteSeleccionado(cliente);
    // Evitar duplicados
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
      };
      return [...prev, nuevoPunto];
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
  const metrics = {
    visitasHoy: 0,
    visitasSemana: 0,
    visitasMes: puntosVisita.length,
    clientesUnicos: puntosVisita.length,
    promedioDiario: 0.3,
    rutasCompletadas: miRuta.filter((r: any) => r.status === 'completada').length,
  };

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
    <ScrollView style={styles.container}>
      {/* Dashboard Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.userIconContainer}>
            <Text style={styles.userIcon}>👤</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>¡Hola, {userName}!</Text>
            <Text style={styles.headerDate}>{getFormattedDate()}</Text>
          </View>
        </View>
        <View style={styles.headerBottom}>
          <View style={styles.headerGroupInfo}>
            <Text style={styles.headerTrophy}>🏆</Text>
            <Text style={styles.headerGroupName}>{groupName}</Text>
          </View>
          <View style={styles.headerZoneInfo}>
            <Text style={styles.headerLocationIcon}>📍</Text>
            <Text style={styles.headerZoneName}>{zoneName}</Text>
          </View>
        </View>
      </View>

      {/* Metrics Section */}
      <View style={styles.metricsCard}>
        <View style={styles.metricsHeader}>
          <Text style={styles.metricsIcon}>📊</Text>
          <Text style={styles.metricsTitle}>Mis Métricas</Text>
        </View>
        <View style={styles.metricsGrid}>
          <View style={[styles.metricBox, styles.metricBlue]}>
            <Text style={styles.metricValue}>{metrics.visitasHoy}</Text>
            <Text style={styles.metricLabel}>Visitas Hoy</Text>
          </View>
          <View style={[styles.metricBox, styles.metricPink]}>
            <Text style={styles.metricValue}>{metrics.visitasSemana}</Text>
            <Text style={styles.metricLabel}>Esta Semana</Text>
          </View>
          <View style={[styles.metricBox, styles.metricGreen]}>
            <Text style={styles.metricValue}>{metrics.visitasMes}</Text>
            <Text style={styles.metricLabel}>Este Mes</Text>
          </View>
          <View style={[styles.metricBox, styles.metricOrange]}>
            <Text style={styles.metricValue}>{metrics.clientesUnicos}</Text>
            <Text style={styles.metricLabel}>Clientes Únicos</Text>
          </View>
        </View>
        <View style={styles.metricsPerformance}>
          <View style={styles.performanceHeader}>
            <Text style={styles.performanceIcon}>📈</Text>
            <Text style={styles.performanceTitle}>Rendimiento</Text>
          </View>
          <View style={styles.performanceRow}>
            <Text style={styles.performanceLabel}>Promedio diario:</Text>
            <Text style={styles.performanceValue}>{metrics.promedioDiario} visitas</Text>
          </View>
          <View style={styles.performanceRow}>
            <Text style={styles.performanceLabel}>Rutas completadas:</Text>
            <Text style={styles.performanceValue}>{metrics.rutasCompletadas}</Text>
          </View>
        </View>
      </View>

      {/* Tabs Section */}
      <View style={styles.tabsCard}>
        <View style={styles.tabBar}>
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

        <View style={styles.tabContent}>
          {/* TAB MI RUTA */}
          {activeTab === 'ruta' && (
            <View>
              {/* Botón Nuevo Prospecto */}
              <TouchableOpacity style={styles.newProspectButton} onPress={() => setShowProspectoModal(true)}>
                <Text style={styles.newProspectIcon}>➕</Text>
                <Text style={styles.newProspectText}>Nuevo Prospecto</Text>
              </TouchableOpacity>

              {/* Estado de la Ruta */}
              {miRuta.length > 0 ? (
                <View style={styles.routeStatusCard}>
                  <View style={styles.routeStatusHeader}>
                    <Text style={styles.routeStatusTitle}>Estado de mi ruta:</Text>
                    <View style={[styles.statusBadge, styles.statusInProgress]}>
                      <Text style={styles.statusBadgeText}>En Progreso</Text>
                    </View>
                  </View>
                  <Text style={styles.routeStatusSubtitle}>Ruta de {userName}</Text>
                  <Button title="🏁 Finalizar mi ruta" onPress={() => {}} />
                </View>
              ) : (
                <Text style={{textAlign:'center',marginVertical:24,fontSize:16,color:'#888'}}>No hay rutas asignada para hoy.</Text>
              )}

              {/* Puntos de Visita */}
              <View style={styles.visitPointsSection}>
                <View style={styles.visitPointsHeader}>
                  <Text style={styles.visitPointsIcon}>👥</Text>
                  <Text style={styles.visitPointsTitle}>{puntosVisita.length} clientes</Text>
                </View>
                {puntosVisita.length === 0 ? (
                  <Text style={styles.emptyText}>No hay puntos de visita asignados.</Text>
                ) : (
                  puntosVisita.map((punto: any) => (
                    <View key={punto.id} style={styles.visitCard}>
                      <View style={styles.visitCardLeft}>
                        <View style={styles.visitCardIconBox}>
                          <Text style={styles.visitCardIcon}>🧑‍💼</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.visitCardTitle}>{punto.nombre}</Text>
                          <View style={styles.visitCardRow}>
                            <Text style={styles.visitCardSubIcon}>📍</Text>
                            <Text style={styles.visitCardSubtitle}>{punto.direccion}</Text>
                          </View>
                          <View style={styles.visitCardRow}>
                            <Text style={styles.visitCardTipo}>{punto.tipo}</Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.visitCardRight}>
                        <View style={styles.visitCardInfoBox}>
                          <View style={styles.visitCardTimeBox}>
                            <Text style={styles.visitCardTimeIcon}>⏰</Text>
                            <Text style={styles.visitCardTimeText}>30 min</Text>
                          </View>
                          <Text style={styles.visitCardStatus}>
                            {punto.status === 'completed' ? 'Completado' : 'Pendiente'}
                          </Text>
                          <Text style={styles.visitCardArrow}>→</Text>
                        </View>
                        <View style={styles.visitCardActions}>
                          {/* Botón para marcar como completada */}
                          <TouchableOpacity
                            style={styles.visitCardActionReady}
                            onPress={() => {
                              setPuntosVisita((prev) => prev.map((pv) =>
                                pv.id === punto.id ? { ...pv, status: 'completed' } : pv
                              ));
                            }}
                          >
                            <Text style={styles.visitCardActionIcon}>✔️</Text>
                          </TouchableOpacity>
                          {/* Botón para cancelar/eliminar */}
                          <TouchableOpacity
                            style={styles.visitCardActionCancel}
                            onPress={() => {
                              setPuntosVisita((prev) => prev.filter((pv) => pv.id !== punto.id));
                            }}
                          >
                            <Text style={styles.visitCardActionIcon}>⛔</Text>
                          </TouchableOpacity>
                        </View>
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
                <Text style={styles.visitPointsTitle}>{clientesFirebase.length} clientes disponibles</Text>
                {errores.length > 0 && (
                  <View style={{ backgroundColor: '#fee', padding: 8, borderRadius: 8, marginBottom: 8 }}>
                    {errores.map((err, idx) => (
                      <Text key={idx} style={{ color: 'red', fontSize: 13 }}>{err}</Text>
                    ))}
                  </View>
                )}
                {clientesFirebase.length === 0 ? (
                  <Text style={styles.emptyText}>No hay clientes disponibles.</Text>
                ) : (
                  clientesFirebase.map((cliente: any) => (
                    <View key={cliente.id} style={styles.visitCard}>
                      <View style={styles.visitCardLeft}>
                        <View style={styles.visitCardIconBox}>
                          <Text style={styles.visitCardIcon}>🧑‍💼</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.visitCardTitle}>{cliente.nombre || ''}</Text>
                          <View style={styles.visitCardRow}>
                            <Text style={styles.visitCardSubIcon}>📍</Text>
                            <Text style={styles.visitCardSubtitle}>{cliente.direccion || ''}</Text>
                          </View>
                          {cliente.tipo ? (
                            <View style={styles.visitCardRow}>
                              <Text style={styles.visitCardTipo}>{cliente.tipo}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                      <View style={styles.visitCardActions}>
                        <TouchableOpacity style={styles.visitCardActionReady} onPress={() => seleccionarCliente(cliente)}>
                          <Text style={styles.visitCardActionIcon}>✔️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
                {clienteSeleccionado && (
                  <View style={styles.detalleBox}>
                    <Text style={styles.detalleTitle}>Detalles del Cliente</Text>
                    <Text>{`Nombre: ${clienteSeleccionado.nombre || ''}`}</Text>
                    <Text>{`Dirección: ${clienteSeleccionado.direccion || ''}`}</Text>
                    <Text>{`RIF: ${clienteSeleccionado.rif || ''}`}</Text>
                    <Text>{`Tipo: ${clienteSeleccionado.tipo || ''}`}</Text>
                  </View>
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
              {/* Simulación de días del mes, puedes reemplazar por datos reales */}
              <View style={styles.calendarGrid}>
                {/* Renderizar 5 filas de 7 días (ejemplo) */}
                {[0,1,2,3,4].map((week) => (
                  <View key={week} style={styles.calendarRow}>
                    {[0,1,2,3,4,5,6].map((day) => {
                      const dayNum = week*7+day+1;
                      // Simulación de estados
                      let cellStyle = styles.calendarCell;
                      let textStyle = styles.calendarCellText;
                      let icons = null;
                      if ([17,26,27,2,4].includes(dayNum)) { cellStyle = [styles.calendarCell, styles.calendarCellDone]; icons = <Text>🧾 1</Text>; }
                      if ([30,1,11].includes(dayNum)) { cellStyle = [styles.calendarCell, styles.calendarCellProgress]; textStyle = styles.calendarCellTextProgress; }
                      if (dayNum === 12) { cellStyle = [styles.calendarCell, styles.calendarCellToday]; }
                      return (
                        <View key={day} style={cellStyle}>
                          <Text style={textStyle}>{dayNum <= 31 ? dayNum : ''}</Text>
                          {icons && dayNum <= 31 ? <View>{icons}</View> : null}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
              {/* Leyenda */}
              <View style={styles.calendarLegendBox}>
                <Text style={styles.calendarLegendTitle}>Leyenda del Calendario:</Text>
                <View style={styles.calendarLegendRow}>
                  <View style={styles.calendarLegendCol}>
                    <Text style={styles.calendarLegendSubtitle}>Estados:</Text>
                    <View style={styles.calendarLegendItem}><View style={[styles.calendarLegendColor, {backgroundColor:'#d1f7d6'}]} /> <Text>Con actividad completada</Text></View>
                    <View style={styles.calendarLegendItem}><View style={[styles.calendarLegendColor, {backgroundColor:'#fff3cd'}]} /> <Text>Rutas en progreso</Text></View>
                    <View style={styles.calendarLegendItem}><View style={[styles.calendarLegendColor, {backgroundColor:'#f5f6fa', borderWidth:1, borderColor:'#e0e0e0'}]} /> <Text>Sin actividad</Text></View>
                  </View>
                  <View style={styles.calendarLegendCol}>
                    <Text style={styles.calendarLegendSubtitle}>Símbolos:</Text>
                    <View style={styles.calendarLegendItem}><Text>🗺️</Text> <Text>Rutas completadas</Text></View>
                    <View style={styles.calendarLegendItem}><Text>🧾</Text> <Text>Visitas realizadas</Text></View>
                    <View style={styles.calendarLegendItem}><Text style={{color:'#1976d2'}}>●</Text> <Text>Día actual</Text></View>
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
        <View style={styles.modalOverlay}>
          <View style={styles.prospectoModalCard}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={styles.prospectoIconCircle}>
                <Text style={styles.prospectoIcon}>🧑‍💼</Text>
              </View>
              <Text style={styles.prospectoModalTitle}>Registrar Cliente Prospecto</Text>
            </View>
            <Text style={styles.prospectoModalSubtitle}>¿Encontraste un nuevo punto de venta?</Text>
            <Text style={styles.prospectoModalText}>
              Registra clientes potenciales que encuentres durante tu ruta para futuras visitas
            </Text>
            <TouchableOpacity style={styles.prospectoModalButton} onPress={() => { setShowProspectoForm(true); setShowProspectoModal(false); }}>
              <Text style={styles.prospectoModalButtonText}>Registrar Nuevo Prospecto</Text>
            </TouchableOpacity>
            <View style={styles.prospectoInfoBox}>
              <Text style={styles.prospectoInfoTitle}>¿Qué información necesitas capturar?</Text>
              <Text style={styles.prospectoInfoItem}>• <Text style={{color:'#e63946'}}>🏪 Nombre del negocio *</Text></Text>
              <Text style={styles.prospectoInfoItem}>• <Text style={{color:'#e63946'}}>📍 Dirección exacta *</Text></Text>
              <Text style={styles.prospectoInfoItem}>• <Text style={{color:'#e63946'}}>🏷️ Tipo de negocio *</Text></Text>
              <Text style={styles.prospectoInfoItem}>• <Text style={{color:'#6c757d'}}>📞 Teléfono (opcional)</Text></Text>
              <Text style={styles.prospectoInfoItem}>• <Text style={{color:'#6c757d'}}>📷 Foto del establecimiento (opcional)</Text></Text>
              <Text style={styles.prospectoInfoItem}>• <Text style={{color:'#6c757d'}}>💬 Comentarios adicionales (opcional)</Text></Text>
              <Text style={styles.prospectoInfoItem}>• <Text style={{color:'#6c757d'}}>📡 Ubicación GPS automática</Text></Text>
              <Text style={styles.prospectoInfoNote}>* Campos obligatorios</Text>
            </View>
            <TouchableOpacity style={styles.prospectoModalClose} onPress={() => setShowProspectoModal(false)}>
              <Text style={styles.prospectoModalCloseText}>Cerrar</Text>
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
        <View style={styles.modalOverlay}>
          <View style={styles.prospectoFormCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, justifyContent: 'space-between', width: '100%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.prospectoIcon}>🧑‍💼</Text>
                <Text style={styles.prospectoFormTitle}> Registrar Cliente Prospecto</Text>
              </View>
              <TouchableOpacity onPress={() => setShowProspectoForm(false)}>
                <Text style={{ fontSize: 22, color: '#222' }}>×</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.prospectoFormSubtitle}>Captura información de un nuevo punto de venta potencial</Text>
            {/* Foto */}
            <Text style={styles.prospectoFormLabel}>Foto del Establecimiento (Opcional)</Text>
            <TouchableOpacity style={styles.prospectoFotoBtn} onPress={pickImageFromGallery}>
              <Text style={styles.prospectoFotoIcon}>📷</Text>
              <Text style={styles.prospectoFotoText}>Tomar Foto</Text>
            </TouchableOpacity>
            {foto ? (
              <Image source={{ uri: foto }} style={{ width: 120, height: 120, borderRadius: 10, alignSelf: 'center', marginVertical: 8 }} />
            ) : null}
            {/* Nombre */}
            <Text style={styles.prospectoFormLabel}>Nombre del Negocio *</Text>
            <TextInput
              style={styles.prospectoInput}
              placeholder="Ej: Farmacia San José"
              value={nombreNegocio}
              onChangeText={setNombreNegocio}
            />
            {/* Dirección */}
            <Text style={styles.prospectoFormLabel}>Dirección *</Text>
            <TextInput
              style={[styles.prospectoInput, { minHeight: 48 }]}
              placeholder="Dirección completa del establecimiento"
              value={direccionNegocio}
              onChangeText={setDireccionNegocio}
              multiline
            />
            {/* Teléfono */}
            <Text style={styles.prospectoFormLabel}>Teléfono (Opcional)</Text>
            <TextInput
              style={styles.prospectoInput}
              placeholder="Ej: 0414-1234567"
              value={telefonoNegocio}
              onChangeText={setTelefonoNegocio}
              keyboardType="phone-pad"
            />
            {/* Tipo de Negocio */}
            <Text style={styles.prospectoFormLabel}>Tipo de Negocio *</Text>
            <View style={styles.prospectoSelectBox}>
              <TextInput
                style={styles.prospectoInput}
                placeholder="Selecciona el tipo de negocio"
                value={tipoNegocio}
                onChangeText={setTipoNegocio}
              />
            </View>
            {/* Comentarios */}
            <Text style={styles.prospectoFormLabel}>Comentarios Adicionales</Text>
            <TextInput
              style={[styles.prospectoInput, { minHeight: 44 }]}
              placeholder="Observaciones, horarios, contactos, etc..."
              value={comentarios}
              onChangeText={setComentarios}
              multiline
            />
            {/* Botones */}
            <View style={styles.prospectoFormBtnRow}>
              <TouchableOpacity style={styles.prospectoFormCancelBtn} onPress={() => setShowProspectoForm(false)}>
                <Text style={styles.prospectoFormCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.prospectoFormRegisterBtn}>
                <Text style={styles.prospectoFormRegisterText}>Registrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Container principal
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },

  // Dashboard Header
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
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
    padding: 24,
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
    alignItems: 'flex-start',
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
  },
  visitCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 4,
  },
  visitCardSubIcon: {
    fontSize: 15,
    marginRight: 2,
    color: '#1976d2',
  },
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
  tabsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#007AFF',
  },
  tabIcon: {
    fontSize: 22,
    marginBottom: 4,
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
    padding: 16,
    backgroundColor: '#f8f9fa',
  },

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
