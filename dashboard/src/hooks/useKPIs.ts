import { useCallback } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import type { KPIs, Pedido } from '../types';

// =============================================================================
// KPIs HOOK - Uses centralized 'pedidos' state for consistency
// =============================================================================
export function useKPIs(): KPIs | null {
    const { db, pedidos, dataSource } = useDatabase();

    if (dataSource === 'db' && db) {
        // Legacy DB logic
        try {
            const totalPedidos = db.exec("SELECT COUNT(*) FROM pedidos")[0]?.values[0]?.[0] as number || 0;
            const pedidosActivos = db.exec("SELECT COUNT(*) FROM pedidos WHERE estado NOT IN ('entregado', 'cerrado')")[0]?.values[0]?.[0] as number || 0;
            const montoProduccion = db.exec("SELECT COALESCE(SUM(costo_total), 0) FROM acuerdos WHERE estado = 'pendiente'")[0]?.values[0]?.[0] as number || 0;
            const alertas = db.exec("SELECT COUNT(*) FROM acuerdos WHERE estado = 'problema' OR (estado = 'pendiente' AND fecha_prometida < date('now'))")[0]?.values[0]?.[0] as number || 0;
            const movilidadHoy = db.exec("SELECT COALESCE(SUM(costo), 0) FROM movilidad WHERE date(fecha) = date('now')")[0]?.values[0]?.[0] as number || 0;
            return { totalPedidos, pedidosActivos, montoProduccion, alertas, movilidadHoy, valorPipeline: 0, tasaConversion: 0, saldoPendiente: 0 };
        } catch { return null; }
    }

    if (dataSource === 'jsonl' || dataSource === 'supabase') {
        // Calculate from the shared 'pedidos' state
        const totalPedidos = pedidos.length;
        const pedidosActivos = pedidos.filter(p => !['entregado', 'cerrado', 'liquidado', 'cancelado'].includes(p.estado)).length;

        // Sum prices of active orders for 'Monto en Producción'
        const montoProduccion = pedidos
            .filter(p => p.estado === 'en_produccion' || p.estado === 'cotizacion' || p.estado === 'aprobado' || p.estado === 'listo_recoger')
            .reduce((sum, p) => sum + (p.precio || 0), 0);

        const alertas = 0;
        const movilidadHoy = 0;

        // New KPIs
        // Valor Pipeline: Sum of prices of active orders
        const valorPipeline = pedidos
            .filter(p => !['cerrado', 'cancelado', 'liquidado'].includes(p.estado))
            .reduce((sum, p) => sum + (p.precio || 0), 0);

        // Tasa de Conversión: % of closed/delivered orders vs total
        const pedidosCerrados = pedidos.filter(p => ['cerrado', 'entregado'].includes(p.estado)).length;
        const tasaConversion = totalPedidos > 0 ? (pedidosCerrados / totalPedidos) * 100 : 0;

        // Saldo Pendiente: Total price - total paid
        const saldoPendiente = pedidos.reduce((sum, p) => sum + ((p.precio || 0) - (p.pagado || 0)), 0);

        return { totalPedidos, pedidosActivos, montoProduccion, alertas, movilidadHoy, valorPipeline, tasaConversion, saldoPendiente };
    }

    return null;
}

// =============================================================================
// PEDIDOS HOOK - Simply returns the shared state
// =============================================================================
export function usePedidos(): Pedido[] {
    const { db, pedidos, dataSource } = useDatabase();

    if (dataSource === 'db' && db) {
        // Legacy SQL...
        try {
            const result = db.exec("SELECT * FROM pedidos ORDER BY created_at DESC");
            if (!result[0]) return [];
            const columns = result[0].columns;
            return result[0].values.map((row: any[]) => {
                const obj: any = {};
                columns.forEach((col: string, i: number) => { obj[col] = row[i]; });
                return obj as Pedido;
            });
        } catch { return []; }
    }

    // Return the centralized state which is now editable
    return pedidos;
}

// =============================================================================
// PROCESS FLOW HOOK - Uses shared state
// =============================================================================
export function useProcessFlow() {
    const { db, pedidos, dataSource } = useDatabase();

    const getFlowData = useCallback(() => {
        const nodeDefinitions = [
            { id: 'cotizacion', label: 'Cotización', color: '#94a3b8' }, // Gray
            { id: 'aprobado', label: 'Aprobado', color: '#3b82f6' }, // Blue
            { id: 'en_produccion', label: 'En Producción', color: '#eab308' }, // Yellow
            { id: 'listo_recoger', label: 'Listo Recoger', color: '#f97316' }, // Orange
            { id: 'entregado', label: 'Entregado', color: '#22c55e' }, // Green
            { id: 'cerrado', label: 'Cerrado', color: '#166534' }, // Dark Green
        ];

        const estadoCounts: Record<string, number> = {};

        if (dataSource === 'db' && db) {
            // ... Legacy DB execution ...
        } else {
            // Calc from pedidos
            pedidos.forEach(p => {
                // Mapping logic for weird states from traces
                let state = p.estado;
                if (state === 'en_campo') state = 'listo_recoger';
                if (!state) state = 'en_produccion';

                estadoCounts[state] = (estadoCounts[state] || 0) + 1;
            });
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
            { id: 'e4', from: 'listo_recoger', to: 'entregado', arrows: 'to' },
            { id: 'e6', from: 'entregado', to: 'cerrado', arrows: 'to' },
        ];

        return { nodes, edges };
    }, [db, pedidos, dataSource]);

    return getFlowData;
}
