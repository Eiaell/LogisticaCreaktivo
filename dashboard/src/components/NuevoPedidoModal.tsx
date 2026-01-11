import { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const VENDEDORAS = ['Angélica', 'Johana', 'Natalia', 'Patricia', 'Pati'];
const ESTADOS_INICIALES = [
    { value: 'cotizacion', label: 'Cotización' },
    { value: 'aprobado', label: 'Aprobado' },
    { value: 'en_produccion', label: 'En Producción' },
];

export function NuevoPedidoModal({ isOpen, onClose }: Props) {
    const { clientes, createPedido } = useDatabase();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

    // Form state
    const [cliente, setCliente] = useState('');
    const [nuevoCliente, setNuevoCliente] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [vendedora, setVendedora] = useState('');
    const [estado, setEstado] = useState('cotizacion');
    const [precio, setPrecio] = useState('');
    const [rqNumero, setRqNumero] = useState('');
    const [fechaCompromiso, setFechaCompromiso] = useState('');

    // Build structure: main entities (groups + independent clients)
    const mainEntities: Array<{
        nombre: string;
        displayName: string;
        razonSocial?: string;
        isGroup: boolean;
        children?: Array<{ razonSocial: string; displayName: string; proyecto: string }>;
    }> = [];

    // First, collect groups and their clients
    const groupMap: Record<string, Array<{ razonSocial: string; displayName: string; proyecto: string }>> = {};

    Object.entries(clientes).forEach(([razonSocial, clienteData]) => {
        const grupo = clienteData.grupo_empresarial;

        if (grupo) {
            // This client belongs to a group
            if (!groupMap[grupo]) {
                groupMap[grupo] = [];
            }
            groupMap[grupo].push({
                razonSocial,
                displayName: clienteData.nombre_comercial && clienteData.nombre_comercial.trim()
                    ? clienteData.nombre_comercial
                    : razonSocial,
                proyecto: clienteData.proyecto || 'Oficina Principal'
            });
        } else {
            // Independent client
            mainEntities.push({
                nombre: razonSocial,
                displayName: clienteData.nombre_comercial && clienteData.nombre_comercial.trim()
                    ? clienteData.nombre_comercial
                    : razonSocial,
                razonSocial,
                isGroup: false
            });
        }
    });

    // Add groups to main entities
    Object.entries(groupMap).forEach(([grupo, clients]) => {
        clients.sort((a, b) => a.displayName.localeCompare(b.displayName));
        mainEntities.push({
            nombre: grupo,
            displayName: grupo,
            isGroup: true,
            children: clients
        });
    });

    // Sort main entities
    mainEntities.sort((a, b) => a.displayName.localeCompare(b.displayName));

    const clienteFinal = cliente === '__nuevo__' ? nuevoCliente : cliente;

    const resetForm = () => {
        setCliente('');
        setNuevoCliente('');
        setDescripcion('');
        setVendedora('');
        setEstado('cotizacion');
        setPrecio('');
        setRqNumero('');
        setFechaCompromiso('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clienteFinal || !descripcion) return;

        setIsSubmitting(true);
        try {
            await createPedido({
                cliente: clienteFinal,
                descripcion,
                vendedora: vendedora || '',
                estado,
                precio: precio ? Number(precio) : 0,
                pagado: 0,
                rq_numero: rqNumero || null,
                fecha_compromiso: fechaCompromiso || undefined,
            });
            resetForm();
            onClose();
        } catch (err) {
            console.error('Error creando pedido:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <span className="text-2xl">📦</span>
                        Nuevo Pedido
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full hover:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Cliente */}
                    <div className="space-y-2">
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">
                            Cliente *
                        </label>

                        <div className="relative">
                            <button
                                type="button"
                                className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white text-left flex items-center justify-between hover:border-gray-600 transition-colors"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            >
                                <span>
                                    {cliente
                                        ? clientes[cliente]?.nombre_comercial || cliente
                                        : 'Seleccionar cliente...'}
                                </span>
                                <span className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}>
                                    ▼
                                </span>
                            </button>

                            {/* Dropdown Content */}
                            {isDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-950 border border-gray-700 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                                    {mainEntities.map((entity) => {
                                        if (!entity.isGroup) {
                                            // Independent client
                                            return (
                                                <button
                                                    key={entity.nombre}
                                                    type="button"
                                                    onClick={() => {
                                                        setCliente(entity.razonSocial!);
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-3 transition-colors border-b border-gray-800 last:border-b-0 ${
                                                        cliente === entity.razonSocial
                                                            ? 'bg-cyan-600/30 text-cyan-300'
                                                            : 'hover:bg-gray-900 text-gray-300'
                                                    }`}
                                                >
                                                    {entity.displayName}
                                                </button>
                                            );
                                        }

                                        // Group with submenu
                                        const isGroupExpanded = expandedGroup === entity.nombre;
                                        return (
                                            <div key={entity.nombre} className="border-b border-gray-800 last:border-b-0">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setExpandedGroup(isGroupExpanded ? null : entity.nombre);
                                                    }}
                                                    className="w-full text-left px-4 py-3 bg-gray-900/50 hover:bg-gray-900 text-cyan-400 flex items-center justify-between transition-colors"
                                                >
                                                    <span className="font-semibold">{entity.displayName}</span>
                                                    <span className={`text-xs transition-transform ${isGroupExpanded ? 'rotate-90' : ''}`}>
                                                        ▶
                                                    </span>
                                                </button>

                                                {/* Group Projects Submenu */}
                                                {isGroupExpanded && entity.children && (
                                                    <div className="bg-gray-950/50">
                                                        {entity.children.map((child) => (
                                                            <button
                                                                key={child.razonSocial}
                                                                type="button"
                                                                onClick={() => {
                                                                    setCliente(child.razonSocial);
                                                                    setIsDropdownOpen(false);
                                                                    setExpandedGroup(null);
                                                                }}
                                                                className={`w-full text-left px-8 py-2 text-sm transition-colors border-b border-gray-800 last:border-b-0 ${
                                                                    cliente === child.razonSocial
                                                                        ? 'bg-cyan-600/30 text-cyan-300'
                                                                        : 'hover:bg-gray-900/50 text-gray-400'
                                                                }`}
                                                            >
                                                                <div>{child.displayName}</div>
                                                                <div className="text-xs text-gray-500">{child.proyecto}</div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Nuevo Cliente option */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCliente('__nuevo__');
                                            setIsDropdownOpen(false);
                                            setNuevoCliente('');
                                        }}
                                        className="w-full text-left px-4 py-3 text-gray-400 hover:text-gray-300 hover:bg-gray-900 transition-colors border-t border-gray-800"
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
                                onChange={(e) => setNuevoCliente(e.target.value)}
                                placeholder="Nombre del nuevo cliente"
                                className="w-full bg-gray-950 border border-cyan-500/50 rounded-lg p-3 text-white focus:border-cyan-500 outline-none mt-2"
                                required
                            />
                        )}
                    </div>

                    {/* Descripción */}
                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">
                            Descripción *
                        </label>
                        <textarea
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            placeholder="Ej: 500 polos algodón con logo bordado"
                            className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none resize-none h-20"
                            required
                        />
                    </div>

                    {/* Vendedora + Estado */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">
                                Vendedor/a
                            </label>
                            <select
                                value={vendedora}
                                onChange={(e) => setVendedora(e.target.value)}
                                className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none"
                            >
                                <option value="">Sin asignar</option>
                                {VENDEDORAS.map(v => (
                                    <option key={v} value={v}>{v}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">
                                Estado Inicial
                            </label>
                            <select
                                value={estado}
                                onChange={(e) => setEstado(e.target.value)}
                                className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none"
                            >
                                {ESTADOS_INICIALES.map(e => (
                                    <option key={e.value} value={e.value}>{e.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Precio + RQ */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">
                                Precio (S/.)
                            </label>
                            <input
                                type="number"
                                value={precio}
                                onChange={(e) => setPrecio(e.target.value)}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none font-mono"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">
                                RQ / Referencia
                            </label>
                            <input
                                type="text"
                                value={rqNumero}
                                onChange={(e) => setRqNumero(e.target.value)}
                                placeholder="Ej: RQ-2024-001"
                                className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Fecha Compromiso */}
                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">
                            Fecha de Compromiso
                        </label>
                        <input
                            type="date"
                            value={fechaCompromiso}
                            onChange={(e) => setFechaCompromiso(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-gray-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !clienteFinal || !descripcion}
                            className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <span className="animate-spin">⏳</span>
                            ) : (
                                <>
                                    <span>Crear Pedido</span>
                                    <span>↵</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
