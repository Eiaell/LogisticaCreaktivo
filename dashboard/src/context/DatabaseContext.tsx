import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import initSqlJs, { type Database } from 'sql.js';
import type { Pedido, Payment, Proveedor, Cliente } from '../types';
import { supabase } from '../supabaseClient';

// Event from JSONL trace files
export interface TraceEvent {
    timestamp: string;
    action: string;
    actor: string;
    context: {
        tipo?: string;
        proveedor?: string;
        producto?: string;
        cantidad?: number;
        cliente?: string;
        costoTotal?: number;
        adelanto?: number;
        costo?: number;
        origen?: string;
        destino?: string;
        nuevoEstado?: string;
        precio?: number;
        [key: string]: unknown;
    };
    artifacts: string[];
    caseId?: string;
}

interface DatabaseContextType {
    db: Database | null;
    events: TraceEvent[];
    pedidos: Pedido[];
    payments: Payment[];
    proveedores: Record<string, Proveedor>;
    clientes: Record<string, Cliente>;
    setPedidos: React.Dispatch<React.SetStateAction<Pedido[]>>;
    updatePedido: (id: string, changes: Partial<Pedido>) => Promise<void>;
    addPayment: (pedidoId: string, monto: number, nota?: string) => Promise<void>;
    updateProveedor: (nombre: string, data: Partial<Proveedor>) => Promise<void>;
    updateCliente: (nombre: string, data: Partial<Cliente>) => Promise<void>;

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

function normalizeText(text: string): string {
    if (!text) return '';
    return text.trim().replace(/^\w/, c => c.toUpperCase());
}

function parseEventsToPedidos(events: TraceEvent[]): { pedidos: Pedido[], payments: Payment[] } {
    const casesMap = new Map<string, Pedido>();
    const initialPayments: Payment[] = [];

    for (const event of events) {
        const ctx = event.context || {};
        if (ctx.tipo === 'otro') continue;

        const caseId = event.caseId || `CASE-${event.actor?.slice(0, 3).toUpperCase() || 'SYS'}-${event.timestamp?.slice(2, 10).replace(/-/g, '') || Date.now()}`;

        if (!casesMap.has(caseId)) {
            casesMap.set(caseId, {
                id: caseId,
                cliente: '',
                vendedora: event.actor || '',
                descripcion: '',
                estado: 'en_produccion',
                created_at: event.timestamp || new Date().toISOString(),
                updated_at: event.timestamp || new Date().toISOString(),
                precio: 0,
                pagado: 0
            });
        }

        const pedido = casesMap.get(caseId)!;

        if (ctx.cliente) pedido.cliente = normalizeText(ctx.cliente as string);
        if (ctx.producto) pedido.descripcion = ctx.producto as string;
        if (ctx.nuevoEstado) pedido.estado = ctx.nuevoEstado as string;
        if (ctx.costoTotal) pedido.precio = Number(ctx.costoTotal);
        if (ctx.precio) pedido.precio = Number(ctx.precio);
        if (ctx.proveedor) pedido.vendedora = normalizeText(ctx.proveedor as string);

        if (ctx.adelanto) {
            initialPayments.push({
                id: `PAY-${Date.now()}-${Math.random()}`,
                pedidoId: caseId,
                monto: Number(ctx.adelanto),
                fecha: event.timestamp || new Date().toISOString(),
                nota: 'Adelanto inicial'
            });
        }

        for (const art of event.artifacts || []) {
            const artLower = art.toLowerCase();
            if (artLower.startsWith('cliente:')) pedido.cliente = normalizeText(art.split(':')[1]);
            if (artLower.startsWith('producto:')) pedido.descripcion = art.split(':')[1];
            if (artLower.startsWith('proveedor:')) pedido.vendedora = normalizeText(art.split(':')[1]);
            if (artLower.startsWith('vendedora:')) pedido.vendedora = normalizeText(art.split(':')[1]);
            if (artLower.startsWith('rq:')) pedido.rq_numero = art.split(':')[1].trim();
            if (artLower.startsWith('costototal:') || artLower.startsWith('precio:')) {
                const val = art.split(':')[1].replace(/[^\d.]/g, '');
                pedido.precio = Number(val);
            }
        }
        pedido.updated_at = event.timestamp || pedido.updated_at;
    }

    const pedidos = Array.from(casesMap.values());
    pedidos.forEach(p => {
        const pPayments = initialPayments.filter(pay => pay.pedidoId === p.id);
        p.pagado = pPayments.reduce((sum, pay) => sum + pay.monto, 0);
    });

    return { pedidos, payments: initialPayments };
}

export function DatabaseProvider({ children }: { children: ReactNode }) {
    const [db, setDb] = useState<Database | null>(null);
    const [events, setEvents] = useState<TraceEvent[]>([]);
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [proveedores, setProveedores] = useState<Record<string, Proveedor>>({});
    const [clientes, setClientes] = useState<Record<string, Cliente>>({});
    const [selectedStateFilter, setSelectedStateFilter] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dataSource, setDataSource] = useState<'db' | 'jsonl' | 'supabase' | null>(null);

    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                const { data: clientsData } = await supabase.from('clientes').select('*');
                if (clientsData) {
                    const clientsMap: Record<string, Cliente> = {};
                    clientsData.forEach(c => clientsMap[c.nombre] = { ...c, id: c.nombre, logo: c.logo_url });
                    setClientes(clientsMap);
                }

