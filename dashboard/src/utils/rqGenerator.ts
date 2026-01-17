/**
 * RL (Requisito Logístico) Generator - AUTO-GENERADO POR EL SISTEMA
 *
 * Formato: RL-YYYY-XXXX
 * Ejemplo: RL-2026-0001, RL-2026-0042
 *
 * El número secuencial reinicia cada año.
 * Este número conecta todo el ciclo logístico:
 * - Pedido (solicitud del cliente)
 * - Cotizaciones (de múltiples proveedores)
 * - Producciones (una o más por RL)
 * - Movimientos logísticos (entregas/recojos)
 * - Rendiciones (pagos asociados)
 *
 * NOTA: RQ (rq_numero) es el código INTERNO de la empresa (manual, ej: RQ-123)
 *       RL (rl_numero) es el código del SISTEMA (auto-generado, ej: RL-2026-0001)
 */

import type { Pedido, Cotizacion, Produccion, MovimientoLogistico, Rendicion, EventoProduccion } from '../types';

/**
 * Extrae el año y número secuencial de un RL existente
 */
export function parseRL(rl: string): { year: number; seq: number } | null {
    if (!rl) return null;

    // Formato: RL-YYYY-XXXX
    const match = rl.match(/^RL-(\d{4})-(\d{4})$/);
    if (!match) return null;

    return {
        year: parseInt(match[1], 10),
        seq: parseInt(match[2], 10)
    };
}

/**
 * Genera un nuevo número RL basado en los pedidos existentes
 */
export function generateRL(existingPedidos: Pedido[]): string {
    const currentYear = new Date().getFullYear();

    // Buscar el máximo RL del año actual
    let maxSeq = 0;

    for (const pedido of existingPedidos) {
        if (!pedido.rl_numero) continue;

        const parsed = parseRL(pedido.rl_numero);
        if (parsed && parsed.year === currentYear && parsed.seq > maxSeq) {
            maxSeq = parsed.seq;
        }
    }

    // Incrementar secuencial
    const nextSeq = maxSeq + 1;

    // Formatear con padding de 4 dígitos
    return `RL-${currentYear}-${nextSeq.toString().padStart(4, '0')}`;
}

/**
 * Valida si un string es un RL válido
 */
export function isValidRL(rl: string): boolean {
    if (!rl) return false;
    return /^RL-\d{4}-\d{4}$/.test(rl);
}

/**
 * Formatea un RL para display (ya está bien formateado, pero útil para normalización)
 */
export function formatRL(rl: string): string {
    if (!rl) return '';

    // Si ya está en formato correcto, retornar
    if (isValidRL(rl)) return rl;

    // Intentar extraer números y reformatear
    const numbers = rl.replace(/\D/g, '');

    if (numbers.length === 8) {
        // Asumir YYYYXXXX
        const year = numbers.slice(0, 4);
        const seq = numbers.slice(4);
        return `RL-${year}-${seq}`;
    }

    if (numbers.length === 4) {
        // Solo secuencial, usar año actual
        const year = new Date().getFullYear();
        return `RL-${year}-${numbers}`;
    }

    // No se puede parsear, retornar original
    return rl;
}

/**
 * Compara dos RLs para ordenamiento
 * Retorna negativo si a < b, positivo si a > b, 0 si iguales
 */
export function compareRL(a: string | null | undefined, b: string | null | undefined): number {
    if (!a && !b) return 0;
    if (!a) return 1;  // Nulls al final
    if (!b) return -1;

    const parsedA = parseRL(a);
    const parsedB = parseRL(b);

    if (!parsedA && !parsedB) return 0;
    if (!parsedA) return 1;
    if (!parsedB) return -1;

    // Primero por año, luego por secuencial
    if (parsedA.year !== parsedB.year) {
        return parsedB.year - parsedA.year; // Más reciente primero
    }

    return parsedB.seq - parsedA.seq; // Más alto primero
}

/**
 * Obtiene estadísticas de RLs por año
 */
export function getRLStats(pedidos: Pedido[]): Record<number, { count: number; maxSeq: number }> {
    const stats: Record<number, { count: number; maxSeq: number }> = {};

    for (const pedido of pedidos) {
        if (!pedido.rl_numero) continue;

        const parsed = parseRL(pedido.rl_numero);
        if (!parsed) continue;

        if (!stats[parsed.year]) {
            stats[parsed.year] = { count: 0, maxSeq: 0 };
        }

        stats[parsed.year].count++;
        if (parsed.seq > stats[parsed.year].maxSeq) {
            stats[parsed.year].maxSeq = parsed.seq;
        }
    }

    return stats;
}

