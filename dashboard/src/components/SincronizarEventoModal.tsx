import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useDatabase } from '../context/DatabaseContext';
import { useToast } from '../context/ToastContext';
import { TIPOS_OPERACION_PKL, ESTADOS_PKL } from '../types';
import type { MovimientoLogistico, Rendicion, EventoProduccion, PKL, TipoOperacionPKL, EstadoPKL } from '../types';
// Funciones centralizadas de cálculo de costos (#12)
import { validarMonto } from '../utils/pklCostos';

type EventoTipo = 'movimiento' | 'rendicion' | 'produccion';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    tipo: EventoTipo;
    evento: MovimientoLogistico | Rendicion | EventoProduccion;
}

// Generate next PKL ID with uniqueness validation
function generatePKLId(existingPkls: PKL[], reservedIds?: Set<string>): string {
    const year = new Date().getFullYear();
    const prefix = `PKL-${year}-`;

    let maxNum = 0;
    existingPkls.forEach(pkl => {
        if (pkl.pkl_id.startsWith(prefix)) {
            const num = parseInt(pkl.pkl_id.replace(prefix, ''), 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    });

    // Generar ID y verificar que no esté reservado/en uso
    let candidateNum = maxNum + 1;
    let candidateId = `${prefix}${String(candidateNum).padStart(4, '0')}`;

    // Verificar contra IDs existentes y reservados (para evitar race conditions)
    const existingIds = new Set(existingPkls.map(p => p.pkl_id));
    while (existingIds.has(candidateId) || reservedIds?.has(candidateId)) {
        candidateNum++;
        candidateId = `${prefix}${String(candidateNum).padStart(4, '0')}`;
        // Límite de seguridad para evitar loop infinito
        if (candidateNum > maxNum + 100) {
            // Fallback: agregar timestamp para unicidad garantizada
            candidateId = `${prefix}${String(candidateNum).padStart(4, '0')}-${Date.now().toString(36)}`;
            break;
        }
    }

    return candidateId;
}

export function SincronizarEventoModal({ isOpen, onClose, tipo, evento }: Props) {
    const {
        pkls, createPKL, updatePKL,
        updateMovimientoLogistico, updateRendicion, updateEventoProduccion,
        clientes: _clientes, getClienteByNombre, createPKLTask
    } = useDatabase();
    const { showToast } = useToast();
    void _clientes;

    const [mode, setMode] = useState<'vincular' | 'crear'>('vincular');
    const [selectedPKLId, setSelectedPKLId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Nuevo PKL form
    const [nuevoPKL, setNuevoPKL] = useState({
        descripcion: '',
        tipoOperacion: 'ciclo_completo' as TipoOperacionPKL,
        estado: 'recibido' as EstadoPKL
    });

    // Filtrar PKLs por cliente del evento
    const clienteEvento = 'cliente' in evento ? evento.cliente : '';

    const pklsFiltrados = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        const isNumericQuery = /^\d+$/.test(query);

        // Si el usuario busca por número, buscar en TODOS los PKLs (ignorar filtros)
        if (searchQuery && isNumericQuery) {
            return pkls.filter(p => {
                // Buscar por número del PKL
                const pklMatch = p.pkl_id.match(/PKL-\d{4}-(\d+)/i);
                if (pklMatch) {
                    const pklNum = parseInt(pklMatch[1], 10).toString();
                    return pklNum === query || pklMatch[1].endsWith(query);
                }
                return false;
            }).sort((a, b) =>
                new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            ).slice(0, 20);
        }

        let filtered = pkls;

        // Solo filtrar cerrados cuando NO hay búsqueda activa
        if (!searchQuery) {
            filtered = filtered.filter(p =>
                !['cerrado_cancelado'].includes(p.estado.actual)
            );
        }

        // Filtrar por cliente si existe - usar comparación más estricta
        if (clienteEvento && !searchQuery) {
            const clienteNorm = clienteEvento.toUpperCase().trim();
            filtered = filtered.filter(p => {
                const pklClienteNorm = p.cliente.nombre.toUpperCase().trim();
                return pklClienteNorm === clienteNorm ||
                       pklClienteNorm.includes(clienteNorm);
            });
        }

        // Filtrar por búsqueda de texto (no numérica)
        if (searchQuery && !isNumericQuery) {
            filtered = pkls.filter(p =>
                p.pkl_id.toLowerCase().includes(query) ||
                p.cliente.nombre.toLowerCase().includes(query) ||
                p.origen.descripcion_inicial.toLowerCase().includes(query)
            );
        }

        // Ordenar por fecha más reciente
        return filtered.sort((a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        ).slice(0, 20);
    }, [pkls, clienteEvento, searchQuery]);

    // Configuración visual por tipo
    const config = {
        movimiento: {
            title: 'Sincronizar Movimiento',
            icon: '🚚',
            color: 'from-blue-500 to-cyan-600',
            accion: 'Este movimiento se agregará como task al PKL',
            taskTipo: 'movilidad' as const
        },
        rendicion: {
            title: 'Sincronizar Rendición',
            icon: '💰',
            color: 'from-orange-500 to-amber-600',
            accion: 'Esta rendición se registrará como pago en el PKL',
            taskTipo: 'pago' as const
        },
        produccion: {
            title: 'Sincronizar Producción',
            icon: '🏭',
            color: 'from-indigo-500 to-purple-600',
            accion: 'Este evento se vinculará como task de producción al PKL',
            taskTipo: 'coordinacion_proveedor' as const
        }
    };

    const currentConfig = config[tipo];

    // Obtener descripción del evento
    const getEventoDescripcion = () => {
        if (tipo === 'movimiento') {
            const mov = evento as MovimientoLogistico;
            const detalle = mov.detalle as any;
            if (detalle?.items) {
                return detalle.items.map((i: any) => `${i.cantidad} ${i.producto}`).join(', ');
            }
            return mov.observaciones || mov.tipo;
        } else if (tipo === 'rendicion') {
            const rend = evento as Rendicion;
            return `S/. ${rend.monto} - ${rend.tipo.replace('_', ' ')}`;
        } else {
            const prod = evento as EventoProduccion;
            return `${prod.producto} x ${prod.cantidad || 1}`;
        }
    };

    // Obtener monto del evento (si aplica)
    const getEventoMonto = (): number => {
        if (tipo === 'movimiento') {
            const mov = evento as MovimientoLogistico;
            return mov.costo_movilidad || 0;
        } else if (tipo === 'rendicion') {
            const rend = evento as Rendicion;
            return rend.monto || 0;
        } else {
            const prod = evento as EventoProduccion;
            return prod.precio_total || 0;
        }
    };

    const handleSincronizar = async () => {
        setIsSubmitting(true);
        let pklIdCreado: string | null = null; // Para rollback si falla

        try {
            let pklId = selectedPKLId;
            const now = new Date().toISOString();

            // Validar monto usando función centralizada (#12, #15)
            const monto = getEventoMonto();
            const montoValidation = validarMonto(monto);
            if (!montoValidation.valid) {
                showToast(montoValidation.error || 'Monto inválido', 'error');
                setIsSubmitting(false);
                return;
            }

            // Validar estado del PKL seleccionado (#6)
            // Solo bloquear cerrado_cancelado - cerrado_ok sí permite vincular
            // (el cliente puede reactivar cotizaciones que parecían muertas)
            if (mode === 'vincular' && pklId) {
                const pklTarget = pkls.find(p => p.pkl_id === pklId);
                if (pklTarget && pklTarget.estado.actual === 'cerrado_cancelado') {
                    showToast('No puedes vincular a un PKL cancelado', 'error');
                    setIsSubmitting(false);
                    return;
                }
            }

            // Si es modo crear, primero crear el PKL
            if (mode === 'crear') {
                const newPklId = generatePKLId(pkls);

                const newPKL: PKL = {
                    pkl_id: newPklId,
                    version: '2.0',
                    created_at: now,
                    updated_at: now,
                    origen: {
                        canal: 'otro',
                        fecha_solicitud: now,
                        descripcion_inicial: nuevoPKL.descripcion || getEventoDescripcion(),
                        evento_origen_id: evento.id, // Referencia al evento del Día a Día que originó este PKL
                    },
                    cliente: {
                        nombre: clienteEvento || 'Sin cliente',
                    },
                    clasificacion: {
                        tipo_operacion: nuevoPKL.tipoOperacion,
                        area: 'logistica',
                    },
                    productos: [],
                    proveedores: [],
                    estado: {
                        actual: nuevoPKL.estado,
                        historial: [{
                            estado: nuevoPKL.estado,
                            fecha: now,
                            motivo: 'PKL creado desde Día a Día',
                        }],
                    },
                    tasks: [],
                    eventos_externos: [],
                    costos: {
                        total: 0,
                        detalle: [],
                        moneda: 'PEN',
                    },
                    cierre: {
                        evidencias: [],
                    },
                    alertas: {
                        dias_sin_actividad: 0,
                        umbral_pausa_dias: 3,
                    },
                };

                await createPKL(newPKL);
                pklId = newPklId;
                pklIdCreado = newPklId; // Guardar para posible rollback
                console.log('✅ Nuevo PKL creado:', pklId);
            }

            if (!pklId) {
                showToast('Debes seleccionar o crear un PKL', 'warning');
                setIsSubmitting(false);
                return;
            }

            // Crear task en el PKL para este evento
            const tipoEmojis: Record<string, string> = {
                cotizacion: '📋', coordinacion_proveedor: '🤝', compra_insumo: '🛒',
                pago: '💰', movilidad: '🚚', instalacion: '🔧', cierre: '✅', administrativo: '📋'
            };

            try {
                // Obtener fecha del evento para fecha_completado
                const fechaEvento = evento.fecha || new Date().toISOString().split('T')[0];

                await createPKLTask(pklId, {
                    nombre: `${tipoEmojis[currentConfig.taskTipo] || '📋'} ${getEventoDescripcion()}`.substring(0, 100),
                    descripcion: getEventoDescripcion(),
                    tipo: currentConfig.taskTipo,
                    estado: 'completado',
                    orden: 1,
                    costo: monto > 0 ? { monto, moneda: 'PEN' } : undefined,
                    evento_origen_id: evento.id,
                    fecha_completado: fechaEvento,
                    responsable: 'Huber',
                    es_happy_path: true,
                } as any);
            } catch (taskError) {
                console.error('Error creando task:', taskError);
                // Si falló crear el task y habíamos creado un PKL nuevo, informar al usuario
                if (pklIdCreado) {
                    showToast(`Error: PKL ${pklIdCreado} creado pero falló agregar el task. Revisa manualmente.`, 'error');
                }
                throw taskError;
            }

            // Actualizar el evento con el pkl_id
            try {
                if (tipo === 'movimiento') {
                    await updateMovimientoLogistico(evento.id, { pedido_id: pklId });
                } else if (tipo === 'rendicion') {
                    await updateRendicion(evento.id, { pedido_id: pklId });
                } else if (tipo === 'produccion') {
                    await updateEventoProduccion(evento.id, { pedido_id: pklId });
                }
            } catch (updateError) {
                console.error('Error vinculando evento:', updateError);
                showToast(`Error: Task creado pero el evento no se vinculó al PKL. El PKL es ${pklId}.`, 'error');
                throw updateError;
            }

            // Actualizar costos del PKL (solo si monto > 0)
            const currentPKL = pkls.find(p => p.pkl_id === pklId);
            if (currentPKL && monto > 0) {
                const currentTotal = currentPKL.costos?.total || 0;
                const newTotal = currentTotal + monto;

                // Validar que el nuevo total sea válido
                if (newTotal >= 0) {
                    await updatePKL(pklId, {
                        costos: {
                            ...currentPKL.costos,
                            total: newTotal,
                        }
                    } as any);
                }
            }

            console.log(`✅ Evento sincronizado con PKL ${pklId}`);
            showToast('Evento sincronizado correctamente con el PKL', 'success');
            onClose();

        } catch (err) {
            console.error('Error sincronizando:', err);
            if (!pklIdCreado) {
                // Solo mostrar error genérico si no mostramos uno específico antes
                showToast('Error al sincronizar. Ver consola para detalles.', 'error');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const clienteInfo = clienteEvento ? getClienteByNombre(clienteEvento) : null;
    const clienteLogo = clienteInfo?.logo || clienteInfo?.grupo_logo_url;

    return createPortal(
        <div
            className="fixed inset-0 liquid-glass-overlay z-[9999] flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
            onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
            tabIndex={0}
            ref={(el) => el?.focus()}
        >
            <div className="liquid-glass liquid-glass-cyan rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className={`bg-gradient-to-r ${currentConfig.color} p-6 rounded-t-2xl`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">{currentConfig.icon}</span>
                            <div>
                                <h2 className="text-xl font-bold text-white">{currentConfig.title}</h2>
                                <p className="text-white/70 text-sm">Vincular con PKL del Dashboard</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Resumen del evento */}
                    <div className="bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                            {clienteLogo ? (
                                <img src={clienteLogo} alt={clienteEvento} className="w-10 h-10 rounded-lg object-cover" />
                            ) : clienteEvento ? (
                                <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-400">
                                    {clienteEvento.substring(0, 2).toUpperCase()}
                                </div>
                            ) : null}
                            <div>
                                <p className="text-gray-900 dark:text-white font-medium">{clienteEvento || 'Sin Cliente'}</p>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">{evento.fecha}</p>
                            </div>
                        </div>
                        <p className="text-cyan-600 dark:text-cyan-400 text-sm">{getEventoDescripcion()}</p>
                        <p className="text-gray-500 text-xs mt-2">{currentConfig.accion}</p>
                    </div>

                    {/* Tabs: Vincular / Crear */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setMode('vincular')}
                            className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                                mode === 'vincular'
                                    ? 'bg-cyan-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            🔗 Vincular a PKL Existente
                        </button>
                        <button
                            onClick={() => setMode('crear')}
                            className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                                mode === 'crear'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            ➕ Crear Nuevo PKL
                        </button>
                    </div>

                    {mode === 'vincular' ? (
                        <>
                            {/* Búsqueda de PKLs */}
                            <div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar PKL por ID, cliente o descripción..."
                                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 focus:border-cyan-500 outline-none"
                                />
                            </div>

                            {/* Lista de PKLs */}
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {pklsFiltrados.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <p>No se encontraron PKLs</p>
                                        <p className="text-sm">Intenta buscar o crea uno nuevo</p>
                                    </div>
                                ) : (
                                    pklsFiltrados.map(pkl => {
                                        const pklCliente = getClienteByNombre(pkl.cliente.nombre);
                                        const pklLogo = pklCliente?.logo || pklCliente?.grupo_logo_url;
                                        const estadoInfo = ESTADOS_PKL.find(e => e.value === pkl.estado.actual);

                                        return (
                                            <button
                                                key={pkl.pkl_id}
                                                onClick={() => setSelectedPKLId(pkl.pkl_id)}
                                                className={`w-full p-3 rounded-lg border transition-all text-left flex items-center gap-3 ${
                                                    selectedPKLId === pkl.pkl_id
                                                        ? 'border-cyan-500 bg-cyan-500/10'
                                                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                                                }`}
                                            >
                                                {/* Logo */}
                                                {pklLogo ? (
                                                    <img src={pklLogo} alt={pkl.cliente.nombre} className="w-8 h-8 rounded object-cover shrink-0" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-gray-400 shrink-0">
                                                        {pkl.cliente.nombre.substring(0, 2).toUpperCase()}
                                                    </div>
                                                )}

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-900 dark:text-white font-medium truncate">{pkl.cliente.nombre}</span>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${estadoInfo?.color || 'bg-gray-500'} !text-white`}>
                                                            {estadoInfo?.label || pkl.estado.actual}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-500 text-xs truncate">{pkl.origen.descripcion_inicial}</p>
                                                </div>

                                                {/* ID */}
                                                <span className="text-gray-400 dark:text-gray-600 text-xs font-mono shrink-0">{pkl.pkl_id}</span>

                                                {/* Check */}
                                                {selectedPKLId === pkl.pkl_id && (
                                                    <span className="text-cyan-500">✓</span>
                                                )}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    ) : (
                        /* Formulario nuevo PKL */
                        <div className="space-y-4">
                            {/* Preview ID */}
                            <div className="flex items-center gap-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                                <span className="text-xs text-cyan-600 dark:text-cyan-400 font-bold uppercase">ID:</span>
                                <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{generatePKLId(pkls)}</span>
                                <span className="text-xs text-gray-500">(auto-generado)</span>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Descripción</label>
                                <input
                                    type="text"
                                    value={nuevoPKL.descripcion}
                                    onChange={(e) => setNuevoPKL(prev => ({ ...prev, descripcion: e.target.value.toUpperCase() }))}
                                    placeholder={getEventoDescripcion().toUpperCase()}
                                    className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:border-cyan-500 outline-none uppercase"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Tipo de Operación</label>
                                    <select
                                        value={nuevoPKL.tipoOperacion}
                                        onChange={(e) => setNuevoPKL(prev => ({ ...prev, tipoOperacion: e.target.value as TipoOperacionPKL }))}
                                        className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:border-cyan-500 outline-none"
                                    >
                                        {TIPOS_OPERACION_PKL.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Estado Inicial</label>
                                    <select
                                        value={nuevoPKL.estado}
                                        onChange={(e) => setNuevoPKL(prev => ({ ...prev, estado: e.target.value as EstadoPKL }))}
                                        className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:border-cyan-500 outline-none"
                                    >
                                        {ESTADOS_PKL.map(e => (
                                            <option key={e.value} value={e.value}>{e.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                                <p className="text-emerald-600 dark:text-emerald-400 text-sm">
                                    Se creará un nuevo PKL para <strong>{clienteEvento || 'Sin Cliente'}</strong> y se vinculará automáticamente con este evento.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSincronizar}
                        disabled={isSubmitting || (mode === 'vincular' && !selectedPKLId)}
                        className={`flex-1 py-3 bg-gradient-to-r ${currentConfig.color} hover:opacity-90 disabled:opacity-50 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2`}
                    >
                        {isSubmitting ? (
                            <span className="animate-pulse">Sincronizando...</span>
                        ) : (
                            <>
                                <span>🚀</span>
                                <span>{mode === 'crear' ? 'Crear PKL y Sincronizar' : 'Sincronizar con PKL'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
