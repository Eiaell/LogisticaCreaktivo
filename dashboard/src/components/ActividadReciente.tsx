import { useMemo } from 'react';
import { useDatabase } from '../context/DatabaseContext';

interface Props {
    onVerDiaADia?: () => void;
    maxItems?: number;
}

export function ActividadReciente({ onVerDiaADia, maxItems = 10 }: Props) {
    const { movimientosLogisticos, rendiciones, eventosProduccion, getClienteByNombre, clientes } = useDatabase();

    // Helper para obtener logo - busca en cliente individual, grupo_logo_url, o entre clientes del mismo grupo
    const getClienteLogo = (clienteData: ReturnType<typeof getClienteByNombre>): string | undefined => {
        if (!clienteData) return undefined;

        // 1. Logo individual del cliente
        if (clienteData.logo) return clienteData.logo;

        // 2. Logo del grupo en este cliente
        if (clienteData.grupo_logo_url) return clienteData.grupo_logo_url;

        // 3. Buscar logo del grupo en otros clientes del mismo grupo
        if (clienteData.grupo_empresarial) {
            const clienteConLogo = Object.values(clientes).find(
                c => c?.grupo_empresarial === clienteData.grupo_empresarial && c?.grupo_logo_url
            );
            if (clienteConLogo?.grupo_logo_url) return clienteConLogo.grupo_logo_url;
        }

        return undefined;
    };

    // Combinar y ordenar todos los eventos por fecha
    const actividadReciente = useMemo(() => {
        const eventos: Array<{
            id: string;
            tipo: 'movimiento' | 'rendicion' | 'produccion';
            subtipo: string;
            fecha: string;
            cliente: string;
            clienteLogo?: string;
            descripcion: string;
            monto?: number;
            estado: string;
            icon: string;
            color: string;
        }> = [];

        // Agregar movimientos
        movimientosLogisticos.forEach(m => {
            const cliente = m.cliente ? getClienteByNombre(m.cliente) : null;
            const detalle = m.detalle as any;
            let descripcion = '';
            if (detalle?.items && Array.isArray(detalle.items)) {
                descripcion = detalle.items.map((i: any) => `${i.cantidad} ${i.producto}`).join(', ');
            } else if (detalle?.origen) {
                descripcion = `${detalle.origen} -> ${detalle.destino || 'Oficina'}`;
            } else if (m.observaciones) {
                descripcion = m.observaciones;
            }

            eventos.push({
                id: m.id,
                tipo: 'movimiento',
                subtipo: m.tipo,
                fecha: m.fecha,
                cliente: m.cliente || '-',
                clienteLogo: getClienteLogo(cliente),
                descripcion: descripcion || m.tipo,
                monto: m.costo_movilidad ? Number(m.costo_movilidad) : undefined,
                estado: m.estado,
                icon: m.tipo === 'entrega' ? '📦' : m.tipo === 'recojo' ? '🚚' : '🔄',
                color: m.tipo === 'entrega' ? 'bg-green-500' : 'bg-blue-500'
            });
        });

        // Agregar rendiciones
        rendiciones.forEach(r => {
            const cliente = r.cliente ? getClienteByNombre(r.cliente) : null;
            const detalle = r.detalle as any;

            eventos.push({
                id: r.id,
                tipo: 'rendicion',
                subtipo: r.tipo,
                fecha: r.fecha,
                cliente: r.cliente || '-',
                clienteLogo: getClienteLogo(cliente),
                descripcion: detalle?.concepto || r.tipo.replace('_', ' '),
                monto: Number(r.monto),
                estado: r.estado,
                icon: r.tipo === 'movilidad' ? '🚕' : '💰',
                color: 'bg-orange-500'
            });
        });

        // Agregar producciones
        eventosProduccion.forEach(e => {
            const cliente = e.cliente ? getClienteByNombre(e.cliente) : null;

            eventos.push({
                id: e.id,
                tipo: 'produccion',
                subtipo: e.tipo,
                fecha: e.fecha,
                cliente: e.cliente || '-',
                clienteLogo: getClienteLogo(cliente),
                descripcion: `${e.producto} x ${e.cantidad || 1}`,
                monto: e.precio_total ? Number(e.precio_total) : undefined,
                estado: e.estado,
                icon: '🏭',
                color: 'bg-indigo-500'
            });
        });

        // Ordenar por fecha descendente y limitar
        return eventos
            .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
            .slice(0, maxItems);
    }, [movimientosLogisticos, rendiciones, eventosProduccion, getClienteByNombre, clientes, maxItems]);

    // Calcular totales del dia de hoy
    const hoy = new Date().toISOString().split('T')[0];
    const actividadHoy = actividadReciente.filter(e => e.fecha === hoy);
    const montoHoy = actividadHoy.reduce((sum, e) => sum + (e.monto || 0), 0);

    if (actividadReciente.length === 0) {
        return (
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="text-xl">📋</span>
                        Actividad Reciente
                    </h3>
                </div>
                <div className="text-center py-8 text-gray-500">
                    <p>No hay actividad registrada</p>
                    <p className="text-sm mt-1">Importa tu dia a dia para comenzar</p>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="text-xl">📋</span>
                    Actividad Reciente
                </h3>
                {onVerDiaADia && (
                    <button
                        onClick={onVerDiaADia}
                        className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                        Ver todo →
                    </button>
                )}
            </div>

            {/* Resumen del dia */}
            {actividadHoy.length > 0 && (
                <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-cyan-400 text-sm font-medium">Hoy</p>
                            <p className="text-white font-bold">{actividadHoy.length} eventos</p>
                        </div>
                        {montoHoy > 0 && (
                            <div className="text-right">
                                <p className="text-gray-400 text-sm">Monto</p>
                                <p className="text-amber-400 font-bold">S/. {montoHoy.toFixed(2)}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Lista de eventos */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
                {actividadReciente.map((evento) => (
                    <div
                        key={evento.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
                    >
                        {/* Icono */}
                        <div className={`w-8 h-8 ${evento.color} rounded-lg flex items-center justify-center text-sm shrink-0`}>
                            {evento.icon}
                        </div>

                        {/* Logo cliente */}
                        {evento.clienteLogo ? (
                            <img
                                src={evento.clienteLogo}
                                alt={evento.cliente}
                                className="w-6 h-6 rounded object-cover shrink-0"
                            />
                        ) : evento.cliente !== '-' && (
                            <div className="w-6 h-6 rounded bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-400 shrink-0">
                                {evento.cliente.substring(0, 2).toUpperCase()}
                            </div>
                        )}

                        {/* Contenido */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-white text-sm font-medium truncate">{evento.cliente}</span>
                                <span className="text-gray-600 text-xs">{evento.fecha}</span>
                            </div>
                            <p className="text-gray-500 text-xs truncate">{evento.descripcion}</p>
                        </div>

                        {/* Monto y estado */}
                        <div className="text-right shrink-0">
                            {evento.monto !== undefined && evento.monto > 0 && (
                                <p className="text-amber-400 font-mono text-xs">S/. {evento.monto.toFixed(2)}</p>
                            )}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                evento.estado === 'completado' || evento.estado === 'pagado'
                                    ? 'bg-green-500/20 text-green-400'
                                    : evento.estado === 'en_produccion'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                                {evento.estado}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