// ============================================
// BÚSQUEDA POR RL - Conectar todas las entidades
// ============================================

export interface RLContext {
    rl_numero: string;
    pedido?: Pedido;
    cotizaciones: Cotizacion[];
    producciones: Produccion[];
    movimientos: MovimientoLogistico[];
    rendiciones: Rendicion[];
    eventosProduccion: EventoProduccion[];
}

/**
 * Busca todas las entidades relacionadas con un RL específico
 */
export function findByRL(
    rl: string,
    data: {
        pedidos: Pedido[];
        cotizaciones: Cotizacion[];
        producciones: Produccion[];
        movimientosLogisticos: MovimientoLogistico[];
        rendiciones: Rendicion[];
        eventosProduccion: EventoProduccion[];
    }
): RLContext | null {
    if (!isValidRL(rl)) return null;

    const pedido = data.pedidos.find(p => p.rl_numero === rl);

    // Buscar por rl_numero directo O por pedido_id si el pedido tiene el RL
    const pedidoIds = pedido ? [pedido.id] : [];

    const cotizaciones = data.cotizaciones.filter(c =>
        c.rl_numero === rl || (c.pedido_id && pedidoIds.includes(c.pedido_id))
    );

    const producciones = data.producciones.filter(p =>
        p.rl_numero === rl || (p.pedido_id && pedidoIds.includes(p.pedido_id))
    );

    const movimientos = data.movimientosLogisticos.filter(m =>
        m.rl_numero === rl || (m.pedido_id && pedidoIds.includes(m.pedido_id))
    );

    const rendiciones = data.rendiciones.filter(r =>
        r.rl_numero === rl || (r.pedido_id && pedidoIds.includes(r.pedido_id))
    );

    const eventosProduccion = data.eventosProduccion.filter(e =>
        e.rl_numero === rl || (e.pedido_id && pedidoIds.includes(e.pedido_id))
    );

    return {
        rl_numero: rl,
        pedido,
        cotizaciones,
        producciones,
        movimientos,
        rendiciones,
        eventosProduccion,
    };
}

/**
 * Obtiene el RL de un pedido
 */
export function getRLFromPedido(pedido: Pedido): string | null {
    return pedido.rl_numero || null;
}

/**
 * Propaga el RL del pedido a entidades relacionadas que no lo tengan
 */
export function propagateRL(
    pedido: Pedido,
    entities: {
        cotizaciones?: Cotizacion[];
        producciones?: Produccion[];
        movimientos?: MovimientoLogistico[];
        rendiciones?: Rendicion[];
        eventosProduccion?: EventoProduccion[];
    }
): {
    cotizaciones: Cotizacion[];
    producciones: Produccion[];
    movimientos: MovimientoLogistico[];
    rendiciones: Rendicion[];
    eventosProduccion: EventoProduccion[];
} {
    const rl = pedido.rl_numero;
    if (!rl) {
        return {
            cotizaciones: entities.cotizaciones || [],
            producciones: entities.producciones || [],
            movimientos: entities.movimientos || [],
            rendiciones: entities.rendiciones || [],
            eventosProduccion: entities.eventosProduccion || [],
        };
    }

    return {
        cotizaciones: (entities.cotizaciones || []).map(c =>
            c.pedido_id === pedido.id && !c.rl_numero ? { ...c, rl_numero: rl } : c
        ),
        producciones: (entities.producciones || []).map(p =>
            p.pedido_id === pedido.id && !p.rl_numero ? { ...p, rl_numero: rl } : p
        ),
        movimientos: (entities.movimientos || []).map(m =>
            m.pedido_id === pedido.id && !m.rl_numero ? { ...m, rl_numero: rl } : m
        ),
        rendiciones: (entities.rendiciones || []).map(r =>
            r.pedido_id === pedido.id && !r.rl_numero ? { ...r, rl_numero: rl } : r
        ),
        eventosProduccion: (entities.eventosProduccion || []).map(e =>
            e.pedido_id === pedido.id && !e.rl_numero ? { ...e, rl_numero: rl } : e
        ),
    };
}
