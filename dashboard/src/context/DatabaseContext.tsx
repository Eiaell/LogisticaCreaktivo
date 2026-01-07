import { createContext, useContext, useState, type ReactNode } from 'react';
import initSqlJs, { type Database } from 'sql.js';
import type { Pedido, Payment, Proveedor } from '../types';

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
        precio?: number; // Add support for direct price
        [key: string]: unknown;
    };
    artifacts: string[];
    caseId?: string;
}

interface DatabaseContextType {
    db: Database | null;
    events: TraceEvent[];
    pedidos: Pedido[];
    payments: Payment[]; // New global payments state
    proveedores: Record<string, Proveedor>; // Shared providers
    setPedidos: React.Dispatch<React.SetStateAction<Pedido[]>>;
    updatePedido: (id: string, changes: Partial<Pedido>) => void;
    addPayment: (pedidoId: string, monto: number, nota?: string) => void;
    updateProveedor: (nombre: string, data: Partial<Proveedor>) => void; // Update fn

    selectedStateFilter: string | null;
    setSelectedStateFilter: (state: string | null) => void;

    isLoading: boolean;
    error: string | null;
    dataSource: 'db' | 'jsonl' | null;
    loadDatabase: (files: FileList | File[]) => Promise<void>;
    resetDatabase: () => void;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

// Helper to normalize text
function normalizeText(text: string): string {
    if (!text) return '';
    return text.trim().replace(/^\w/, c => c.toUpperCase());
}

// Initial parsing now needs to handle potential legacy payments/adelantos
function parseEventsToPedidos(events: TraceEvent[]): { pedidos: Pedido[], payments: Payment[] } {
    const casesMap = new Map<string, Pedido>();
    const initialPayments: Payment[] = [];

    for (const event of events) {
        const ctx = event.context || {};
        if (ctx.tipo === 'otro') continue;

        const caseId = event.caseId || `CASE-${event.actor?.slice(0, 3).toUpperCase()}-${event.timestamp?.slice(0, 10).replace(/-/g, '')}`;

        if (!casesMap.has(caseId)) {
            casesMap.set(caseId, {
                id: caseId,
                cliente: '',
                vendedora: event.actor || '', // Default loading from actor
                descripcion: '',
                estado: 'en_produccion',
                created_at: event.timestamp || new Date().toISOString(),
                updated_at: event.timestamp || new Date().toISOString(),
                precio: 0,
                pagado: 0
            });
        }

        const pedido = casesMap.get(caseId)!;

        // Update fields
        if (ctx.cliente) pedido.cliente = normalizeText(ctx.cliente as string);
        if (ctx.producto) pedido.descripcion = ctx.producto as string;
        if (ctx.nuevoEstado) pedido.estado = ctx.nuevoEstado as string;
        if (ctx.costoTotal) pedido.precio = Number(ctx.costoTotal);
        if (ctx.precio) pedido.precio = Number(ctx.precio);
        if (ctx.proveedor) pedido.vendedora = normalizeText(ctx.proveedor as string);

        // If there was an "adelanto" in context, convert to a Payment
        if (ctx.adelanto) {
            const monto = Number(ctx.adelanto);
            initialPayments.push({
                id: `PAY-${Date.now()}-${Math.random()}`,
                pedidoId: caseId,
                monto: monto,
                fecha: event.timestamp || new Date().toISOString(),
                nota: 'Adelanto inicial (detectado)'
            });
        }

        // Artifacts parsing
        for (const art of event.artifacts || []) {
            const artLower = art.toLowerCase();
            if (artLower.startsWith('cliente:')) pedido.cliente = normalizeText(art.split(':')[1]);
            if (artLower.startsWith('producto:')) pedido.descripcion = art.split(':')[1];
            if (artLower.startsWith('proveedor:')) pedido.vendedora = normalizeText(art.split(':')[1]);
            if (artLower.startsWith('costototal:') || artLower.startsWith('precio:')) {
                const val = art.split(':')[1].replace(/[^\d.]/g, '');
                pedido.precio = Number(val);
            }
        }

        pedido.updated_at = event.timestamp;
    }

    // Calc initial totals
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
    const [payments, setPayments] = useState<Payment[]>([]); // State
    // New: Providers metadata
    const [proveedores, setProveedores] = useState<Record<string, Proveedor>>({});

    const [selectedStateFilter, setSelectedStateFilter] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dataSource, setDataSource] = useState<'db' | 'jsonl' | null>(null);

