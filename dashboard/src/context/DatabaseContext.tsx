import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import initSqlJs, { type Database } from 'sql.js';
import type { Pedido, Payment, Proveedor, Cliente, Cotizacion } from '../types';
import { supabase } from '../supabaseClient';
import { type TraceEvent, parseEventsToPedidos } from '../utils/parsers';

interface DatabaseContextType {
    db: Database | null;
    events: TraceEvent[];
    pedidos: Pedido[];
    payments: Payment[];
    proveedores: Record<string, Proveedor>;
    clientes: Record<string, Cliente>;
    cotizaciones: Cotizacion[];
    setPedidos: React.Dispatch<React.SetStateAction<Pedido[]>>;

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
                        rq_numero: p.rq_numero || '',
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

                // Cargar cotizaciones
                const { data: cotizacionesData } = await supabase.from('cotizaciones').select('*');
                if (cotizacionesData) {
                    setCotizaciones(cotizacionesData as Cotizacion[]);
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
        const newPedido: Pedido = {
            ...data,
            id: `PED-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
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
                rq_numero: newPedido.rq_numero,
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
                console.error("❌ Detalles del error:", JSON.stringify(error, null, 2));
                throw error;
            }
            console.log("✅ Cliente creado en Supabase:", razonSocialKey);
            console.log("✅ Respuesta completa de Supabase - Sin datos porque es upsert", { error });
        } catch (err) {
            console.error("❌ Error creating cliente:", err);
            console.error("❌ Detalles completos del error:", JSON.stringify(err, null, 2));
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
                incluye_igv: fullData.incluye_igv,
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
            if (data.ruc !== undefined) supabasePayload.ruc = data.ruc || '';
            if (data.direccion !== undefined) supabasePayload.direccion = data.direccion || '';
            if (data.contacto !== undefined) supabasePayload.contacto = data.contacto || '';
            if (data.telefono !== undefined) supabasePayload.telefono = data.telefono || '';
            if (data.email !== undefined) supabasePayload.email = data.email || '';
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
            db, events, pedidos, payments, proveedores, clientes, cotizaciones,
            setPedidos,
            // CRUD Pedidos
            createPedido, updatePedido, deletePedido, deletePedidos,
            // Pagos
            addPayment,
            // CRUD Clientes/Proveedores
            createCliente, createProveedor, updateProveedor, updateCliente, deleteCliente, deleteProveedor,
            // CRUD Cotizaciones
            createCotizacion, updateCotizacion, deleteCotizacion, getCotizacionesByProveedor,
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
