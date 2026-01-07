import { useCallback } from 'react';
import { useDatabase, type TraceEvent } from '../context/DatabaseContext';
import type { KPIs, Pedido } from '../types';

// Helper to normalize text (same as build_graph.py)
function normalizeText(text: string): string {
    if (!text) return '';
    return text.trim().replace(/^\w/, c => c.toUpperCase());
}

// =============================================================================
// KPIs HOOK - Works with both DB and JSONL
// =============================================================================
export function useKPIs(): KPIs | null {
    const { db, events, dataSource } = useDatabase();

    if (dataSource === 'db' && db) {
        return getKPIsFromDB(db);
    } else if (dataSource === 'jsonl' && events.length > 0) {
        return getKPIsFromEvents(events);
    }

    return null;
}

function getKPIsFromDB(db: import('sql.js').Database): KPIs {
    try {
        const totalPedidos = db.exec("SELECT COUNT(*) FROM pedidos")[0]?.values[0]?.[0] as number || 0;
        const pedidosActivos = db.exec("SELECT COUNT(*) FROM pedidos WHERE estado NOT IN ('entregado', 'cerrado')")[0]?.values[0]?.[0] as number || 0;
        const montoProduccion = db.exec("SELECT COALESCE(SUM(costo_total), 0) FROM acuerdos WHERE estado = 'pendiente'")[0]?.values[0]?.[0] as number || 0;
        const alertas = db.exec("SELECT COUNT(*) FROM acuerdos WHERE estado = 'problema' OR (estado = 'pendiente' AND fecha_prometida < date('now'))")[0]?.values[0]?.[0] as number || 0;
        const movilidadHoy = db.exec("SELECT COALESCE(SUM(costo), 0) FROM movilidad WHERE date(fecha) = date('now')")[0]?.values[0]?.[0] as number || 0;

        return { totalPedidos, pedidosActivos, montoProduccion, alertas, movilidadHoy };
    } catch {
        return { totalPedidos: 0, pedidosActivos: 0, montoProduccion: 0, alertas: 0, movilidadHoy: 0 };
    }
}

function getKPIsFromEvents(events: TraceEvent[]): KPIs {
    const cases = new Set<string>();
    let montoProduccion = 0;
    let movilidadHoy = 0;
    let alertas = 0;

    const today = new Date().toISOString().split('T')[0];

    for (const event of events) {
        // Track unique cases
        if (event.caseId) {
            cases.add(event.caseId);
        }

        const ctx = event.context || {};

        // Count production amounts
        if (ctx.tipo === 'acuerdo_produccion') {
            montoProduccion += (ctx.costoTotal as number) || (ctx.adelanto as number) || 0;
        }

        // Count mobility costs for today
        if (ctx.tipo === 'movimiento_movilidad' && event.timestamp?.startsWith(today)) {
            movilidadHoy += (ctx.costo as number) || 0;
        }

        // Count problems
        if (ctx.nuevoEstado === 'problema' || event.action?.includes('problema')) {
            alertas++;
        }
    }

    return {
        totalPedidos: cases.size || events.length,
        pedidosActivos: Math.floor(cases.size * 0.7), // Estimate
        montoProduccion,
        alertas,
        movilidadHoy
    };
}

// =============================================================================
// PEDIDOS HOOK - Works with both DB and JSONL
// =============================================================================
export function usePedidos(): Pedido[] {
    const { db, events, dataSource } = useDatabase();

    if (dataSource === 'db' && db) {
        return getPedidosFromDB(db);
    } else if (dataSource === 'jsonl' && events.length > 0) {
        return getPedidosFromEvents(events);
    }

    return [];
}

function getPedidosFromDB(db: import('sql.js').Database): Pedido[] {
    try {
        const result = db.exec("SELECT * FROM pedidos ORDER BY created_at DESC");
        if (!result[0]) return [];

        const columns = result[0].columns;
        return result[0].values.map((row: (string | number | null | Uint8Array)[]) => {
            const obj: Record<string, unknown> = {};
            columns.forEach((col: string, i: number) => { obj[col] = row[i]; });
            return obj as unknown as Pedido;
        });
    } catch {
        return [];
    }
}

function getPedidosFromEvents(events: TraceEvent[]): Pedido[] {
    // Group events by case and extract pedido-like data
    const casesMap = new Map<string, Pedido>();

    for (const event of events) {
        const ctx = event.context || {};
        if (ctx.tipo === 'otro') continue;

        // Generate case ID
        const caseId = event.caseId || generateCaseId(event);

        if (!casesMap.has(caseId)) {
            casesMap.set(caseId, {
                id: caseId,
                cliente: '',
                vendedora: event.actor || '',
                descripcion: '',
                estado: 'en_produccion',
                fecha_compromiso: '',
                rq_numero: null,
                created_at: event.timestamp,
                updated_at: event.timestamp
            });
        }

        const pedido = casesMap.get(caseId)!;

        // Update from context
        if (ctx.cliente) pedido.cliente = normalizeText(ctx.cliente as string);
        if (ctx.producto) pedido.descripcion = ctx.producto as string;
        if (ctx.nuevoEstado) pedido.estado = ctx.nuevoEstado as string;

        // Extract from artifacts (Case Insensitive start)
        for (const art of event.artifacts || []) {
            const artLower = art.toLowerCase();
            if (artLower.startsWith('cliente:')) pedido.cliente = normalizeText(art.split(':')[1]);
            if (artLower.startsWith('producto:')) pedido.descripcion = art.split(':')[1];
            if (artLower.startsWith('proveedor:')) pedido.vendedora = normalizeText(art.split(':')[1]); // Proveedor as vendedora fallback or separte field
        }

        pedido.updated_at = event.timestamp;
    }

    return Array.from(casesMap.values());
}

