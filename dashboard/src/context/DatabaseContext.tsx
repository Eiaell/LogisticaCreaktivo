import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import initSqlJs, { type Database } from 'sql.js';
import type { Pedido, Payment, Proveedor, Cliente, Cotizacion, LineaPedido, CambioPedido, ItemCotizacion, HistoricoPrecio, Produccion, MovimientoLogistico, Rendicion, EventoProduccion, PKL, TaskPKL } from '../types';
import { supabase } from '../supabaseClient';
import { type TraceEvent, parseEventsToPedidos } from '../utils/parsers';
import { generateRL } from '../utils/rqGenerator';
import pklsDataImport from '../data/pkls.json';

interface DatabaseContextType {
    db: Database | null;
    events: TraceEvent[];
    pedidos: Pedido[];
    payments: Payment[];
    proveedores: Record<string, Proveedor>;
    clientes: Record<string, Cliente>;
    cotizaciones: Cotizacion[];
    itemsCotizacion: ItemCotizacion[];
    lineasPedido: LineaPedido[];
    historicoPrecio: HistoricoPrecio[];
    pkls: PKL[];
    setPedidos: React.Dispatch<React.SetStateAction<Pedido[]>>;

    // CRUD PKLs
    updatePKL: (id: string, changes: Partial<PKL>) => Promise<void>;
    updatePKLTask: (pklId: string, taskId: string, changes: Partial<TaskPKL>) => Promise<void>;

    // CRUD Pedidos
    createPedido: (data: Omit<Pedido, 'id' | 'created_at' | 'updated_at'>) => Promise<Pedido>;
    updatePedido: (id: string, changes: Partial<Pedido>) => Promise<void>;
    deletePedido: (id: string) => Promise<void>;
    deletePedidos: (ids: string[]) => Promise<void>;

    // Pagos
    addPayment: (pedidoId: string, monto: number, nota?: string) => Promise<void>;

    // CRUD Proveedores/Clientes
    createCliente: (data: Omit<Cliente, 'id'>) => Promise<Cliente>;
    createProveedor: (data: Omit<Proveedor, 'id'>) => Promise<Proveedor>;
    updateProveedor: (nombre: string, data: Partial<Proveedor>) => Promise<void>;
    updateCliente: (nombre: string, data: Partial<Cliente>) => Promise<void>;
    deleteCliente: (nombre: string) => Promise<void>;
    deleteProveedor: (nombre: string) => Promise<void>;

    // CRUD Cotizaciones
    createCotizacion: (data: Omit<Cotizacion, 'id' | 'created_at' | 'updated_at'>) => Promise<Cotizacion>;
    updateCotizacion: (id: string, data: Partial<Cotizacion>) => Promise<void>;
    deleteCotizacion: (id: string) => Promise<void>;
    getCotizacionesByProveedor: (proveedorId: string) => Cotizacion[];

    // CRUD Histórico de Precios
    createHistoricoPrecio: (data: Omit<HistoricoPrecio, 'id' | 'created_at' | 'updated_at'>) => Promise<HistoricoPrecio>;
    getHistoricoPorProveedor: (proveedorId: string) => HistoricoPrecio[];
    getHistoricoPorProductoBase: (proveedorId: string, productoBase: string) => HistoricoPrecio[];
    getHistoricoReciente: (proveedorId: string, productoBase: string, diasAtras?: number) => HistoricoPrecio[];

    // CRUD Líneas de Pedido
    createLineaPedido: (pedidoId: string, lineData: Omit<LineaPedido, 'id' | 'created_at' | 'updated_at'>) => Promise<LineaPedido>;
    updateLineaPedido: (lineaId: string, data: Partial<LineaPedido>) => Promise<void>;
    deleteLineaPedido: (lineaId: string) => Promise<void>;
    getLineasPedido: (pedidoId: string) => LineaPedido[];

    // CRUD Cambios de Pedido
    createCambioPedido: (cambioData: Omit<CambioPedido, 'id' | 'created_at'>) => Promise<CambioPedido>;
    getCambiosPedido: (pedidoId: string) => CambioPedido[];

    // Búsqueda de Items
    getItemsUnicos: () => string[];
    getItemsByNombre: (nombre: string) => ItemCotizacion[];
    getProveedoresPorItem: (item: string) => ItemCotizacion[];

    // CRUD Producciones
    producciones: Produccion[];
    createProduccion: (data: Omit<Produccion, 'id' | 'created_at' | 'updated_at'>) => Promise<Produccion>;
    updateProduccion: (id: string, data: Partial<Produccion>) => Promise<void>;
    deleteProduccion: (id: string) => Promise<void>;
    getProduccionesByPedido: (pedidoId: string) => Produccion[];
    getProduccionesByProveedor: (proveedorId: string) => Produccion[];

    // CRUD Movimientos Logísticos
    movimientosLogisticos: MovimientoLogistico[];
    createMovimientoLogistico: (data: Omit<MovimientoLogistico, 'seccion'>) => Promise<MovimientoLogistico>;
    getMovimientosByFecha: (fecha: string) => MovimientoLogistico[];
    getMovimientosByCliente: (cliente: string) => MovimientoLogistico[];

    // CRUD Rendiciones
    rendiciones: Rendicion[];
    createRendicion: (data: Omit<Rendicion, 'seccion'>) => Promise<Rendicion>;
    updateRendicion: (id: string, data: Partial<Rendicion>) => Promise<void>;
    deleteRendicion: (id: string) => Promise<void>;
    getRendicionesByFecha: (fecha: string) => Rendicion[];
    getRendicionesByCliente: (cliente: string) => Rendicion[];

    // CRUD Eventos de Producción
    eventosProduccion: EventoProduccion[];
    createEventoProduccion: (data: Omit<EventoProduccion, 'seccion'>) => Promise<EventoProduccion>;
    updateEventoProduccion: (id: string, data: Partial<EventoProduccion>) => Promise<void>;
    deleteEventoProduccion: (id: string) => Promise<void>;
    getEventosProduccionByFecha: (fecha: string) => EventoProduccion[];

    // CRUD Movimientos (update/delete)
    updateMovimientoLogistico: (id: string, data: Partial<MovimientoLogistico>) => Promise<void>;
    deleteMovimientoLogistico: (id: string) => Promise<void>;

    // Buscar o crear cliente por nombre
    findOrCreateCliente: (nombre: string) => Promise<Cliente | null>;
    getClienteByNombre: (nombre: string) => Cliente | null;
    getClienteLogo: (nombre: string) => string | null;

    selectedStateFilter: string | null;
    setSelectedStateFilter: (state: string | null) => void;

    isLoading: boolean;
    error: string | null;
    dataSource: 'db' | 'jsonl' | 'supabase' | null;
    loadDatabase: (files: FileList | File[]) => Promise<void>;
    resetDatabase: () => void;
    exportBackup: () => void;
    uploadLogo: (file: File, path: string) => Promise<string | null>;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

// Functions moved to utils/parsers.ts

export function DatabaseProvider({ children }: { children: ReactNode }) {
    const [db, setDb] = useState<Database | null>(null);
    const [events, setEvents] = useState<TraceEvent[]>([]);
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [proveedores, setProveedores] = useState<Record<string, Proveedor>>({});
    const [clientes, setClientes] = useState<Record<string, Cliente>>({});
    const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
    const [lineasPedido, setLineasPedido] = useState<LineaPedido[]>([]);
    const [cambiosPedido, setCambiosPedido] = useState<CambioPedido[]>([]);
    const [itemsCotizacion, setItemsCotizacion] = useState<ItemCotizacion[]>([]);
    const [historicoPrecio, setHistoricoPrecio] = useState<HistoricoPrecio[]>([]);
    const [producciones, setProducciones] = useState<Produccion[]>([]);
    const [movimientosLogisticos, setMovimientosLogisticos] = useState<MovimientoLogistico[]>([]);
    const [rendiciones, setRendiciones] = useState<Rendicion[]>([]);
    const [eventosProduccion, setEventosProduccion] = useState<EventoProduccion[]>([]);
    const [pkls, setPkls] = useState<PKL[]>(pklsDataImport as unknown as PKL[]);
    const [selectedStateFilter, setSelectedStateFilter] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dataSource, setDataSource] = useState<'db' | 'jsonl' | 'supabase' | null>(null);

    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                const { data: clientsData, error: clientsError } = await supabase.from('clientes').select('*');
                if (clientsError) {
                    console.error("❌ Error fetching clientes:", clientsError);
                } else if (clientsData) {
                    const clientsMap: Record<string, Cliente> = {};
                    clientsData.forEach(c => {
                        // Supabase table uses "nombre" as the main identifier field
                        const razonSocial = c.nombre || 'Sin Nombre';

                        clientsMap[razonSocial] = {
                            id: razonSocial,
                            razon_social: razonSocial,
                            nombre_comercial: c.nombre_comercial || '',
                            grupo_empresarial: c.grupo_empresarial || null,
                            grupo_empresarial_ruc: c.grupo_empresarial_ruc || null,
                            grupo_logo_url: c.grupo_logo_url || null,
                            proyecto: c.proyecto || null,
                            proyecto_codigo: c.proyecto_codigo || null,
                            ruc: c.ruc || '',
                            direccion: c.direccion || '',
                            contacto: c.contacto || '',
                            telefono: c.telefono || '',
                            email: c.email || '',
                            terminos_comerciales: c.terminos_comerciales || '',
                            vendedor_asignado: c.vendedor_asignado || '',
                            estado: c.estado || 'activo',
                            prioridad: c.prioridad || 'medio',
                            tipo_cliente: c.tipo_cliente || 'corporativo',
                            notas: c.notas || '',
                            logo: c.logo_url,
                            created_at: c.created_at,
                            updated_at: c.updated_at
                        };
                    });
                    setClientes(clientsMap);
                    console.log(`📊 Clientes cargados de Supabase (${Object.keys(clientsMap).length}):`, Object.keys(clientsMap));
                } else {
                    console.log("ℹ️ No clientes found in Supabase on initial load");
                }