                const { data: provData } = await supabase.from('proveedores').select('*');
                if (provData) {
                    const provMap: Record<string, Proveedor> = {};
                    provData.forEach(p => provMap[p.nombre] = { ...p, id: p.nombre, logo: p.logo_url });
                    setProveedores(provMap);
                }

                const { data: ordersData } = await supabase.from('pedidos').select('*');
                if (ordersData) {
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

    const updatePedido = async (id: string, changes: Partial<Pedido>) => {
        setPedidos(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
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

    const updateProveedor = async (nombre: string, data: Partial<Proveedor>) => {
        const fullData = { ...(proveedores[nombre] || { nombre, especialidad: 'General', factor_demora: 0 }), ...data };
        setProveedores(prev => ({ ...prev, [nombre]: fullData }));
        try {
            await supabase.from('proveedores').upsert({
                nombre: fullData.nombre,
                contacto: fullData.contacto,
                telefono: fullData.telefono,
                direccion: fullData.direccion,
                notas: fullData.notas,
                especialidad: fullData.especialidad,
                factor_demora: fullData.factor_demora,
                logo_url: fullData.logo
            }, { onConflict: 'nombre' });
        } catch (err) {
            console.error("Error updating proveedor:", err);
        }
    };

    const updateCliente = async (nombre: string, data: Partial<Cliente>) => {
        const fullData = { ...(clientes[nombre] || { nombre }), ...data };
        setClientes(prev => ({ ...prev, [nombre]: fullData }));
        try {
            await supabase.from('clientes').upsert({
                nombre: fullData.nombre,
                ruc: fullData.ruc,
                direccion: fullData.direccion,
                contacto: fullData.contacto,
                telefono: fullData.telefono,
                email: fullData.email,
                notas: fullData.notas,
                logo_url: fullData.logo
            }, { onConflict: 'nombre' });
        } catch (err) {
            console.error("Error updating cliente:", err);
        }
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
            const jsonlFile = fileList.find(f => f.name.toLowerCase().endsWith('.jsonl'));
            const dbFile = fileList.find(f => f.name.toLowerCase().endsWith('.db'));
            const backupFile = fileList.find(f => f.name.toLowerCase().endsWith('.json'));

            if (backupFile) {
                const text = await backupFile.text();
                const json = JSON.parse(text);
                if (json.meta?.type === 'backup') {
                    setClientes(prev => ({ ...prev, ...json.clientes }));
                    setProveedores(prev => ({ ...prev, ...json.proveedores }));
                    if (json.pedidos) setPedidos(json.pedidos);
                    if (json.payments) setPayments(json.payments);
                    setDataSource('supabase');
                }
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

                const { pedidos: parsed, payments: pays } = parseEventsToPedidos(allEvents);

                // SMART MERGE: Preservar ediciones previas o datos de backup
                setPedidos(prev => {
                    if (prev.length === 0) return parsed;
                    const existingMap = new Map(prev.map(p => [p.id, p]));
                    return parsed.map(p => {
                        const existing = existingMap.get(p.id);
                        if (existing) {
                            return {
                                ...p,
                                vendedora: existing.vendedora || p.vendedora,
                                cliente: existing.cliente || p.cliente,
                                precio: existing.precio !== 0 ? existing.precio : p.precio,
                                descripcion: existing.descripcion || p.descripcion
                            };
                        }
                        return p;
                    });
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
            setError(err instanceof Error ? err.message : 'Error loading file');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DatabaseContext.Provider value={{
            db, events, pedidos, payments, proveedores, clientes,
            setPedidos, updatePedido, addPayment, updateProveedor, updateCliente,
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
