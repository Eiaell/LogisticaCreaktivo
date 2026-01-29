import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useDatabase } from '../context/DatabaseContext';
import { useToast } from '../context/ToastContext';
import type { MovimientoLogistico, ItemMovimiento, TipoMovimientoLogistico } from '../types';
import { TIPOS_MOVIMIENTO } from '../types';
import { findMatchingPKLs } from '../utils/pklMatcher';
import { PKLSuggestions } from './PKLSuggestions';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export function NuevoMovimientoModal({ isOpen, onClose }: Props) {
    const { createMovimientoLogistico, clientes, proveedores, pkls } = useDatabase();
    const { showToast } = useToast();

    // Estado del formulario
    const [tipo, setTipo] = useState<TipoMovimientoLogistico>('entrega');
    const [cliente, setCliente] = useState('');
    const [proveedor, setProveedor] = useState('');
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [origen, setOrigen] = useState('');
    const [destino, setDestino] = useState('');
    const [items, setItems] = useState<ItemMovimiento[]>([{ producto: '', cantidad: 1 }]);
    const [costoMovilidad, setCostoMovilidad] = useState<number>(0);
    const [estado, setEstado] = useState<'pendiente' | 'en_proceso' | 'completado'>('completado');
    const [observaciones, setObservaciones] = useState('');
    const [pklVinculado, setPklVinculado] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setTipo('entrega');
            setCliente('');
            setProveedor('');
            setFecha(new Date().toISOString().split('T')[0]);
            setOrigen('');
            setDestino('');
            setItems([{ producto: '', cantidad: 1 }]);
            setCostoMovilidad(0);
            setEstado('completado');
            setObservaciones('');
            setPklVinculado('');
        }
    }, [isOpen]);

    // Close with ESC
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const handleAddItem = () => {
        setItems([...items, { producto: '', cantidad: 1 }]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: keyof ItemMovimiento, value: string | number) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleSubmit = async () => {
        // Validaciones básicas
        if (!tipo) {
            showToast('Por favor selecciona un tipo de movimiento', 'warning');
            return;
        }

        setIsSubmitting(true);
        try {
            const now = new Date().toISOString();
            const newMovimiento: Omit<MovimientoLogistico, 'seccion'> = {
                id: `MOV-${Date.now()}`,
                fecha,
                tipo,
                cliente: cliente || undefined,
                proveedor: proveedor || undefined,
                pedido_id: pklVinculado || undefined,
                detalle: {
                    items: items.filter(item => item.producto.trim() !== ''),
                    origen,
                    destino,
                },
                estado,
                observaciones: observaciones || undefined,
                costo_movilidad: costoMovilidad,
                created_at: now,
                updated_at: now,
            };

            await createMovimientoLogistico(newMovimiento);
            showToast('Movimiento logístico creado exitosamente', 'success');
            onClose();
        } catch (err) {
            console.error('Error creando movimiento logístico:', err);
            showToast('Error al crear el movimiento. Por favor intenta de nuevo.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const clientesList = Object.entries(clientes).map(([key, c]) => ({
        id: key,
        display: c.nombre_comercial || c.razon_social || key
    }));
    const proveedoresList = Object.keys(proveedores);

    // Calcular PKLs sugeridos basados en los datos del formulario
    const pklMatches = useMemo(() => {
        if (!cliente && !proveedor) return [];

        // Extraer productos de los items
        const productos = items
            .filter(item => item.producto.trim() !== '')
            .map(item => item.producto);

        return findMatchingPKLs(
            {
                cliente,
                proveedor,
                fecha,
                productos: productos.length > 0 ? productos : undefined,
            },
            pkls,
            5 // Top 5
        );
    }, [cliente, proveedor, fecha, items, pkls]);

    return createPortal(
        <div className="fixed inset-0 liquid-glass-overlay z-[9999] flex items-center justify-center p-4">
            <div className="liquid-glass liquid-glass-emerald rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🚚</span>
                            <div>
                                <h2 className="text-xl font-bold text-white">Nuevo Movimiento Logístico</h2>
                                <p className="text-white/70 text-sm">Registrar entrega, recojo, compra o traslado</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {/* Tipo de Movimiento y Estado */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Tipo de Movimiento</label>
                            <input
                                type="text"
                                list="tipos-movimiento-list"
                                value={tipo}
                                onChange={(e) => setTipo(e.target.value as TipoMovimientoLogistico)}
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-emerald-500 outline-none"
                                placeholder="Escribe para buscar..."
                            />
                            <datalist id="tipos-movimiento-list">
                                {TIPOS_MOVIMIENTO.map(t => (
                                    <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                                ))}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Estado</label>
                            <input
                                type="text"
                                list="estados-movimiento-list"
                                value={estado}
                                onChange={(e) => setEstado(e.target.value as typeof estado)}
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-emerald-500 outline-none"
                                placeholder="Escribe para buscar..."
                            />
                            <datalist id="estados-movimiento-list">
                                <option value="pendiente">Pendiente</option>
                                <option value="en_proceso">En Proceso</option>
                                <option value="completado">Completado</option>
                            </datalist>
                        </div>
                    </div>

                    {/* Cliente y Proveedor */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Cliente</label>
                            <input
                                type="text"
                                list="clientes-movimiento-list"
                                value={cliente}
                                onChange={(e) => setCliente(e.target.value)}
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-emerald-500 outline-none"
                                placeholder="Escribe para buscar..."
                            />
                            <datalist id="clientes-movimiento-list">
                                <option value="INTERNO">🏢 Interno / Creaktivo</option>
                                {clientesList.map(c => (
                                    <option key={c.id} value={c.id}>{c.display}</option>
                                ))}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Proveedor (opcional)</label>
                            <input
                                type="text"
                                list="proveedores-list"
                                value={proveedor}
                                onChange={(e) => setProveedor(e.target.value.toUpperCase())}
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-emerald-500 outline-none placeholder-gray-500"
                                placeholder="Nombre del proveedor"
                            />
                            <datalist id="proveedores-list">
                                {proveedoresList.map(p => <option key={p} value={p} />)}
                            </datalist>
                        </div>
                    </div>

                    {/* Fecha */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Fecha</label>
                        <input
                            type="date"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-emerald-500 outline-none [color-scheme:dark]"
                        />
                    </div>

                    {/* Origen y Destino - Solo para ciertos tipos */}
                    {['entrega', 'recojo', 'traslado'].includes(tipo) && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Origen</label>
                                <input
                                    type="text"
                                    value={origen}
                                    onChange={(e) => setOrigen(e.target.value)}
                                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-emerald-500 outline-none placeholder-gray-500"
                                    placeholder="Lugar de origen"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Destino</label>
                                <input
                                    type="text"
                                    value={destino}
                                    onChange={(e) => setDestino(e.target.value)}
                                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-emerald-500 outline-none placeholder-gray-500"
                                    placeholder="Lugar de destino"
                                />
                            </div>
                        </div>
                    )}

                    {/* Items/Productos */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-300">Items/Productos ({items.length})</label>
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="text-sm text-emerald-400 hover:text-emerald-300 font-medium"
                            >
                                + Agregar Item
                            </button>
                        </div>
                        <div className="bg-gray-800/30 border border-gray-700 rounded-lg max-h-48 overflow-y-auto">
                            {items.length > 0 ? (
                                <div className="divide-y divide-gray-700/50">
                                    {items.map((item, index) => (
                                        <div key={index} className="p-3 flex gap-3 items-center">
                                            <input
                                                type="number"
                                                value={item.cantidad}
                                                onChange={(e) => handleItemChange(index, 'cantidad', parseInt(e.target.value) || 1)}
                                                className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-center"
                                                min="1"
                                            />
                                            <input
                                                type="text"
                                                value={item.producto}
                                                onChange={(e) => handleItemChange(index, 'producto', e.target.value)}
                                                className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white placeholder-gray-500"
                                                placeholder="Descripción del producto"
                                            />
                                            {items.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(index)}
                                                    className="p-1.5 text-red-400 hover:bg-red-500/20 rounded"
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm italic py-4 text-center">No hay items</p>
                            )}
                        </div>
                    </div>

                    {/* Costo de Movilidad - Solo para ciertos tipos */}
                    {['entrega', 'recojo', 'traslado', 'compra'].includes(tipo) && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Costo de Movilidad (S/.)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={costoMovilidad}
                                onChange={(e) => setCostoMovilidad(parseFloat(e.target.value) || 0)}
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-emerald-500 outline-none placeholder-gray-500"
                                placeholder="0.00"
                            />
                        </div>
                    )}

                    {/* PKLs Sugeridos */}
                    {pklMatches.length > 0 && (
                        <PKLSuggestions
                            matches={pklMatches}
                            selectedPklId={pklVinculado}
                            onSelectPkl={setPklVinculado}
                            minScore={50}
                        />
                    )}

                    {/* Vincular a PKL (opcional) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Vincular a PKL (opcional)</label>
                        <input
                            type="text"
                            list="pkls-movimiento-list"
                            value={pklVinculado}
                            onChange={(e) => setPklVinculado(e.target.value)}
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-emerald-500 outline-none"
                            placeholder="Escribe para buscar..."
                        />
                        <datalist id="pkls-movimiento-list">
                            <option value="">Sin vincular</option>
                            {pkls.map(pkl => (
                                <option key={pkl.pkl_id} value={pkl.pkl_id}>
                                    {pkl.pkl_id} - {pkl.cliente.nombre} - {pkl.clasificacion.tipo_operacion}
                                </option>
                            ))}
                        </datalist>
                    </div>

                    {/* Observaciones */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Observaciones</label>
                        <textarea
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            rows={3}
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-emerald-500 outline-none resize-none placeholder-gray-500"
                            placeholder="Notas adicionales sobre el movimiento..."
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-5 py-4 border-t border-gray-800">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <span className="animate-pulse">Guardando...</span>
                        ) : (
                            <>
                                <span>💾</span>
                                Crear Movimiento
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