    const resetDatabase = () => {
        setDb(null);
        setEvents([]);
        setPedidos([]);
        setPayments([]);
        setProveedores({});
        setDataSource(null);
        setError(null);
        setSelectedStateFilter(null);
    };

    const updatePedido = (id: string, changes: Partial<Pedido>) => {
        setPedidos(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
    };

    const updateProveedor = (nombre: string, data: Partial<Proveedor>) => {
        setProveedores(prev => ({
            ...prev,
            [nombre]: { ...(prev[nombre] || { id: nombre, nombre, especialidad: 'General', factor_demora: 0 }), ...data }
        }));
    };

    const addPayment = (pedidoId: string, monto: number, nota: string = 'Pago registrado') => {
        const newPayment: Payment = {
            id: `PAY-${Date.now()}`,
            pedidoId,
            monto,
            fecha: new Date().toISOString(),
            nota
        };
        setPayments(prev => [...prev, newPayment]);

        // Update pedido total immediately
        setPedidos(prev => prev.map(p => {
            if (p.id === pedidoId) {
                return { ...p, pagado: (p.pagado || 0) + monto };
            }
            return p;
        }));
    };

    const loadDatabase = async (files: FileList | File[]) => {
        setIsLoading(true);
        setError(null);

        try {
            const fileList = Array.from(files);
            if (fileList.length === 0) return;

            const firstFile = fileList[0];
            const fileName = firstFile.name.toLowerCase();

            if (fileName.endsWith('.db')) {
                const SQL = await initSqlJs({
                    locateFile: (f: string) => `https://sql.js.org/dist/${f}`
                });

                const arrayBuffer = await firstFile.arrayBuffer();
                const database = new SQL.Database(new Uint8Array(arrayBuffer));

                setDb(database);
                setEvents([]);
                setPedidos([]);
                setPayments([]);
                setDataSource('db');

            } else if (fileName.endsWith('.jsonl')) {
                const allEvents: TraceEvent[] = [];
                for (const file of fileList) {
                    if (!file.name.toLowerCase().endsWith('.jsonl')) continue;
                    const text = await file.text();
                    const lines = text.split('\n').filter(line => line.trim());
                    for (const line of lines) {
                        try {
                            allEvents.push(JSON.parse(line));
                        } catch (e) { console.error(e); }
                    }
                }

                // Sort events
                allEvents.sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());

                setDb(null);
                setEvents(allEvents);

                // PARSE PEDIDOS & PAYMENTS
                const { pedidos: parsedPedidos, payments: parsedPayments } = parseEventsToPedidos(allEvents);
                setPedidos(parsedPedidos);
                setPayments(parsedPayments);

                setDataSource('jsonl');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error loading file');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DatabaseContext.Provider value={{
            db,
            events,
            pedidos,
            payments,
            proveedores,
            setPedidos,
            updatePedido,
            addPayment,
            updateProveedor,
            selectedStateFilter,
            setSelectedStateFilter,
            isLoading,
            error,
            dataSource,
            loadDatabase,
            resetDatabase
        }}>
            {children}
        </DatabaseContext.Provider>
    );
}

export function useDatabase() {
    const context = useContext(DatabaseContext);
    if (!context) {
        throw new Error('useDatabase must be used within a DatabaseProvider');
    }
    return context;
}
