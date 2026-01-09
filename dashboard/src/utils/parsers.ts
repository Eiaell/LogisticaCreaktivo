import type { Pedido, Payment } from '../types';

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

export function normalizeText(text: string): string {
    if (!text) return '';
    return text.trim().replace(/^\w/, c => c.toUpperCase());
}

export function parseEventsToPedidos(events: TraceEvent[]): { pedidos: Pedido[], payments: Payment[] } {
    const casesMap = new Map<string, Pedido>();
    const initialPayments: Payment[] = [];

    for (const event of events) {
        const ctx = event.context || {};

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

        // Smart Update: only update if value is present
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

        // Extract description from transcripcion if available
        if (ctx.transcripcion && !pedido.descripcion) {
            pedido.descripcion = ctx.transcripcion as string;
        }

        for (const art of event.artifacts || []) {
            const artLower = art.toLowerCase();
            const value = art.split(':').slice(1).join(':').trim(); // Handle values with colons

            if (artLower.startsWith('cliente:')) pedido.cliente = normalizeText(value);
            if (artLower.startsWith('producto:')) pedido.descripcion = value;
            if (artLower.startsWith('proveedor:')) pedido.vendedora = normalizeText(value);
            if (artLower.startsWith('vendedora:')) pedido.vendedora = normalizeText(value);
            if (artLower.startsWith('rq:')) pedido.rq_numero = value;
            if (artLower.startsWith('costototal:') || artLower.startsWith('precio:')) {
                const val = value.replace(/[^\d.]/g, '');
                pedido.precio = Number(val);
            }
            // New: Handle 'Item:' as descripcion items
            if (artLower.startsWith('item:')) {
                pedido.descripcion = pedido.descripcion
                    ? `${pedido.descripcion}, ${value}`
                    : value;
            }
            // New: Handle 'Persona:' as potential proveedor (first one wins)
            if (artLower.startsWith('persona:') && !pedido.vendedora) {
                pedido.vendedora = normalizeText(value);
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
