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

    // Form state
    const [cliente, setCliente] = useState('');
    const [nuevoCliente, setNuevoCliente] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [vendedora, setVendedora] = useState('');
    const [estado, setEstado] = useState('cotizacion');
    const [precio, setPrecio] = useState('');
    const [rqNumero, setRqNumero] = useState('');
    const [fechaCompromiso, setFechaCompromiso] = useState('');

    const clientesList = Object.keys(clientes).sort();
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
                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">
                            Cliente *
                        </label>
                        <select
                            value={cliente}
                            onChange={(e) => setCliente(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none"
                            required
                        >
                            <option value="">Seleccionar cliente...</option>
                            {clientesList.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                            <option value="__nuevo__">+ Nuevo Cliente</option>
                        </select>
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