                const { data: provData } = await supabase.from('proveedores').select('*');
                if (provData) {
                    const provMap: Record<string, Proveedor> = {};
                    provData.forEach(p => provMap[p.nombre] = { ...p, id: p.nombre, logo: p.logo_url });
                    setProveedores(provMap);
                }

                const { data: ordersData } = await supabase.from('pedidos').select('*');
                if (ordersData) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const mappedOrders = (ordersData as any[]).map(p => ({
                        ...p,
                        cliente: p.cliente_nombre,
                        vendedora: p.vendedora || '',
                        rq_numero: p.rq_numero || null,   // Código interno empresa (manual)
                        rl_numero: p.rl_numero || null,   // Requisito logístico sistema (auto)
                        precio: p.precio || 0,
                        pagado: p.pagado || 0
                    }));
                    setPedidos(mappedOrders as Pedido[]);
                }

                const { data: paymentsData } = await supabase.from('pagos').select('*');
                if (paymentsData) {
                    setPayments(paymentsData.map(p => ({
                        id: p.id,
                        pedidoId: p.pedido_id,
                        monto: p.monto,
                        fecha: p.fecha,
                        nota: p.nota
                    })));
                }

                // Cargar cotizaciones con variantes
                const { data: cotizacionesData, error: cotError } = await supabase.from('cotizaciones').select('*');
                if (cotError) {
                    console.error('❌ Error cargando cotizaciones:', cotError);
                    setCotizaciones([]);
                } else if (cotizacionesData && cotizacionesData.length > 0) {
                    console.log(`📋 Cargadas ${cotizacionesData.length} cotizaciones`);
                    // Cargar variantes para cada cotización
                    const cotizacionesConVariantes = await Promise.all(
                        cotizacionesData.map(async (cot: any) => {
                            const { data: variantesData, error: varError } = await supabase
                                .from('variantes_cotizacion')
                                .select('*')
                                .eq('cotizacion_id', cot.id);
                            if (varError) {
                                console.error(`❌ Error cargando variantes para cotización ${cot.id}:`, varError);
                            }
                            return {
                                ...cot,
                                variantes: variantesData || []
                            };
                        })
                    );
                    setCotizaciones(cotizacionesConVariantes as Cotizacion[]);
                    console.log(`✅ ${cotizacionesConVariantes.length} cotizaciones cargadas con variantes`);
                } else {
                    console.log('ℹ️ No hay cotizaciones en la base de datos');
                    setCotizaciones([]);
                }

                // Cargar líneas de pedido (FASE 1: usar nuevas columnas item/detalle/precio)
                const { data: lineasData } = await supabase.from('lineas_pedido').select('*');
                if (lineasData) {
                    const lineasParsed = lineasData.map((l: any) => ({
                        id: l.id,
                        pedido_id: l.pedido_id,
                        // FASE 1: Usar nuevas columnas (item, detalle, precio)
                        // Columnas legacy (producto, variantes, precio_unitario, subtotal) se eliminan en Fase 3
                        item: l.item || '',
                        detalle: l.detalle || '',
                        precio: l.precio || 0,
                        created_at: l.created_at,
                        updated_at: l.updated_at
                    }));
                    setLineasPedido(lineasParsed);
                }

                // Cargar cambios de pedido
                const { data: cambiosData } = await supabase.from('cambios_pedido').select('*');
                if (cambiosData) {
                    setCambiosPedido(cambiosData as CambioPedido[]);
                }

                // Cargar items y cotizaciones
                const { data: itemsData } = await supabase.from('items_cotizacion').select('*');
                if (itemsData) {
                    setItemsCotizacion(itemsData as ItemCotizacion[]);
                }

                // Cargar histórico de precios
                const { data: historicoPrecioData } = await supabase.from('historico_precios').select('*');
                if (historicoPrecioData) {
                    setHistoricoPrecio(historicoPrecioData as HistoricoPrecio[]);
                }

                // Cargar producciones
                const { data: produccionesData, error: prodError } = await supabase.from('producciones').select('*');
                if (prodError) {
                    console.log('ℹ️ Tabla producciones no existe aún o error:', prodError.message);
                    setProducciones([]);
                } else if (produccionesData) {
                    setProducciones(produccionesData as Produccion[]);
                    console.log(`🏭 ${produccionesData.length} producciones cargadas`);
                }

                // Cargar movimientos logísticos
                const { data: movimientosData, error: movError } = await supabase.from('movimientos_logisticos').select('*');
                if (movError) {
                    console.log('ℹ️ Tabla movimientos_logisticos no existe aún o error:', movError.message);
                    setMovimientosLogisticos([]);
                } else if (movimientosData) {
                    const movimientosParsed = movimientosData.map((m: any) => ({
                        ...m,
                        seccion: 'MOVIMIENTO_LOGISTICO' as const,
                    }));
                    setMovimientosLogisticos(movimientosParsed);
                    console.log(`🚚 ${movimientosData.length} movimientos logísticos cargados`);
                }

                // Cargar rendiciones
                const { data: rendicionesData, error: rendError } = await supabase.from('rendiciones').select('*');
                if (rendError) {
                    console.log('ℹ️ Tabla rendiciones no existe aún o error:', rendError.message);
                    setRendiciones([]);
                } else if (rendicionesData) {
                    const rendicionesParsed = rendicionesData.map((r: any) => ({
                        ...r,
                        seccion: 'RENDICION_PAGO' as const,
                    }));
                    setRendiciones(rendicionesParsed);
                    console.log(`💰 ${rendicionesData.length} rendiciones cargadas`);
                }

                // Cargar eventos de producción
                const { data: eventosData, error: eventosError } = await supabase.from('eventos_produccion').select('*');
                if (eventosError) {
                    console.log('ℹ️ Tabla eventos_produccion no existe aún o error:', eventosError.message);
                    setEventosProduccion([]);
                } else if (eventosData) {
                    const eventosParsed = eventosData.map((e: any) => ({
                        ...e,
                        seccion: 'PRODUCCION' as const,
                    }));
                    setEventosProduccion(eventosParsed);
                    console.log(`🏭 ${eventosData.length} eventos de producción cargados`);
                }

                // Cargar PKLs desde Supabase
                const { data: pklsData, error: pklsError } = await supabase.from('pkls').select('*');
                if (pklsError) {
                    console.log('ℹ️ Tabla pkls no existe aún, usando datos locales:', pklsError.message);
                    // Keep the initial state from JSON import
                } else if (pklsData && pklsData.length > 0) {
                    // Cargar tasks para cada PKL
                    const { data: allTasksData } = await supabase.from('pkl_tasks').select('*').order('orden', { ascending: true });
                    const tasksByPkl = (allTasksData || []).reduce((acc: Record<string, any[]>, task: any) => {
                        if (!acc[task.pkl_id]) acc[task.pkl_id] = [];
                        acc[task.pkl_id].push({
                            task_id: task.task_id,
                            orden: task.orden,
                            nombre: task.nombre,
                            descripcion: task.descripcion,
                            tipo: task.tipo,
                            responsable: task.responsable,
                            proveedor_id: task.proveedor_id,
                            estado: task.estado,
                            es_happy_path: task.es_happy_path,
                            bloqueado_por_evento: task.bloqueado_por_evento,
                            duracion_min: task.duracion_min,
                            costo: task.costo,
                            ruta: task.ruta,
                            ubicacion: task.ubicacion,
                            resultado: task.resultado,
                            fecha_completado: task.fecha_completado,
                        });
                        return acc;
                    }, {});

                    // Transformar datos de Supabase al formato PKL
                    const pklsParsed: PKL[] = pklsData.map((p: any) => ({
                        pkl_id: p.pkl_id,
                        version: p.version,
                        created_at: p.created_at,
                        updated_at: p.updated_at,
                        clasificacion: {
                            tipo_operacion: p.tipo_operacion,
                            area: p.area || 'logistica',
                        },
                        cliente: p.cliente,
                        origen: p.origen,
                        productos: p.productos || [],
                        inputs: p.inputs,
                        proveedores: p.proveedores || [],
                        estado: {
                            actual: p.estado_actual,
                            historial: p.estado_historial || [],
                        },
                        tasks: tasksByPkl[p.pkl_id] || [],
                        eventos_externos: p.eventos_externos || [],
                        costos: p.costos || { detalle: [], total: 0, moneda: 'PEN' },
                        cierre: p.cierre || { evidencias: [] },
                        alertas: p.alertas || { dias_sin_actividad: 0, umbral_pausa_dias: 3 },
                        riesgos_identificados: p.riesgos_identificados,
                        observaciones: p.observaciones,
                    }));
                    setPkls(pklsParsed);
                    console.log(`📋 ${pklsParsed.length} PKLs cargados desde Supabase`);
                } else {
                    console.log('ℹ️ No hay PKLs en Supabase, usando datos locales');
                }

                // Sincronizar dataSource SOLO si logramos leer algo o terminar el proceso
                setDataSource('supabase');
                console.log("Supabase Sync Complete. Pedidos:", ordersData?.length || 0);
            } catch (err) {
                console.error("Initial fetch error:", err);
                // Si falla la red, no bloqueamos la app, pero avisamos
                setDataSource(null);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    const resetDatabase = () => {
        setDb(null);
        setEvents([]);
        setPedidos([]);
        setPayments([]);
        setDataSource('supabase');
        setError(null);
        setSelectedStateFilter(null);
    };

    const createPedido = async (data: Omit<Pedido, 'id' | 'created_at' | 'updated_at'>): Promise<Pedido> => {
        const now = new Date().toISOString();

        // Auto-generar RL (Requisito Logístico del sistema)
        const rlNumero = generateRL(pedidos);

        const newPedido: Pedido = {
            ...data,
            id: `PED-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
            rl_numero: rlNumero,
            // rq_numero viene del formulario (código interno empresa, manual)
            created_at: now,
            updated_at: now,
        };

        setPedidos(prev => [newPedido, ...prev]);

        try {
            const { error } = await supabase.from('pedidos').insert({
                id: newPedido.id,
                cliente_nombre: newPedido.cliente,
                vendedora: newPedido.vendedora,
                descripcion: newPedido.descripcion,
                estado: newPedido.estado,
                precio: newPedido.precio || 0,
                pagado: newPedido.pagado || 0,
                rq_numero: newPedido.rq_numero || null,    // Código interno (manual)
                rl_numero: newPedido.rl_numero,            // Requisito logístico (auto)
                fecha_compromiso: newPedido.fecha_compromiso,
                created_at: newPedido.created_at,
                updated_at: newPedido.updated_at,
            });
            if (error) throw error;
            console.log("Pedido creado en Supabase:", newPedido.id);
        } catch (err) {
            console.error("Error creating pedido:", err);
        }

        return newPedido;
    };

    const updatePedido = async (id: string, changes: Partial<Pedido>) => {
        const now = new Date().toISOString();
        setPedidos(prev => prev.map(p => p.id === id ? { ...p, ...changes, updated_at: now } : p));
        try {
            const dbChanges: any = { ...changes };
            if (dbChanges.cliente !== undefined) {
                dbChanges.cliente_nombre = dbChanges.cliente;
                delete dbChanges.cliente;
            }
            // Asegurar que vendedora y rq_numero se mapean si existen en changes
            if (dbChanges.vendedora !== undefined) dbChanges.vendedora = dbChanges.vendedora;
            if (dbChanges.rq_numero !== undefined) dbChanges.rq_numero = dbChanges.rq_numero;

            const { error } = await supabase.from('pedidos').update(dbChanges).eq('id', id);
            if (error) throw error;
            console.log("Pedido actualizado en Supabase:", id, dbChanges);
        } catch (err) {
            console.error("Error updating pedido:", err);
        }
    };

    // Update PKL - persists to Supabase
    // Uses deep partial merge - only updates fields that are provided
    const updatePKL = async (id: string, changes: Partial<PKL>) => {
        const now = new Date().toISOString();

        // First, find and update the PKL in state
        const currentPkl = pkls.find(p => p.pkl_id === id);
        if (!currentPkl) {
            console.error('PKL not found:', id);
            return;
        }

        // Deep merge for nested objects
        const updated: PKL = { ...currentPkl, updated_at: now };

        // Handle cliente changes (partial merge)
        if (changes.cliente) {
            updated.cliente = { ...currentPkl.cliente, ...changes.cliente };
        }

        // Handle clasificacion changes (partial merge)
        if (changes.clasificacion) {
            updated.clasificacion = { ...currentPkl.clasificacion, ...changes.clasificacion };
        }

        // Handle estado changes (partial merge with historial append)
        if (changes.estado) {
            const newHistorialEntry = {
                estado: changes.estado.actual || currentPkl.estado.actual,
                fecha: now,
                motivo: 'Actualización manual'
            };
            updated.estado = {
                ...currentPkl.estado,
                ...changes.estado,
                historial: [
                    ...currentPkl.estado.historial,
                    newHistorialEntry
                ]
            };
        }

        // Handle origen changes (partial merge)
        if (changes.origen) {
            updated.origen = { ...currentPkl.origen, ...changes.origen };
        }

        // Update state
        setPkls(prev => prev.map(pkl => pkl.pkl_id === id ? updated : pkl));

        // Persist to Supabase
        try {
            const { error } = await supabase.from('pkls').upsert({
                pkl_id: updated.pkl_id,
                version: updated.version,
                updated_at: now,
                tipo_operacion: updated.clasificacion.tipo_operacion,
                area: updated.clasificacion.area,
                cliente: updated.cliente,
                origen: updated.origen,
                productos: updated.productos,
                inputs: updated.inputs,
                proveedores: updated.proveedores,
                estado_actual: updated.estado.actual,
                estado_historial: updated.estado.historial,
                eventos_externos: updated.eventos_externos,
                costos: updated.costos,
                cierre: updated.cierre,
                alertas: updated.alertas,
                riesgos_identificados: updated.riesgos_identificados,
                observaciones: updated.observaciones
            }, { onConflict: 'pkl_id' });

            if (error) {
                console.error('Error saving PKL to Supabase:', error);
            } else {
                console.log('✓ PKL saved to Supabase:', id);
            }
        } catch (err) {
            console.error('Error persisting PKL:', err);
        }
    };

    // Update a specific task within a PKL - persists to Supabase
    const updatePKLTask = async (pklId: string, taskId: string, changes: Partial<TaskPKL>) => {
        const now = new Date().toISOString();

        // Find the PKL and task
        const currentPkl = pkls.find(p => p.pkl_id === pklId);
        if (!currentPkl) {
            console.error('PKL not found:', pklId);
            return;
        }

        const currentTask = currentPkl.tasks.find(t => t.task_id === taskId);
        if (!currentTask) {
            console.error('Task not found:', taskId);
            return;
        }

        // Merge changes into the task
        const updatedTask: TaskPKL = { ...currentTask, ...changes };

        // If estado changed to completado, set fecha_completado
        if (changes.estado === 'completado' && !currentTask.fecha_completado) {
            updatedTask.fecha_completado = now.split('T')[0];
        }

        // Update state
        setPkls(prev => prev.map(pkl => {
            if (pkl.pkl_id !== pklId) return pkl;
            return {
                ...pkl,
                tasks: pkl.tasks.map(t => t.task_id === taskId ? updatedTask : t),
                updated_at: now
            };
        }));

        // Persist task to Supabase
        try {
            const { error } = await supabase.from('pkl_tasks').upsert({
                pkl_id: pklId,
                task_id: updatedTask.task_id,
                orden: updatedTask.orden,
                nombre: updatedTask.nombre,
                descripcion: updatedTask.descripcion,
                tipo: updatedTask.tipo,
                responsable: updatedTask.responsable,
                proveedor_id: updatedTask.proveedor_id,
                estado: updatedTask.estado,
                es_happy_path: updatedTask.es_happy_path,
                bloqueado_por_evento: updatedTask.bloqueado_por_evento,
                duracion_min: updatedTask.duracion_min,
                costo: updatedTask.costo,
                ruta: updatedTask.ruta,
                ubicacion: updatedTask.ubicacion,
                resultado: updatedTask.resultado,
                fecha_completado: updatedTask.fecha_completado
            }, { onConflict: 'pkl_id,task_id' });

            if (error) {
                console.error('Error saving PKL task to Supabase:', error);
            } else {
                console.log('✓ PKL Task saved to Supabase:', pklId, taskId);
            }

            // Also update the PKL's updated_at
            await supabase.from('pkls').update({ updated_at: now }).eq('pkl_id', pklId);
        } catch (err) {
            console.error('Error persisting PKL task:', err);
        }
    };

    const deletePedido = async (id: string) => {
        setPedidos(prev => prev.filter(p => p.id !== id));
        setPayments(prev => prev.filter(p => p.pedidoId !== id));

        try {
            // Primero eliminar pagos relacionados
            await supabase.from('pagos').delete().eq('pedido_id', id);
            // Luego eliminar el pedido
            const { error } = await supabase.from('pedidos').delete().eq('id', id);
            if (error) throw error;
            console.log("Pedido eliminado de Supabase:", id);
        } catch (err) {
            console.error("Error deleting pedido:", err);
        }
    };

    const deletePedidos = async (ids: string[]) => {
        setPedidos(prev => prev.filter(p => !ids.includes(p.id)));
        setPayments(prev => prev.filter(p => !ids.includes(p.pedidoId)));

        try {
            // Eliminar pagos relacionados
            await supabase.from('pagos').delete().in('pedido_id', ids);
            // Eliminar pedidos
            const { error } = await supabase.from('pedidos').delete().in('id', ids);
            if (error) throw error;
            console.log("Pedidos eliminados de Supabase:", ids.length);
        } catch (err) {
            console.error("Error deleting pedidos:", err);
        }
    };

    const createCliente = async (data: Omit<Cliente, 'id'>): Promise<Cliente> => {
        const now = new Date().toISOString();

        // VALIDACIÓN CRÍTICA: razon_social es OBLIGATORIO
        if (!data.razon_social || data.razon_social.trim() === '') {
            throw new Error('razon_social es obligatorio para crear un cliente');
        }

        const razonSocialKey = data.razon_social.trim();

        const newCliente: Cliente = {
            ...data,
            id: razonSocialKey,
            razon_social: razonSocialKey,
            estado: data.estado || 'activo',
            prioridad: data.prioridad || 'medio',
            tipo_cliente: data.tipo_cliente || 'corporativo',
            created_at: now,
            updated_at: now,
        };

        // PRIMERO: Actualizar estado local
        setClientes(prev => ({ ...prev, [razonSocialKey]: newCliente }));

        try {
            // SEGUNDO: Guardar en Supabase con upsert para evitar conflictos
            // NOTA: La tabla usa 'nombre' como clave primaria, NO 'razon_social'
            const { error } = await supabase.from('clientes').upsert({
                nombre: razonSocialKey,
                razon_social: razonSocialKey,
                nombre_comercial: newCliente.nombre_comercial,
                grupo_empresarial: newCliente.grupo_empresarial,
                grupo_empresarial_ruc: newCliente.grupo_empresarial_ruc,
                proyecto: newCliente.proyecto,
                proyecto_codigo: newCliente.proyecto_codigo,
                ruc: newCliente.ruc,
                direccion: newCliente.direccion,
                contacto: newCliente.contacto,
                telefono: newCliente.telefono,
                email: newCliente.email,
                terminos_comerciales: newCliente.terminos_comerciales,
                vendedor_asignado: newCliente.vendedor_asignado,
                estado: newCliente.estado,
                prioridad: newCliente.prioridad,
                tipo_cliente: newCliente.tipo_cliente,
                notas: newCliente.notas,
                logo_url: newCliente.logo,
                created_at: now,
                updated_at: now,
            }, { onConflict: 'nombre' });

            if (error) {
                console.error("❌ Error saving to Supabase:", error);
                throw error;
            }
            console.log("✅ Cliente creado en Supabase:", razonSocialKey);
        } catch (err) {
            console.error("❌ Error creating cliente:", err);
            // NO REMOVER DEL ESTADO LOCAL - dejar que el usuario intente de nuevo
        }

        return newCliente;
    };

    const createProveedor = async (data: Omit<Proveedor, 'id'>): Promise<Proveedor> => {
        const now = new Date().toISOString();
        const newProveedor: Proveedor = {
            ...data,
            id: data.nombre,
            created_at: now,
            updated_at: now,
        };
        setProveedores(prev => ({ ...prev, [data.nombre]: newProveedor }));

        try {
            const { error } = await supabase.from('proveedores').insert({
                nombre: newProveedor.nombre,
                razon_social: newProveedor.razon_social,
                ruc: newProveedor.ruc,
                contacto: newProveedor.contacto,
                telefono: newProveedor.telefono,
                email: newProveedor.email,
                direccion: newProveedor.direccion,
                categorias: newProveedor.categorias,
                especialidad: newProveedor.especialidad,
                emite_factura: newProveedor.emite_factura,
                incluye_igv: newProveedor.incluye_igv,
                forma_pago: newProveedor.forma_pago,
                tiempo_produccion: newProveedor.tiempo_produccion,
                tiempo_entrega: newProveedor.tiempo_entrega,
                minimo_produccion: newProveedor.minimo_produccion,
                factor_demora: newProveedor.factor_demora,
                notas: newProveedor.notas,
                logo_url: newProveedor.logo,
                created_at: now,
                updated_at: now
            });
            if (error) throw error;
            console.log("Proveedor creado en Supabase:", newProveedor.nombre);
        } catch (err) {
            console.error("Error creating proveedor:", err);
        }

        return newProveedor;
    };

    const updateProveedor = async (nombre: string, data: Partial<Proveedor>) => {
        const fullData = { ...(proveedores[nombre] || { nombre, especialidad: 'General', factor_demora: 0 }), ...data };
        setProveedores(prev => ({ ...prev, [nombre]: fullData }));
        try {
            // FASE 1: incluye_igv ahora es tipo igv_policy ('si' | 'no' | 'depende')
            // Convertir boolean legacy a string si es necesario
            let incluye_igv_value = fullData.incluye_igv;
            if (typeof incluye_igv_value === 'boolean') {
                incluye_igv_value = incluye_igv_value ? 'si' : 'no';
                console.warn(`⚠️ Convirtiendo incluye_igv de boolean a igv_policy: ${incluye_igv_value}`);
            }

            await supabase.from('proveedores').upsert({
                nombre: fullData.nombre,
                razon_social: fullData.razon_social,
                ruc: fullData.ruc,
                contacto: fullData.contacto,
                telefono: fullData.telefono,
                email: fullData.email,
                direccion: fullData.direccion,
                categorias: fullData.categorias,
                especialidad: fullData.especialidad,
                emite_factura: fullData.emite_factura,
                incluye_igv: incluye_igv_value,
                forma_pago: fullData.forma_pago,
                tiempo_produccion: fullData.tiempo_produccion,
                tiempo_entrega: fullData.tiempo_entrega,
                minimo_produccion: fullData.minimo_produccion,
                factor_demora: fullData.factor_demora,
                notas: fullData.notas,
                logo_url: fullData.logo
            }, { onConflict: 'nombre' });
        } catch (err) {
            console.error("Error updating proveedor:", err);
        }
    };

    const updateCliente = async (razonSocial: string, data: Partial<Cliente>) => {
        const now = new Date().toISOString();

        // VALIDACIÓN: razonSocial debe existir
        if (!razonSocial || razonSocial.trim() === '') {
            console.error("❌ updateCliente: razonSocial es requerido");
            return;
        }

        const currentCliente = clientes[razonSocial];
        if (!currentCliente) {
            console.error(`❌ updateCliente: Cliente ${razonSocial} no existe en estado local`);
            return;
        }

        const fullData = {
            ...currentCliente,
            ...data,
            razon_social: razonSocial, // Mantener la clave en estado local
            updated_at: now
        };

        console.log(`📝 Actualizando cliente ${razonSocial}:`, data);
        setClientes(prev => ({ ...prev, [razonSocial]: fullData }));

        try {
            // Supabase usa "nombre" como clave primaria, no "razon_social"
            const supabasePayload: Record<string, any> = {
                nombre: razonSocial, // La clave es "nombre" en Supabase
            };

            // Actualizar solo los campos que existen en Supabase
            if (data.razon_social !== undefined) supabasePayload.razon_social = data.razon_social || '';
            if (data.nombre_comercial !== undefined) supabasePayload.nombre_comercial = data.nombre_comercial || '';
            if (data.ruc !== undefined) supabasePayload.ruc = data.ruc || '';
            if (data.direccion !== undefined) supabasePayload.direccion = data.direccion || '';
            if (data.contacto !== undefined) supabasePayload.contacto = data.contacto || '';
            if (data.telefono !== undefined) supabasePayload.telefono = data.telefono || '';
            if (data.email !== undefined) supabasePayload.email = data.email || '';
            if (data.terminos_comerciales !== undefined) supabasePayload.terminos_comerciales = data.terminos_comerciales || '';
            if (data.vendedor_asignado !== undefined) supabasePayload.vendedor_asignado = data.vendedor_asignado || '';
            if (data.notas !== undefined) supabasePayload.notas = data.notas || '';
            if (data.logo !== undefined) supabasePayload.logo_url = data.logo || null;
            if (data.grupo_empresarial !== undefined) supabasePayload.grupo_empresarial = data.grupo_empresarial || null;
            if (data.grupo_empresarial_ruc !== undefined) supabasePayload.grupo_empresarial_ruc = data.grupo_empresarial_ruc || null;
            if (data.grupo_logo_url !== undefined) supabasePayload.grupo_logo_url = data.grupo_logo_url || null;
            if (data.proyecto !== undefined) supabasePayload.proyecto = data.proyecto || null;
            if (data.proyecto_codigo !== undefined) supabasePayload.proyecto_codigo = data.proyecto_codigo || null;
            if (data.tipo_cliente !== undefined) supabasePayload.tipo_cliente = data.tipo_cliente || 'corporativo';
            if (data.estado !== undefined) supabasePayload.estado = data.estado || 'activo';
            if (data.prioridad !== undefined) supabasePayload.prioridad = data.prioridad || 'medio';

            console.log(`📤 Enviando a Supabase:`, supabasePayload);
            const { error } = await supabase.from('clientes').update(supabasePayload).eq('nombre', razonSocial);

            if (error) {
                console.error("❌ Error updating cliente in Supabase:", error.message);
            } else {
                console.log(`✅ Cliente ${razonSocial} actualizado en Supabase`);
            }
        } catch (err) {
            console.error("❌ Error updating cliente:", err);
        }
    };

    const deleteCliente = async (razonSocial: string) => {
        setClientes(prev => {
            const newClientes = { ...prev };
            delete newClientes[razonSocial];
            return newClientes;
        });

        try {
            // Supabase usa "nombre" como clave primaria
            const { error } = await supabase.from('clientes').delete().eq('nombre', razonSocial);
            if (error) throw error;
            console.log("Cliente eliminado de Supabase:", razonSocial);
        } catch (err) {
            console.error("Error deleting cliente:", err);
        }
    };

    const deleteProveedor = async (nombre: string) => {
        setProveedores(prev => {
            const newProveedores = { ...prev };
            delete newProveedores[nombre];
            return newProveedores;
        });

        try {
            const { error } = await supabase.from('proveedores').delete().eq('nombre', nombre);
            if (error) throw error;
            console.log("Proveedor eliminado de Supabase:", nombre);
        } catch (err) {
            console.error("Error deleting proveedor:", err);
        }
    };

    // Normalizar nombre de cliente para búsqueda flexible
    const normalizarNombre = (nombre: string): string => {
        return nombre
            .toUpperCase()
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[.,]/g, '')
            .replace(/\bS\.?A\.?C\.?\b/gi, 'SAC')
            .replace(/\bS\.?A\.?\b/gi, 'SA')
            .replace(/\bE\.?I\.?R\.?L\.?\b/gi, 'EIRL');
    };

    // Buscar cliente por nombre (match flexible)
    const getClienteByNombre = (nombre: string): Cliente | null => {
        if (!nombre || nombre.trim() === '') return null;

        const nombreNormalizado = normalizarNombre(nombre);
        const clientesArray = Object.entries(clientes);

        // DEBUG: Log para identificar problemas de búsqueda
        // console.log(`[getClienteByNombre] Buscando: "${nombre}" -> normalizado: "${nombreNormalizado}"`);
        // console.log(`[getClienteByNombre] Total clientes: ${clientesArray.length}`);

        // 1. Buscar match exacto primero (razón social, nombre comercial, o grupo empresarial)
        for (const [key, cliente] of clientesArray) {
            if (normalizarNombre(key) === nombreNormalizado) {
                return cliente;
            }
            // También buscar por nombre comercial
            if (cliente.nombre_comercial && normalizarNombre(cliente.nombre_comercial) === nombreNormalizado) {
                return cliente;
            }
            // También buscar por grupo empresarial
            if (cliente.grupo_empresarial && normalizarNombre(cliente.grupo_empresarial) === nombreNormalizado) {
                return cliente;
            }
        }

        // 2. Buscar donde la razón social EMPIEZA con el nombre buscado
        // Ej: buscar "DHL" encuentra "DHL SUPPLY CHAIN..."
        for (const [key, cliente] of clientesArray) {
            const keyNorm = normalizarNombre(key);
            if (keyNorm.startsWith(nombreNormalizado)) {
                return cliente;
            }
            if (cliente.nombre_comercial) {
                const nombreComNorm = normalizarNombre(cliente.nombre_comercial);
                if (nombreComNorm.startsWith(nombreNormalizado)) {
                    return cliente;
                }
            }
            // También buscar por grupo empresarial
            if (cliente.grupo_empresarial) {
                const grupoNorm = normalizarNombre(cliente.grupo_empresarial);
                if (grupoNorm.startsWith(nombreNormalizado) || nombreNormalizado.startsWith(grupoNorm)) {
                    return cliente;
                }
            }
        }

        // 3. Buscar match parcial, priorizando el match más específico
        // Ordenar por longitud de nombre (más corto = más específico)
        const matches: { cliente: Cliente; score: number }[] = [];

        for (const [key, cliente] of clientesArray) {
            const keyNorm = normalizarNombre(key);

            // El nombre buscado está contenido en la razón social
            if (keyNorm.includes(nombreNormalizado)) {
                // Score más bajo = mejor match (diferencia de longitud menor)
                matches.push({ cliente, score: keyNorm.length - nombreNormalizado.length });
            }
            // La razón social está contenida en el nombre buscado
            else if (nombreNormalizado.includes(keyNorm)) {
                matches.push({ cliente, score: nombreNormalizado.length - keyNorm.length });
            }

            // También revisar nombre comercial
            if (cliente.nombre_comercial) {
                const nombreComNorm = normalizarNombre(cliente.nombre_comercial);
                if (nombreComNorm.includes(nombreNormalizado)) {
                    matches.push({ cliente, score: nombreComNorm.length - nombreNormalizado.length });
                } else if (nombreNormalizado.includes(nombreComNorm)) {
                    matches.push({ cliente, score: nombreNormalizado.length - nombreComNorm.length });
                }
            }

            // También revisar grupo empresarial (para buscar "Grupo Lar" y encontrar clientes de ese grupo)
            if (cliente.grupo_empresarial) {
                const grupoNorm = normalizarNombre(cliente.grupo_empresarial);
                if (grupoNorm === nombreNormalizado) {
                    // Match exacto con grupo empresarial - alta prioridad
                    matches.push({ cliente, score: 0 });
                } else if (grupoNorm.includes(nombreNormalizado)) {
                    matches.push({ cliente, score: grupoNorm.length - nombreNormalizado.length });
                } else if (nombreNormalizado.includes(grupoNorm)) {
                    matches.push({ cliente, score: nombreNormalizado.length - grupoNorm.length });
                }
            }
        }

        // Retornar el match más específico (menor score)
        if (matches.length > 0) {
            matches.sort((a, b) => a.score - b.score);
            return matches[0].cliente;
        }

        return null;
    };

    // Buscar logo de cliente (busca en el cliente, su grupo, o en clientes del mismo grupo)
    const getClienteLogo = (nombre: string): string | null => {
        const cliente = getClienteByNombre(nombre);
        if (!cliente) return null;

        // 1. Logo propio del cliente
        if (cliente.logo) return cliente.logo;

        // 2. Logo del grupo empresarial
        if (cliente.grupo_logo_url) return cliente.grupo_logo_url;

        // 3. Buscar logo en otros clientes del mismo grupo empresarial
        if (cliente.grupo_empresarial) {
            const grupoNorm = normalizarNombre(cliente.grupo_empresarial);
            for (const [, otroCliente] of Object.entries(clientes)) {
                if (otroCliente.grupo_empresarial &&
                    normalizarNombre(otroCliente.grupo_empresarial) === grupoNorm) {
                    if (otroCliente.logo) return otroCliente.logo;
                    if (otroCliente.grupo_logo_url) return otroCliente.grupo_logo_url;
                }
            }
        }

        return null;
    };

    // Buscar o crear cliente
    const findOrCreateCliente = async (nombre: string): Promise<Cliente | null> => {
        if (!nombre || nombre.trim() === '') return null;

        // Primero buscar si existe
        const clienteExistente = getClienteByNombre(nombre);
        if (clienteExistente) {
            console.log(`✅ Cliente encontrado: ${clienteExistente.razon_social}`);
            return clienteExistente;
        }

        // Si no existe, crear nuevo
        console.log(`📝 Creando nuevo cliente: ${nombre.toUpperCase()}`);
        try {
            const nuevoCliente = await createCliente({
                razon_social: nombre.toUpperCase(),
                estado: 'activo',
                prioridad: 'medio',
                tipo_cliente: 'corporativo',
            });
            return nuevoCliente;
        } catch (err) {
            console.error("Error creando cliente:", err);
            return null;
        }
    };

    // CRUD Cotizaciones
    const createCotizacion = async (data: Omit<Cotizacion, 'id' | 'created_at' | 'updated_at'>): Promise<Cotizacion> => {
        const now = new Date().toISOString();
        const newCotizacion: Cotizacion = {
            ...data,
            id: `COT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
            created_at: now,
            updated_at: now,
        };

        setCotizaciones(prev => [newCotizacion, ...prev]);

        try {
            const { error } = await supabase.from('cotizaciones').insert(newCotizacion);
            if (error) throw error;
            console.log("Cotización creada en Supabase:", newCotizacion.id);
        } catch (err) {
            console.error("Error creating cotizacion:", err);
        }

        return newCotizacion;
    };

    const updateCotizacion = async (id: string, data: Partial<Cotizacion>) => {
        const now = new Date().toISOString();
        setCotizaciones(prev => prev.map(c => c.id === id ? { ...c, ...data, updated_at: now } : c));

        try {
            const { error } = await supabase.from('cotizaciones').update({ ...data, updated_at: now }).eq('id', id);
            if (error) throw error;
            console.log("Cotización actualizada en Supabase:", id);
        } catch (err) {
            console.error("Error updating cotizacion:", err);
        }
    };

    const deleteCotizacion = async (id: string) => {
        setCotizaciones(prev => prev.filter(c => c.id !== id));

        try {
            const { error } = await supabase.from('cotizaciones').delete().eq('id', id);
            if (error) throw error;
            console.log("Cotización eliminada de Supabase:", id);
        } catch (err) {
            console.error("Error deleting cotizacion:", err);
        }
    };

    const getCotizacionesByProveedor = (proveedorId: string): Cotizacion[] => {
        return cotizaciones.filter(c => c.proveedor_id === proveedorId);
    };

    // CRUD Histórico de Precios
    const createHistoricoPrecio = async (data: Omit<HistoricoPrecio, 'id' | 'created_at' | 'updated_at'>): Promise<HistoricoPrecio> => {
        const now = new Date().toISOString();
        const newHistorico: HistoricoPrecio = {
            ...data,
            id: `HIST-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
            created_at: now,
            updated_at: now,
        };

        setHistoricoPrecio(prev => [newHistorico, ...prev]);

        try {
            const { error } = await supabase.from('historico_precios').insert({
                id: newHistorico.id,
                proveedor_id: newHistorico.proveedor_id,
                producto_base: newHistorico.producto_base,
                descripcion: newHistorico.descripcion,
                variante: newHistorico.variante,
                precio_unitario: newHistorico.precio_unitario,
                incluye_igv: newHistorico.incluye_igv,
                cantidad_referencia: newHistorico.cantidad_referencia,
                tiempo_produccion_dias: newHistorico.tiempo_produccion_dias,
                tiempo_entrega_dias: newHistorico.tiempo_entrega_dias,
                pedido_origen_id: newHistorico.pedido_origen_id,
                cotizacion_origen_id: newHistorico.cotizacion_origen_id,
                fecha_cotizacion: newHistorico.fecha_cotizacion,
                created_at: now,
                updated_at: now,
            });
            if (error) throw error;
            console.log("Histórico de precio creado en Supabase:", newHistorico.id);
        } catch (err) {
            console.error("Error creating histórico de precio:", err);
        }

        return newHistorico;
    };

    const getHistoricoPorProveedor = (proveedorId: string): HistoricoPrecio[] => {
        return historicoPrecio
            .filter(h => h.proveedor_id === proveedorId)
            .sort((a, b) => new Date(b.fecha_cotizacion).getTime() - new Date(a.fecha_cotizacion).getTime());
    };

    const getHistoricoPorProductoBase = (proveedorId: string, productoBase: string): HistoricoPrecio[] => {
        return historicoPrecio
            .filter(h => h.proveedor_id === proveedorId && h.producto_base === productoBase)
            .sort((a, b) => new Date(b.fecha_cotizacion).getTime() - new Date(a.fecha_cotizacion).getTime());
    };

    const getHistoricoReciente = (proveedorId: string, productoBase: string, diasAtras: number = 90): HistoricoPrecio[] => {
        const ahora = new Date();
        const haceXDias = new Date(ahora.getTime() - diasAtras * 24 * 60 * 60 * 1000);

        return historicoPrecio
            .filter(h =>
                h.proveedor_id === proveedorId &&
                h.producto_base === productoBase &&
                new Date(h.fecha_cotizacion) >= haceXDias
            )
            .sort((a, b) => new Date(b.fecha_cotizacion).getTime() - new Date(a.fecha_cotizacion).getTime());
    };

    // CRUD Líneas de Pedido
    const createLineaPedido = async (pedidoId: string, lineData: Omit<LineaPedido, 'id' | 'created_at' | 'updated_at'>): Promise<LineaPedido> => {
        const now = new Date().toISOString();
        const newLinea: LineaPedido = {
            ...lineData,
            id: `LIN-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
            created_at: now,
            updated_at: now,
        };

        setLineasPedido(prev => [newLinea, ...prev]);

        try {
            const { error } = await supabase.from('lineas_pedido').insert({
                id: newLinea.id,
                pedido_id: pedidoId,
                // FASE 1: Usar nuevas columnas
                item: newLinea.item,
                detalle: newLinea.detalle,
                precio: newLinea.precio,
                // LEGACY: producto es NOT NULL en DB, enviar item para compatibilidad
                producto: newLinea.item || 'Sin especificar',
                created_at: now,
                updated_at: now,
            });
            if (error) throw error;
            console.log("Línea de pedido creada en Supabase:", newLinea.id);
        } catch (err) {
            console.error("Error creating línea de pedido:", err);
        }

        return newLinea;
    };

    const updateLineaPedido = async (lineaId: string, data: Partial<LineaPedido>) => {
        const now = new Date().toISOString();
        setLineasPedido(prev => prev.map(l => l.id === lineaId ? { ...l, ...data, updated_at: now } : l));
        try {
            const { error } = await supabase.from('lineas_pedido').update({ ...data, updated_at: now }).eq('id', lineaId);
            if (error) throw error;
            console.log("Línea de pedido actualizada en Supabase:", lineaId);
        } catch (err) {
            console.error("Error updating línea de pedido:", err);
        }
    };

    const deleteLineaPedido = async (lineaId: string) => {
        setLineasPedido(prev => prev.filter(l => l.id !== lineaId));
        try {
            const { error } = await supabase.from('lineas_pedido').delete().eq('id', lineaId);
            if (error) throw error;
            console.log("Línea de pedido eliminada de Supabase:", lineaId);
        } catch (err) {
            console.error("Error deleting línea de pedido:", err);
        }
    };

    const getLineasPedido = (pedidoId: string): LineaPedido[] => {
        return lineasPedido.filter(l => l.pedido_id === pedidoId);
    };

    // CRUD Cambios de Pedido
    const createCambioPedido = async (cambioData: Omit<CambioPedido, 'id' | 'created_at'>): Promise<CambioPedido> => {
        const now = new Date().toISOString();
        const newCambio: CambioPedido = {
            ...cambioData,
            id: `CAM-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
            created_at: now,
        };

        setCambiosPedido(prev => [newCambio, ...prev]);

        try {
            const { error } = await supabase.from('cambios_pedido').insert({
                id: newCambio.id,
                pedido_id: newCambio.pedido_id,
                linea_id: newCambio.linea_id,
                campo_modificado: newCambio.campo_modificado,
                valor_anterior: newCambio.valor_anterior,
                valor_nuevo: newCambio.valor_nuevo,
                numero_cambio: newCambio.numero_cambio,
                created_at: now,
            });
            if (error) throw error;
            console.log("Cambio de pedido registrado en Supabase:", newCambio.id);
        } catch (err) {
            console.error("Error creating cambio de pedido:", err);
        }

        return newCambio;
    };

    const getCambiosPedido = (pedidoId: string): CambioPedido[] => {
        return cambiosPedido.filter(c => c.pedido_id === pedidoId).sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    };

    const addPayment = async (pedidoId: string, monto: number, nota: string = 'Pago registrado') => {
        const newPaymentLocal: Payment = {
            id: `PAY-${Date.now()}`,
            pedidoId,
            monto,
            fecha: new Date().toISOString(),
            nota
        };
        setPayments(prev => [...prev, newPaymentLocal]);
        setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, pagado: (p.pagado || 0) + monto } : p));
        try {
            await supabase.from('pagos').insert({
                pedido_id: pedidoId,
                monto,
                nota,
                fecha: new Date().toISOString()
            });
            const { data: pedido } = await supabase.from('pedidos').select('pagado').eq('id', pedidoId).single();
            await supabase.from('pedidos').update({ pagado: (pedido?.pagado || 0) + monto }).eq('id', pedidoId);
        } catch (err) {
            console.error("Error adding payment:", err);
        }
    };

    // Búsqueda de Items
    const getItemsUnicos = (): string[] => {
        const items = new Set(lineasPedido.map(l => l.item.toLowerCase()));
        return Array.from(items).sort();
    };

    const getItemsByNombre = (nombre: string): ItemCotizacion[] => {
        const search = nombre.toLowerCase();
        return itemsCotizacion.filter(ic => ic.item.toLowerCase().includes(search));
    };

    const getProveedoresPorItem = (item: string): ItemCotizacion[] => {
        return itemsCotizacion.filter(ic => ic.item.toLowerCase() === item.toLowerCase());
    };

    // ============================================
    // CRUD Producciones
    // ============================================
    const createProduccion = async (data: Omit<Produccion, 'id' | 'created_at' | 'updated_at'>): Promise<Produccion> => {
        const now = new Date().toISOString();
        const newProduccion: Produccion = {
            ...data,
            id: `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
            created_at: now,
            updated_at: now,
        };

        setProducciones(prev => [newProduccion, ...prev]);

        try {
            const { error } = await supabase.from('producciones').insert({
                id: newProduccion.id,
                pedido_id: newProduccion.pedido_id,
                cotizacion_id: newProduccion.cotizacion_id,
                proveedor_id: newProduccion.proveedor_id,
                producto_base: newProduccion.producto_base,
                variante: newProduccion.variante,
                descripcion: newProduccion.descripcion,
                cantidad_aprobada: newProduccion.cantidad_aprobada,
                precio_unitario: newProduccion.precio_unitario,
                precio_total: newProduccion.precio_total,
                incluye_igv: newProduccion.incluye_igv,
                fecha_aprobacion: newProduccion.fecha_aprobacion,
                fecha_envio_produccion: newProduccion.fecha_envio_produccion,
                fecha_compromiso: newProduccion.fecha_compromiso,
                fecha_entrega_real: newProduccion.fecha_entrega_real,
                prueba_color: newProduccion.prueba_color,
                muestra_fisica: newProduccion.muestra_fisica,
                observaciones_qc: newProduccion.observaciones_qc,
                estado: newProduccion.estado,
                responsable: newProduccion.responsable,
                notas: newProduccion.notas,
                created_at: now,
                updated_at: now,
            });
            if (error) throw error;
            console.log("🏭 Producción creada en Supabase:", newProduccion.id);

            // Actualizar estado del pedido a en_produccion si está en cotizacion o aprobado
            const pedido = pedidos.find(p => p.id === data.pedido_id);
            if (pedido && (pedido.estado === 'cotizacion' || pedido.estado === 'aprobado')) {
                await updatePedido(data.pedido_id, { estado: 'en_produccion' });
                console.log(`📦 Pedido ${data.pedido_id} actualizado a en_produccion`);
            }
        } catch (err) {
            console.error("Error creating produccion:", err);
        }

        return newProduccion;
    };

    const updateProduccion = async (id: string, data: Partial<Produccion>) => {
        const now = new Date().toISOString();
        setProducciones(prev => prev.map(p => p.id === id ? { ...p, ...data, updated_at: now } : p));

        try {
            const { error } = await supabase.from('producciones').update({ ...data, updated_at: now }).eq('id', id);
            if (error) throw error;
            console.log("🏭 Producción actualizada en Supabase:", id);

            // Si todas las producciones del pedido están entregadas, actualizar pedido
            const produccion = producciones.find(p => p.id === id);
            if (produccion && data.estado === 'entregado') {
                const produccionesPedido = producciones.filter(p => p.pedido_id === produccion.pedido_id);
                const todasEntregadas = produccionesPedido.every(p =>
                    p.id === id ? data.estado === 'entregado' : p.estado === 'entregado'
                );
                if (todasEntregadas) {
                    await updatePedido(produccion.pedido_id, { estado: 'entregado' });
                    console.log(`📦 Pedido ${produccion.pedido_id} actualizado a entregado (todas las producciones completadas)`);
                }
            }
        } catch (err) {
            console.error("Error updating produccion:", err);
        }
    };

    const deleteProduccion = async (id: string) => {
        setProducciones(prev => prev.filter(p => p.id !== id));

        try {
            const { error } = await supabase.from('producciones').delete().eq('id', id);
            if (error) throw error;
            console.log("🏭 Producción eliminada de Supabase:", id);
        } catch (err) {
            console.error("Error deleting produccion:", err);
        }
    };

    const getProduccionesByPedido = (pedidoId: string): Produccion[] => {
        return producciones
            .filter(p => p.pedido_id === pedidoId)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    };

    const getProduccionesByProveedor = (proveedorId: string): Produccion[] => {
        return producciones
            .filter(p => p.proveedor_id === proveedorId)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    };

    // ============================================
    // CRUD Movimientos Logísticos
    // ============================================
    const createMovimientoLogistico = async (data: Omit<MovimientoLogistico, 'seccion'>): Promise<MovimientoLogistico> => {
        const newMovimiento: MovimientoLogistico = {
            ...data,
            seccion: 'MOVIMIENTO_LOGISTICO',
        };

        setMovimientosLogisticos(prev => [newMovimiento, ...prev]);

        try {
            const { error } = await supabase.from('movimientos_logisticos').insert({
                id: newMovimiento.id,
                fecha: newMovimiento.fecha,
                tipo: newMovimiento.tipo,
                cliente: newMovimiento.cliente,
                proveedor: newMovimiento.proveedor,
                pedido_id: newMovimiento.pedido_id,
                detalle: newMovimiento.detalle,
                estado: newMovimiento.estado,
                observaciones: newMovimiento.observaciones,
                costo_movilidad: newMovimiento.costo_movilidad || 0,
                created_at: newMovimiento.created_at,
                updated_at: newMovimiento.updated_at,
            });
            if (error) {
                console.warn("⚠️ Error guardando movimiento en Supabase (tabla puede no existir aún):", error.message);
            } else {
                console.log("🚚 Movimiento logístico creado:", newMovimiento.id);
            }
        } catch (err) {
            console.error("Error creating movimiento logístico:", err);
        }

        return newMovimiento;
    };

    const getMovimientosByFecha = (fecha: string): MovimientoLogistico[] => {
        return movimientosLogisticos
            .filter(m => m.fecha === fecha)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    };

    const getMovimientosByCliente = (cliente: string): MovimientoLogistico[] => {
        return movimientosLogisticos
            .filter(m => m.cliente?.toLowerCase() === cliente.toLowerCase())
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    };

    // ============================================
    // CRUD Rendiciones
    // ============================================
    const createRendicion = async (data: Omit<Rendicion, 'seccion'>): Promise<Rendicion> => {
        const newRendicion: Rendicion = {
            ...data,
            seccion: 'RENDICION_PAGO',
        };

        setRendiciones(prev => [newRendicion, ...prev]);

        try {
            const { error } = await supabase.from('rendiciones').insert({
                id: newRendicion.id,
                fecha: newRendicion.fecha,
                tipo: newRendicion.tipo,
                cliente: newRendicion.cliente,
                proveedor: newRendicion.proveedor,
                pedido_id: newRendicion.pedido_id,
                produccion_id: newRendicion.produccion_id,
                monto: newRendicion.monto,
                moneda: newRendicion.moneda,
                detalle: newRendicion.detalle,
                estado: newRendicion.estado,
                observaciones: newRendicion.observaciones,
                tiene_comprobante: newRendicion.tiene_comprobante,
                tipo_comprobante: newRendicion.tipo_comprobante,
                numero_comprobante: newRendicion.numero_comprobante,
                created_at: newRendicion.created_at,
                updated_at: newRendicion.updated_at,
            });
            if (error) {
                console.warn("⚠️ Error guardando rendición en Supabase (tabla puede no existir aún):", error.message);
            } else {
                console.log("💰 Rendición creada:", newRendicion.id);
            }
        } catch (err) {
            console.error("Error creating rendición:", err);
        }

        return newRendicion;
    };

    const getRendicionesByFecha = (fecha: string): Rendicion[] => {
        return rendiciones
            .filter(r => r.fecha === fecha)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    };

    const getRendicionesByCliente = (cliente: string): Rendicion[] => {
        return rendiciones
            .filter(r => r.cliente?.toLowerCase() === cliente.toLowerCase())
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    };

    const updateRendicion = async (id: string, data: Partial<Rendicion>): Promise<void> => {
        const updatedData = { ...data, updated_at: new Date().toISOString() };
        setRendiciones(prev => prev.map(r => r.id === id ? { ...r, ...updatedData } : r));

        try {
            const { error } = await supabase.from('rendiciones').update(updatedData).eq('id', id);
            if (error) console.warn("Error actualizando rendición:", error.message);
            else console.log("💰 Rendición actualizada:", id);
        } catch (err) {
            console.error("Error updating rendición:", err);
        }
    };

    const deleteRendicion = async (id: string): Promise<void> => {
        setRendiciones(prev => prev.filter(r => r.id !== id));

        try {
            const { error } = await supabase.from('rendiciones').delete().eq('id', id);
            if (error) console.warn("Error eliminando rendición:", error.message);
            else console.log("🗑️ Rendición eliminada:", id);
        } catch (err) {
            console.error("Error deleting rendición:", err);
        }
    };

    // ============================================
    // CRUD Movimientos Logísticos (update/delete)
    // ============================================
    const updateMovimientoLogistico = async (id: string, data: Partial<MovimientoLogistico>): Promise<void> => {
        const updatedData = { ...data, updated_at: new Date().toISOString() };
        setMovimientosLogisticos(prev => prev.map(m => m.id === id ? { ...m, ...updatedData } : m));

        try {
            const { error } = await supabase.from('movimientos_logisticos').update(updatedData).eq('id', id);
            if (error) console.warn("Error actualizando movimiento:", error.message);
            else console.log("🚚 Movimiento actualizado:", id);
        } catch (err) {
            console.error("Error updating movimiento:", err);
        }
    };

    const deleteMovimientoLogistico = async (id: string): Promise<void> => {
        setMovimientosLogisticos(prev => prev.filter(m => m.id !== id));

        try {
            const { error } = await supabase.from('movimientos_logisticos').delete().eq('id', id);
            if (error) console.warn("Error eliminando movimiento:", error.message);
            else console.log("🗑️ Movimiento eliminado:", id);
        } catch (err) {
            console.error("Error deleting movimiento:", err);
        }
    };

    // ============================================
    // CRUD Eventos de Producción
    // ============================================
    const createEventoProduccion = async (data: Omit<EventoProduccion, 'seccion'>): Promise<EventoProduccion> => {
        const newEvento: EventoProduccion = {
            ...data,
            seccion: 'PRODUCCION',
        };

        setEventosProduccion(prev => [newEvento, ...prev]);

        try {
            const { error } = await supabase.from('eventos_produccion').insert({
                id: newEvento.id,
                fecha: newEvento.fecha,
                tipo: newEvento.tipo,
                cliente: newEvento.cliente,
                proveedor: newEvento.proveedor,
                pedido_id: newEvento.pedido_id,
                producto: newEvento.producto,
                cantidad: newEvento.cantidad,
                especificaciones: newEvento.especificaciones,
                precio_unitario: newEvento.precio_unitario,
                precio_total: newEvento.precio_total,
                estado: newEvento.estado,
                observaciones: newEvento.observaciones,
                created_at: newEvento.created_at,
                updated_at: newEvento.updated_at,
            });
            if (error) {
                console.warn("⚠️ Error guardando evento producción en Supabase:", error.message);
            } else {
                console.log("🏭 Evento producción creado:", newEvento.id);
            }
        } catch (err) {
            console.error("Error creating evento producción:", err);
        }

        return newEvento;
    };

    const updateEventoProduccion = async (id: string, data: Partial<EventoProduccion>): Promise<void> => {
        const updatedData = { ...data, updated_at: new Date().toISOString() };
        setEventosProduccion(prev => prev.map(e => e.id === id ? { ...e, ...updatedData } : e));

        try {
            const { error } = await supabase.from('eventos_produccion').update(updatedData).eq('id', id);
            if (error) console.warn("Error actualizando evento producción:", error.message);
            else console.log("🏭 Evento producción actualizado:", id);
        } catch (err) {
            console.error("Error updating evento producción:", err);
        }
    };

    const deleteEventoProduccion = async (id: string): Promise<void> => {
        setEventosProduccion(prev => prev.filter(e => e.id !== id));

        try {
            const { error } = await supabase.from('eventos_produccion').delete().eq('id', id);
            if (error) console.warn("Error eliminando evento producción:", error.message);
            else console.log("🗑️ Evento producción eliminado:", id);
        } catch (err) {
            console.error("Error deleting evento producción:", err);
        }
    };

    const getEventosProduccionByFecha = (fecha: string): EventoProduccion[] => {
        return eventosProduccion
            .filter(e => e.fecha === fecha)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    };

    const exportBackup = () => {
        const backup = {
            meta: { version: 1, date: new Date().toISOString(), type: 'backup' },
            clientes, proveedores, payments, pedidos
        };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_logistica_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const uploadLogo = async (file: File, path: string): Promise<string | null> => {
        try {
            // Sanitizar nombre de archivo (quitar espacios y caracteres raros)
            const sanitizedPath = path.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
            const fileName = `${sanitizedPath}-${Date.now()}.${file.name.split('.').pop()}`;

            const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, file);

            if (uploadError) {
                console.error("Supabase Storage Error:", uploadError);
                throw uploadError;
            }

            const { data } = supabase.storage.from('logos').getPublicUrl(fileName);
            return data.publicUrl;
        } catch (err) {
            console.error("Error completo en uploadLogo:", err);
            return null;
        }
    };

    const loadDatabase = async (files: FileList | File[]) => {
        setIsLoading(true);
        setError(null);
        try {
            const fileList = Array.from(files);
            console.log(`📂 Archivos recibidos: ${fileList.map(f => f.name).join(', ')}`);
            const jsonlFile = fileList.find(f => f.name.toLowerCase().endsWith('.jsonl'));
            const dbFile = fileList.find(f => f.name.toLowerCase().endsWith('.db'));
            const backupFile = fileList.find(f => f.name.toLowerCase().endsWith('.json'));

            if (backupFile) {
                console.log(`📄 Procesando archivo de backup: ${backupFile.name}`);
                const text = await backupFile.text();
                console.log(`📝 Contenido del archivo (primeros 500 caracteres): ${text.slice(0, 500)}`);
                const json = JSON.parse(text);
                console.log(`✅ JSON parseado correctamente. Meta type: ${json.meta?.type}`);

                if (json.meta?.type === 'backup') {
                    console.log(`🎯 Es un archivo de backup válido`);

                    // PASO 0: Primero, ver qué estructura tiene la tabla
                    console.log(`🔍 Inspeccionando estructura de tabla 'clientes' en Supabase...`);
                    const { data: sampleData, error: sampleError } = await supabase.from('clientes').select('*').limit(1);
                    if (sampleError) {
                        console.error(`❌ Error al inspeccionar tabla:`, sampleError);
                    } else if (sampleData && sampleData.length > 0) {
                        console.log(`✅ Estructura de tabla clientes:`, Object.keys(sampleData[0]));
                        console.log(`📦 Ejemplo de dato:`, JSON.stringify(sampleData[0], null, 2));
                    } else {
                        console.log(`ℹ️ Tabla clientes está vacía`);
                    }

                    // ✅ AHORA SABEMOS QUE LA TABLA USA "nombre" COMO CLAVE, NO "razon_social"
                    console.log(`🔑 Estructura real de Supabase usa: nombre, ruc, direccion, contacto, telefono, email, notas, logo_url, created_at`);

                    // PASO 1: Limpiar Supabase de clientes anteriores
                    console.log(`🧹 Limpiando tabla clientes en Supabase...`);
                    const { error: deleteError } = await supabase.from('clientes').delete().neq('nombre', '');
                    if (deleteError) {
                        console.warn(`⚠️ Error al limpiar: ${deleteError.message}`);
                    } else {
                        console.log(`✅ Tabla limpiada`);
                    }

                    // Prepare clientes data - mapear razon_social del backup a "nombre" en Supabase
                    const clientesMap: Record<string, any> = {};
                    const supabseInserts: any[] = [];

                    if (json.clientes) {
                        console.log(`👥 Encontrados ${Object.keys(json.clientes).length} clientes en el backup`);
                        for (const [, cliente] of Object.entries(json.clientes)) {
                            const c = cliente as any;
                            const key = c.razon_social || c.id || 'Sin Nombre';
                            clientesMap[key] = c;

                            // Preparar payload para Supabase con todos los campos
                            supabseInserts.push({
                                nombre: c.razon_social || c.nombre_comercial || 'Sin Nombre',
                                nombre_comercial: c.nombre_comercial || '',
                                ruc: c.ruc || '',
                                direccion: c.direccion || '',
                                contacto: c.contacto || '',
                                telefono: c.telefono || '',
                                email: c.email || '',
                                notas: c.notas || '',
                                logo_url: c.logo || null,
                                grupo_logo_url: c.grupo_logo_url || null,
                                grupo_empresarial: c.grupo_empresarial || null,
                                grupo_empresarial_ruc: c.grupo_empresarial_ruc || null,
                                proyecto: c.proyecto || null,
                                proyecto_codigo: c.proyecto_codigo || null,
                                tipo_cliente: c.tipo_cliente || 'corporativo',
                                estado: c.estado || 'activo',
                                prioridad: c.prioridad || 'medio',
                            });
                            console.log(`  └─ ${key}: ${c.nombre_comercial || 'Sin nombre comercial'} (grupo: ${c.grupo_empresarial || 'Sin grupo'})`);
                        }
                    } else {
                        console.warn(`⚠️ No se encontró la clave 'clientes' en el backup`);
                    }

                    console.log(`💾 Estableciendo ${Object.keys(clientesMap).length} clientes en estado local...`);
                    setClientes(clientesMap); // Don't merge - replace completely
                    setProveedores(prev => ({ ...prev, ...json.proveedores }));
                    if (json.pedidos) setPedidos(json.pedidos);
                    if (json.payments) setPayments(json.payments);

                    // PASO 2: Sync loaded clientes to Supabase (usando INSERT porque limpiamos antes)
                    if (supabseInserts.length > 0) {
                        console.log(`📤 Insertando ${supabseInserts.length} clientes a Supabase...`);

                        for (const payload of supabseInserts) {
                            try {
                                console.log(`📤 Insertando: ${payload.nombre}`);
                                const { error } = await supabase.from('clientes').insert([payload]);
                                if (error) {
                                    console.error(`❌ Error inserting ${payload.nombre}:`, error.message);
                                } else {
                                    console.log(`✅ Cliente ${payload.nombre} insertado`);
                                }
                            } catch (err) {
                                console.error(`❌ Error syncing ${payload.nombre}:`, err);
                            }
                        }
                        console.log(`✅ Todos los clientes fueron insertados en Supabase`);

                        // PASO 3: Refetch from Supabase to verify persistence
                        console.log('🔄 Verificando datos en Supabase...');
                        const { data: verifyData, error: verifyError } = await supabase.from('clientes').select('*');
                        if (verifyError) {
                            console.error('❌ Error verificando clientes:', verifyError);
                        } else {
                            console.log(`✅ Verificación: ${verifyData?.length || 0} clientes en Supabase`);
                            if (verifyData && verifyData.length > 0) {
                                console.log('📋 Clientes en Supabase:', verifyData.map((c: any) => c.nombre));
                            }
                        }
                    }

                    setDataSource('supabase');
                } else {
                    console.warn(`⚠️ El archivo no es un backup válido. meta.type = ${json.meta?.type}`);
                }
            } else {
                console.warn(`⚠️ No se encontró archivo JSON en los archivos cargados`);
            }

            if (dbFile) {
                const SQL = await initSqlJs({ locateFile: (f: string) => `https://sql.js.org/dist/${f}` });
                const database = new SQL.Database(new Uint8Array(await dbFile.arrayBuffer()));
                setDb(database);
                setDataSource('db');
            } else if (jsonlFile) {
                const text = await jsonlFile.text();
                const allEvents: TraceEvent[] = text.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
                allEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                setEvents(allEvents);
                console.log('[DEBUG] Total events parsed from file:', allEvents.length);

                const { pedidos: parsed, payments: pays } = parseEventsToPedidos(allEvents);
                console.log('[DEBUG] Pedidos parsed from file:', parsed.map(p => ({ id: p.id, cliente: p.cliente, descripcion: p.descripcion?.slice(0, 50), vendedora: p.vendedora, updated_at: p.updated_at })));

                // SMART MERGE: Timestamp Wins - El más reciente gana
                setPedidos(prev => {
                    if (prev.length === 0) return parsed;
                    const existingMap = new Map(prev.map(p => [p.id, p]));
                    const merged: Pedido[] = [];
                    const seenIds = new Set<string>();

                    // Process parsed (from file)
                    for (const p of parsed) {
                        seenIds.add(p.id);
                        const existing = existingMap.get(p.id);
                        if (existing) {
                            const fileTime = new Date(p.updated_at || 0).getTime();
                            const existingTime = new Date(existing.updated_at || 0).getTime();
                            // File is strictly newer -> use file data
                            if (fileTime > existingTime) {
                                merged.push(p);
                            } else {
                                // Existing is newer or equal -> keep existing
                                merged.push(existing);
                            }
                        } else {
                            // New order from file
                            merged.push(p);
                        }
                    }

                    // Keep any existing orders not in the file
                    for (const existing of prev) {
                        if (!seenIds.has(existing.id)) {
                            merged.push(existing);
                        }
                    }

                    return merged;
                });

                setPayments(prev => {
                    const existIds = new Set(prev.map(py => py.id));
                    const newPays = pays.filter(py => !existIds.has(py.id));
                    return [...prev, ...newPays];
                });

                setDataSource('supabase');

                // Sincronizar con Supabase en segundo plano
                supabase.from('pedidos').upsert(parsed.map(p => ({
                    id: p.id,
                    vendedora: p.vendedora,
                    cliente_nombre: p.cliente,
                    descripcion: p.descripcion,
                    estado: p.estado,
                    precio: p.precio || 0,
                    pagado: p.pagado || 0,
                    rq_numero: p.rq_numero,
                    created_at: p.created_at,
                    updated_at: p.updated_at
                }))).then(({ error }) => {
                    if (error) console.warn("Supabase Sync Error:", error);
                });
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Error loading file';
            console.error('❌ Error en loadDatabase:', errorMsg);
            setError(errorMsg);
        } finally {
            console.log('✅ loadDatabase completado');
            setIsLoading(false);
        }
    };

    return (
        <DatabaseContext.Provider value={{
            db, events, pedidos, payments, proveedores, clientes, cotizaciones, itemsCotizacion, lineasPedido, historicoPrecio, pkls,
            setPedidos,
            // CRUD PKLs
            updatePKL,
            updatePKLTask,
            // CRUD Pedidos
            createPedido, updatePedido, deletePedido, deletePedidos,
            // Pagos
            addPayment,
            // CRUD Clientes/Proveedores
            createCliente, createProveedor, updateProveedor, updateCliente, deleteCliente, deleteProveedor,
            findOrCreateCliente, getClienteByNombre, getClienteLogo,
            // CRUD Cotizaciones
            createCotizacion, updateCotizacion, deleteCotizacion, getCotizacionesByProveedor,
            // CRUD Histórico de Precios
            createHistoricoPrecio, getHistoricoPorProveedor, getHistoricoPorProductoBase, getHistoricoReciente,
            // CRUD Líneas de Pedido
            createLineaPedido, updateLineaPedido, deleteLineaPedido, getLineasPedido,
            // CRUD Cambios de Pedido
            createCambioPedido, getCambiosPedido,
            // Búsqueda de Items
            getItemsUnicos, getItemsByNombre, getProveedoresPorItem,
            // CRUD Producciones
            producciones, createProduccion, updateProduccion, deleteProduccion, getProduccionesByPedido, getProduccionesByProveedor,
            // CRUD Movimientos Logísticos
            movimientosLogisticos, createMovimientoLogistico, updateMovimientoLogistico, deleteMovimientoLogistico, getMovimientosByFecha, getMovimientosByCliente,
            // CRUD Rendiciones
            rendiciones, createRendicion, updateRendicion, deleteRendicion, getRendicionesByFecha, getRendicionesByCliente,
            // CRUD Eventos de Producción
            eventosProduccion, createEventoProduccion, updateEventoProduccion, deleteEventoProduccion, getEventosProduccionByFecha,
            // Filtros y estado
            selectedStateFilter, setSelectedStateFilter, isLoading, error, dataSource,
            loadDatabase, resetDatabase, exportBackup, uploadLogo
        }}>
            {children}
        </DatabaseContext.Provider>
    );
}

export function useDatabase() {
    const context = useContext(DatabaseContext);
    if (!context) throw new Error('useDatabase must be used within a DatabaseProvider');
    return context;
}
