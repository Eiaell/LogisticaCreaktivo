import { useCallback } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import type { KPIs, Pedido, PKL } from '../types';

// Helper para obtener fecha de hoy en formato YYYY-MM-DD
function getTodayKey(): string {
    return new Date().toISOString().split('T')[0];
}

// =============================================================================
// KPIs HOOK - Uses centralized 'pedidos' state for consistency
// =============================================================================
export function useKPIs(): KPIs | null {
    const { db, pedidos, dataSource, movimientosLogisticos, rendiciones, pkls } = useDatabase();

    if (dataSource === 'db' && db) {
        // Legacy DB logic
        try {
            const totalPedidos = db.exec("SELECT COUNT(*) FROM pedidos")[0]?.values[0]?.[0] as number || 0;
            const pedidosActivos = db.exec("SELECT COUNT(*) FROM pedidos WHERE estado NOT IN ('entregado', 'cerrado')")[0]?.values[0]?.[0] as number || 0;
            const montoProduccion = db.exec("SELECT COALESCE(SUM(costo_total), 0) FROM acuerdos WHERE estado = 'pendiente'")[0]?.values[0]?.[0] as number || 0;
            const alertas = db.exec("SELECT COUNT(*) FROM acuerdos WHERE estado = 'problema' OR (estado = 'pendiente' AND fecha_prometida < date('now'))")[0]?.values[0]?.[0] as number || 0;
            const movilidadHoy = db.exec("SELECT COALESCE(SUM(costo), 0) FROM movilidad WHERE date(fecha) = date('now')")[0]?.values[0]?.[0] as number || 0;
            return { totalPedidos, pedidosActivos, montoProduccion, alertas, movilidadHoy, valorPipeline: 0, tasaConversion: 0, saldoPendiente: 0, totalPKLs: pkls.length, pklsActivos: pkls.filter(p => !['cerrado_ok', 'cerrado_parcial', 'cancelado'].includes(p.estado.actual)).length, costoPKLs: pkls.reduce((sum, p) => sum + (p.costos?.total || 0), 0) };
        } catch { return null; }
    }

    if (dataSource === 'jsonl' || dataSource === 'supabase') {
        // Calculate from the shared 'pedidos' state
        const totalPedidos = pedidos.length;
        const pedidosActivos = pedidos.filter(p => !['entregado', 'cerrado', 'liquidado', 'cancelado'].includes(p.estado)).length;

        // Sum prices of active orders for 'Monto en Producción'
        const montoProduccion = pedidos
            .filter(p => p.estado === 'en_produccion' || p.estado === 'cotizacion' || p.estado === 'aprobado' || p.estado === 'listo')
            .reduce((sum, p) => sum + (p.precio || 0), 0);

        // Calcular alertas (pedidos con fecha de compromiso vencida)
        const today = new Date();
        const alertas = pedidos.filter(p => {
            if (!p.fecha_compromiso) return false;
            const fechaCompromiso = new Date(p.fecha_compromiso);
            return fechaCompromiso < today && !['entregado', 'cerrado', 'cancelado'].includes(p.estado);
        }).length;

        // Calcular movilidad de hoy desde movimientos y rendiciones
        const todayKey = getTodayKey();

        // Sumar costos de movilidad de movimientos logísticos de hoy
        const costoMovimientosHoy = movimientosLogisticos
            .filter(m => m.fecha === todayKey)
            .reduce((sum, m) => sum + (Number(m.costo_movilidad) || 0), 0);

        // Sumar rendiciones de tipo movilidad de hoy
        const costoRendicionesHoy = rendiciones
            .filter(r => r.fecha === todayKey && r.tipo === 'movilidad')
            .reduce((sum, r) => sum + (Number(r.monto) || 0), 0);

        const movilidadHoy = costoMovimientosHoy + costoRendicionesHoy;

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

        // PKL KPIs
        const totalPKLs = pkls.length;
        const pklsActivos = pkls.filter(p => !['cerrado_ok', 'cerrado_parcial', 'cancelado'].includes(p.estado.actual)).length;
        const costoPKLs = pkls.reduce((sum, p) => sum + (p.costos?.total || 0), 0);

        return { totalPedidos, pedidosActivos, montoProduccion, alertas, movilidadHoy, valorPipeline, tasaConversion, saldoPendiente, totalPKLs, pklsActivos, costoPKLs };
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
// PROCESS FLOW HOOK - Uses shared state + PKLs
// =============================================================================

// Map PKL states to Process Graph states
function mapPKLStateToProcessState(pklState: string): string | null {
    const mapping: Record<string, string> = {
        'recibido': 'cotizacion',
        'en_produccion': 'en_produccion',
        'en_curso': 'listo',
        'en_pausa': 'cotizacion', // Show paused as pending
        'cerrado_ok': 'cerrado',
        'cerrado_parcial': 'cerrado',
        'cancelado': 'cerrado',
    };
    return mapping[pklState] || null;
}

export function useProcessFlow() {
    const { db, pedidos, dataSource, pkls } = useDatabase();

    const getFlowData = useCallback(() => {
        const nodeDefinitions = [
            { id: 'cotizacion', label: 'Cotización', color: '#d97706' }, // Amarillo/Ámbar
            { id: 'aprobado', label: 'Aprobado', color: '#16a34a' }, // Verde
            { id: 'en_produccion', label: 'En Producción', color: '#2563eb' }, // Azul
            { id: 'listo', label: 'Listo', color: '#0891b2' }, // Cyan
            { id: 'entregado', label: 'Entregado', color: '#14b8a6' }, // Teal
            { id: 'cerrado', label: 'Cerrado', color: '#6b7280' }, // Gris
        ];

        const estadoCounts: Record<string, number> = {};
        const pklCounts: Record<string, number> = {};

        if (dataSource === 'db' && db) {
            // ... Legacy DB execution ...
        } else {
            // Calc from pedidos
            pedidos.forEach(p => {
                let state = p.estado;
                if (!state) state = 'en_produccion';
                estadoCounts[state] = (estadoCounts[state] || 0) + 1;
            });
        }

        // Add PKL counts
        pkls.forEach(pkl => {
            const mappedState = mapPKLStateToProcessState(pkl.estado.actual);
            if (mappedState) {
                pklCounts[mappedState] = (pklCounts[mappedState] || 0) + 1;
            }
        });

        const nodes = nodeDefinitions.map(def => {
            const pedidoCount = estadoCounts[def.id] || 0;
            const pklCount = pklCounts[def.id] || 0;
            const totalCount = pedidoCount + pklCount;

            // Show breakdown if there are PKLs
            let label = def.label;
            if (pklCount > 0 && pedidoCount > 0) {
                label = `${def.label}\n(${totalCount}: ${pedidoCount}P + ${pklCount}PKL)`;
            } else if (pklCount > 0) {
                label = `${def.label}\n(${pklCount} PKL)`;
            } else {
                label = `${def.label}\n(${pedidoCount})`;
            }

            return {
                id: def.id,
                label,
                color: { background: def.color, border: def.color },
                font: { color: '#ffffff' },
                shape: 'box' as const,
                margin: { top: 10, right: 10, bottom: 10, left: 10 },
            };
        });

        const edges = [
            { id: 'e1', from: 'cotizacion', to: 'aprobado', arrows: 'to' },
            { id: 'e2', from: 'aprobado', to: 'en_produccion', arrows: 'to' },
            { id: 'e3', from: 'en_produccion', to: 'listo', arrows: 'to' },
            { id: 'e4', from: 'listo', to: 'entregado', arrows: 'to' },
            { id: 'e5', from: 'entregado', to: 'cerrado', arrows: 'to' },
        ];

        return { nodes, edges };
    }, [db, pedidos, dataSource]);

    return getFlowData;
}

// =============================================================================
// PKL DATA HOOK - Returns PKLs from context
// =============================================================================
export function usePKLs(): PKL[] {
    const { pkls } = useDatabase();
    return pkls;
}