function generateCaseId(event: TraceEvent): string {
    const ctx = event.context || {};
    const client = ctx.cliente || '';
    const provider = ctx.proveedor || '';
    const date = event.timestamp?.slice(0, 10).replace(/-/g, '') || '';

    if (client && provider) {
        return `CASE-${client.slice(0, 3).toUpperCase()}-${provider.slice(0, 3).toUpperCase()}-${date}`;
    }

    // Try to find client/provider in artifacts if not in context
    const arts = event.artifacts || [];
    const clientArt = arts.find(a => a.toLowerCase().startsWith('cliente:'))?.split(':')[1];
    const providerArt = arts.find(a => a.toLowerCase().startsWith('proveedor:'))?.split(':')[1];

    if (clientArt && providerArt) {
        return `CASE-${normalizeText(clientArt).slice(0, 3).toUpperCase()}-${normalizeText(providerArt).slice(0, 3).toUpperCase()}-${date}`;
    }

    return `CASE-${event.actor?.slice(0, 3).toUpperCase() || 'UNK'}-${date}`;
}

// =============================================================================
// PROCESS FLOW HOOK - Works with both DB and JSONL
// =============================================================================
export function useProcessFlow() {
    const { db, events, dataSource } = useDatabase();

    const getFlowData = useCallback(() => {
        const nodeDefinitions = [
            { id: 'cotizacion', label: 'Cotización', color: '#6366f1' },
            { id: 'aprobado', label: 'Aprobado', color: '#8b5cf6' },
            { id: 'en_produccion', label: 'En Producción', color: '#f59e0b' },
            { id: 'listo_recoger', label: 'Listo Recoger', color: '#10b981' },
            // { id: 'en_campo', label: 'En Campo', color: '#06b6d4' }, // REMOVED as requested
            { id: 'entregado', label: 'Entregado', color: '#22c55e' },
            { id: 'cerrado', label: 'Cerrado', color: '#64748b' },
        ];

        // Get estado counts
        let estadoCounts: Record<string, number> = {};

        if (dataSource === 'db' && db) {
            try {
                const result = db.exec("SELECT estado, COUNT(*) FROM pedidos GROUP BY estado");
                if (result[0]) {
                    result[0].values.forEach((row) => {
                        const [estado, count] = row as [string, number];
                        estadoCounts[estado] = count;
                    });
                }
            } catch { /* ignore */ }
        } else if (dataSource === 'jsonl' && events.length > 0) {
            // Count from events
            const stateMap: Record<string, Set<string>> = {};

            for (const event of events) {
                const ctx = event.context || {};
                if (ctx.tipo === 'otro') continue;

                const caseId = event.caseId || generateCaseId(event);
                let state = 'en_produccion';

                if (ctx.tipo === 'acuerdo_produccion') state = 'en_produccion';
                if (ctx.tipo === 'movimiento_movilidad') state = 'entregado';
                if (ctx.nuevoEstado) state = ctx.nuevoEstado as string;

                // Skip en_campo state mapping if it appears in data, map to listo_recoger or entregado depending on logic
                if (state === 'en_campo') state = 'listo_recoger';

                if (!stateMap[state]) stateMap[state] = new Set();
                stateMap[state].add(caseId);
            }

            for (const [state, cases] of Object.entries(stateMap)) {
                estadoCounts[state] = cases.size;
            }
        }

        const nodes = nodeDefinitions.map(def => ({
            id: def.id,
            label: `${def.label}\n(${estadoCounts[def.id] || 0})`,
            color: { background: def.color, border: def.color },
            font: { color: '#ffffff' },
            shape: 'box' as const,
            margin: { top: 10, right: 10, bottom: 10, left: 10 },
        }));

        const edges = [
            { id: 'e1', from: 'cotizacion', to: 'aprobado', arrows: 'to' },
            { id: 'e2', from: 'aprobado', to: 'en_produccion', arrows: 'to' },
            { id: 'e3', from: 'en_produccion', to: 'listo_recoger', arrows: 'to' },
            { id: 'e4', from: 'listo_recoger', to: 'entregado', arrows: 'to' }, // Connected direct to Entregado
            // { id: 'e5', from: 'en_campo', to: 'entregado', arrows: 'to' }, // Removed
            { id: 'e6', from: 'entregado', to: 'cerrado', arrows: 'to' },
        ];

        return { nodes, edges };
    }, [db, events, dataSource]);

    return getFlowData;
}
