import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useDatabase } from '../context/DatabaseContext';
import { toUpperCase } from '../utils/parsers';
import { TIPOS_OPERACION_PKL, ESTADOS_PKL } from '../types';
import type { PKL, EstadoPKL, TipoOperacionPKL } from '../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const EJECUTIVAS = ['Angélica', 'Johana', 'Natalia', 'Giovana'];

// Generate next PKL ID
function generatePKLId(existingPkls: PKL[]): string {
    const year = new Date().getFullYear();
    const prefix = `PKL-${year}-`;

    // Find highest number for this year
    let maxNum = 0;
    existingPkls.forEach(pkl => {
        if (pkl.pkl_id.startsWith(prefix)) {
            const num = parseInt(pkl.pkl_id.replace(prefix, ''), 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    });

    return `${prefix}${String(maxNum + 1).padStart(4, '0')}`;
}

export function NuevoPedidoModal({ isOpen, onClose }: Props) {
    const { clientes, pkls, createPKL, createCliente } = useDatabase();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
    const [isTipoDropdownOpen, setIsTipoDropdownOpen] = useState(false);
    const [isEstadoDropdownOpen, setIsEstadoDropdownOpen] = useState(false);

    // Form state
    const [cliente, setCliente] = useState('');
    const [nuevoCliente, setNuevoCliente] = useState('');
    const [vendedora, setVendedora] = useState('');
    const [tipoOperacion, setTipoOperacion] = useState<TipoOperacionPKL>('ciclo_completo');
    const [estado, setEstado] = useState<EstadoPKL>('recibido');
    const [descripcion, setDescripcion] = useState('');

    // Auto-generate next PKL ID for preview
    const nextPKLId = useMemo(() => generatePKLId(pkls), [pkls]);

    // Build structure: main entities (groups + independent clients)
    const mainEntities: Array<{
        nombre: string;
        displayName: string;
        razonSocial?: string;
        isGroup: boolean;
        logo?: string;
        children?: Array<{ razonSocial: string; displayName: string; proyecto: string; logo?: string }>;
    }> = [];

    // First, collect groups and their clients
    const groupMap: Record<string, Array<{ razonSocial: string; displayName: string; proyecto: string; logo?: string }>> = {};

    Object.entries(clientes).forEach(([razonSocial, clienteData]) => {
        const grupo = clienteData.grupo_empresarial;

        if (grupo) {
            if (!groupMap[grupo]) {
                groupMap[grupo] = [];
            }
            groupMap[grupo].push({
                razonSocial,
                displayName: clienteData.nombre_comercial && clienteData.nombre_comercial.trim()
                    ? clienteData.nombre_comercial
                    : razonSocial,
                proyecto: clienteData.proyecto || 'Oficina Principal',
                logo: clienteData.logo
            });
        } else {
            mainEntities.push({
                nombre: razonSocial,
                displayName: clienteData.nombre_comercial && clienteData.nombre_comercial.trim()
                    ? clienteData.nombre_comercial
                    : razonSocial,
                razonSocial,
                isGroup: false,
                logo: clienteData.logo
            });
        }
    });

    // Add groups to main entities
    Object.entries(groupMap).forEach(([grupo, clients]) => {
        clients.sort((a, b) => a.displayName.localeCompare(b.displayName));

        let groupLogo: string | undefined;
        const firstClientKey = Object.keys(clientes).find(key =>
            clientes[key]?.grupo_empresarial === grupo && clientes[key]?.grupo_logo_url
        );
        if (firstClientKey) {
            groupLogo = clientes[firstClientKey]?.grupo_logo_url;
        }

        mainEntities.push({
            nombre: grupo,
            displayName: grupo,
            isGroup: true,
            logo: groupLogo,
            children: clients
        });
    });

    mainEntities.sort((a, b) => a.displayName.localeCompare(b.displayName));

    const clienteFinal = cliente === '__nuevo__' ? nuevoCliente : cliente;

    const resetForm = () => {
        setCliente('');
        setNuevoCliente('');
        setVendedora('');
        setTipoOperacion('ciclo_completo');
        setEstado('recibido');
        setDescripcion('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!descripcion.trim()) return;

        setIsSubmitting(true);
        try {
            const now = new Date().toISOString();

            // Si es cliente nuevo, crearlo primero
            let clienteParaPKL = clienteFinal || 'Sin cliente';
            if (cliente === '__nuevo__' && nuevoCliente.trim()) {
                await createCliente({
                    razon_social: nuevoCliente.trim(),
                    nombre_comercial: nuevoCliente.trim(),
                    estado: 'activo',
                    prioridad: 'medio',
                    tipo_cliente: 'corporativo',
                } as any);
                clienteParaPKL = nuevoCliente.trim();
            }

            // Create the PKL
            const newPKL: PKL = {
                pkl_id: nextPKLId,
                version: '2.0',
                created_at: now,
                updated_at: now,
                origen: {
                    canal: 'otro',
                    fecha_solicitud: now,
                    descripcion_inicial: descripcion.trim(),
                },
                cliente: {
                    nombre: clienteParaPKL,
                    ejecutiva_asignada: vendedora || undefined,
                },
                clasificacion: {
                    tipo_operacion: tipoOperacion,
                    area: 'logistica',
                },
                productos: [],
                proveedores: [],
                estado: {
                    actual: estado,
                    historial: [{
                        estado: estado,
                        fecha: now,
                        motivo: 'PKL creado manualmente',
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
            console.log('✅ PKL creado exitosamente:', newPKL.pkl_id);
            resetForm();
            onClose();
        } catch (err) {
            console.error('Error creando PKL:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const tipoActual = TIPOS_OPERACION_PKL.find(t => t.value === tipoOperacion);
    const estadoActual = ESTADOS_PKL.find(e => e.value === estado);

    const modalContent = (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onKeyDown={(e) => { if (e.key === 'Escape' && !isDropdownOpen && !isTipoDropdownOpen && !isEstadoDropdownOpen) onClose(); }}
        >
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <span className="text-2xl">📋</span>
                        Nuevo PKL
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                    {/* PKL ID Preview */}
                    <div className="flex items-center gap-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                        <span className="text-xs text-cyan-600 dark:text-cyan-400 font-bold uppercase">ID:</span>
                        <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{nextPKLId}</span>
                        <span className="text-xs text-gray-500">(auto-generado)</span>
                    </div>

                    {/* Cliente */}
                    <div className="space-y-2">
                        <label className="text-xs text-gray-600 dark:text-gray-400 font-bold uppercase tracking-wide">
                            Cliente <span className="text-gray-400 dark:text-gray-500">(opcional)</span>
                        </label>

                        <div className="relative">
                            <button
                                type="button"
                                className="w-full bg-gray-100 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white text-left flex items-center justify-between hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            >
                                <span className={cliente ? '' : 'text-gray-500'}>
                                    {cliente
                                        ? (cliente === '__nuevo__' ? 'Nuevo cliente...' : (clientes[cliente]?.nombre_comercial || cliente))
                                        : 'Seleccionar cliente...'}
                                </span>
                                <span className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}>
                                    ▼
                                </span>
                            </button>

                            {isDropdownOpen && (
                                <div
                                    className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg shadow-2xl z-[100] max-h-80 overflow-y-auto"
                                    tabIndex={0}
                                    ref={(el) => el?.focus()}
                                    onKeyDown={(e) => { if (e.key === 'Escape') setIsDropdownOpen(false); }}
                                >
                                    {mainEntities.map((entity) => {
                                        if (!entity.isGroup) {
                                            return (
                                                <button
                                                    key={entity.nombre}
                                                    type="button"
                                                    onClick={() => {
                                                        setCliente(entity.razonSocial!);
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-3 transition-colors border-b border-gray-200 dark:border-gray-800 last:border-b-0 flex items-center gap-3 ${
                                                        cliente === entity.razonSocial
                                                            ? 'bg-cyan-100 dark:bg-cyan-600/30 text-cyan-700 dark:text-cyan-300'
                                                            : 'hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300'
                                                    }`}
                                                >
                                                    {entity.logo ? (
                                                        <img src={entity.logo} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />
                                                    ) : (
                                                        <span className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-xs flex-shrink-0">🏢</span>
                                                    )}
                                                    {entity.displayName}
                                                </button>
                                            );
                                        }

                                        const isGroupExpanded = expandedGroup === entity.nombre;
                                        return (
                                            <div key={entity.nombre} className="border-b border-gray-200 dark:border-gray-800 last:border-b-0">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setExpandedGroup(isGroupExpanded ? null : entity.nombre);
                                                    }}
                                                    className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 text-cyan-600 dark:text-cyan-400 flex items-center justify-between transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {entity.logo ? (
                                                            <img src={entity.logo} alt="" className="w-6 h-6 rounded object-cover" />
                                                        ) : (
                                                            <span className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-xs">🏢</span>
                                                        )}
                                                        <span className="font-semibold">{entity.displayName}</span>
                                                    </div>
                                                    <span className={`text-xs transition-transform ${isGroupExpanded ? 'rotate-90' : ''}`}>
                                                        ▶
                                                    </span>
                                                </button>

                                                {isGroupExpanded && entity.children && (
                                                    <div className="bg-gray-50 dark:bg-gray-950/50">
                                                        {entity.children.map((child) => (
                                                            <button
                                                                key={child.razonSocial}
                                                                type="button"
                                                                onClick={() => {
                                                                    setCliente(child.razonSocial);
                                                                    setIsDropdownOpen(false);
                                                                    setExpandedGroup(null);
                                                                }}
                                                                className={`w-full text-left px-8 py-2 text-sm transition-colors border-b border-gray-200 dark:border-gray-800 last:border-b-0 flex items-center gap-3 ${
                                                                    cliente === child.razonSocial
                                                                        ? 'bg-cyan-100 dark:bg-cyan-600/30 text-cyan-700 dark:text-cyan-300'
                                                                        : 'hover:bg-gray-100 dark:hover:bg-gray-900/50 text-gray-600 dark:text-gray-400'
                                                                }`}
                                                            >
                                                                {child.logo ? (
                                                                    <img src={child.logo} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />
                                                                ) : (
                                                                    <span className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-xs flex-shrink-0">🏢</span>
                                                                )}
                                                                <div className="flex-1">
                                                                    <div>{child.displayName}</div>
                                                                    <div className="text-xs text-gray-500">{child.proyecto}</div>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCliente('__nuevo__');
                                            setIsDropdownOpen(false);
                                            setNuevoCliente('');
                                        }}
                                        className="w-full text-left px-4 py-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors border-t border-gray-200 dark:border-gray-800"
                                    >
                                        + Nuevo Cliente
                                    </button>
                                </div>
                            )}
                        </div>

                        {cliente === '__nuevo__' && (
                            <input
                                type="text"
                                value={nuevoCliente}
                                onChange={(e) => setNuevoCliente(toUpperCase(e.target.value))}
                                placeholder="NOMBRE DEL NUEVO CLIENTE"
                                className="w-full bg-gray-100 dark:bg-gray-950 border border-cyan-500/50 rounded-lg p-3 text-gray-900 dark:text-white focus:border-cyan-500 outline-none mt-2 uppercase"
                                required
                            />
                        )}
                    </div>

                    {/* Vendedora + Tipo Operación */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-600 dark:text-gray-400 font-bold uppercase tracking-wide">
                                Ejecutiva / Responsable
                            </label>
                            <select
                                value={vendedora}
                                onChange={(e) => setVendedora(e.target.value)}
                                className="w-full bg-gray-100 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white focus:border-cyan-500 outline-none"
                            >
                                <option value="">Sin asignar</option>
                                {EJECUTIVAS.map(v => (
                                    <option key={v} value={v}>{v}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1 relative">
                            <label className="text-xs text-gray-600 dark:text-gray-400 font-bold uppercase tracking-wide">
                                Tipo de Operación
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsTipoDropdownOpen(!isTipoDropdownOpen)}
                                className="w-full bg-gray-100 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-left flex items-center justify-between hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
                            >
                                <span className="text-gray-900 dark:text-white text-sm">{tipoActual?.label}</span>
                                <span className={`text-gray-500 text-sm transition-transform ${isTipoDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
                            </button>

                            {isTipoDropdownOpen && (
                                <div
                                    className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
                                    tabIndex={0}
                                    ref={(el) => el?.focus()}
                                    onKeyDown={(e) => { if (e.key === 'Escape') setIsTipoDropdownOpen(false); }}
                                >
                                    {TIPOS_OPERACION_PKL.map(t => (
                                        <button
                                            key={t.value}
                                            type="button"
                                            onClick={() => {
                                                setTipoOperacion(t.value as TipoOperacionPKL);
                                                setIsTipoDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-3 border-b border-gray-200 dark:border-gray-800 last:border-b-0 transition-colors flex items-center gap-3 ${
                                                tipoOperacion === t.value
                                                    ? 'bg-gray-100 dark:bg-white/10 font-medium'
                                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-900'
                                            }`}
                                        >
                                            <span className={`w-3 h-3 rounded-full ${t.color}`}></span>
                                            <span className="text-gray-900 dark:text-white">{t.label}</span>
                                            {tipoOperacion === t.value && (
                                                <span className="ml-auto text-cyan-600 dark:text-cyan-400">✓</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Estado */}
                    <div className="space-y-1 relative">
                        <label className="text-xs text-gray-600 dark:text-gray-400 font-bold uppercase tracking-wide">
                            Estado Inicial
                        </label>
                        <button
                            type="button"
                            onClick={() => setIsEstadoDropdownOpen(!isEstadoDropdownOpen)}
                            className="w-full bg-gray-100 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-left flex items-center justify-between hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full ${estadoActual?.color}`}></span>
                                <span className="text-gray-900 dark:text-white text-sm">{estadoActual?.label}</span>
                            </div>
                            <span className={`text-gray-500 text-sm transition-transform ${isEstadoDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
                        </button>

                        {isEstadoDropdownOpen && (
                            <div
                                className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-50"
                                tabIndex={0}
                                ref={(el) => el?.focus()}
                                onKeyDown={(e) => { if (e.key === 'Escape') setIsEstadoDropdownOpen(false); }}
                            >
                                {ESTADOS_PKL.map(e => (
                                    <button
                                        key={e.value}
                                        type="button"
                                        onClick={() => {
                                            setEstado(e.value as EstadoPKL);
                                            setIsEstadoDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-3 border-b border-gray-200 dark:border-gray-800 last:border-b-0 transition-colors flex items-center gap-3 ${
                                            estado === e.value
                                                ? 'bg-gray-100 dark:bg-white/10 font-medium'
                                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-900'
                                        }`}
                                    >
                                        <span className={`w-3 h-3 rounded-full ${e.color}`}></span>
                                        <span className="text-gray-900 dark:text-white">{e.label}</span>
                                        {estado === e.value && (
                                            <span className="ml-auto text-cyan-600 dark:text-cyan-400">✓</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Descripción */}
                    <div className="space-y-2">
                        <label className="text-xs text-gray-600 dark:text-gray-400 font-bold uppercase tracking-wide">
                            Descripción *
                        </label>
                        <textarea
                            value={descripcion}
                            onChange={(e) => setDescripcion(toUpperCase(e.target.value))}
                            placeholder="DESCRIPCIÓN DEL REQUERIMIENTO..."
                            className="w-full bg-gray-100 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white text-sm placeholder-gray-500 focus:border-cyan-500 outline-none resize-none h-24 uppercase"
                            required
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 -m-6 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !descripcion.trim()}
                            className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-600 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <span className="animate-spin">⏳</span>
                            ) : (
                                <>
                                    <span>Crear PKL</span>
                                    <span>↵</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
