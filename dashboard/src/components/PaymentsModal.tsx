import { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';

interface Props {
    pedidoId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function PaymentsModal({ pedidoId, isOpen, onClose }: Props) {
    const { payments, pedidos, addPayment } = useDatabase();
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');

    if (!isOpen) return null;

    const pedido = pedidos.find(p => p.id === pedidoId);
    const myPayments = payments.filter(p => p.pedidoId === pedidoId).sort((a, b) => b.fecha.localeCompare(a.fecha));

    const handleAdd = () => {
        const val = parseFloat(amount);
        if (!isNaN(val) && val > 0) {
            addPayment(pedidoId, val, note || 'Pago manual');
            setAmount('');
            setNote('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gray-800 p-4 flex justify-between items-center border-b border-gray-700">
                    <h3 className="text-lg font-bold text-white">💰 Gestionar Pagos</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                </div>

                {/* Info */}
                <div className="p-4 bg-gray-800/50">
                    <div className="flex justify-between mb-2">
                        <span className="text-gray-400">Cliente:</span>
                        <span className="text-white font-medium">{pedido?.cliente || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Total Precio:</span>
                        <span className="text-cyan-400 font-bold">S/.{pedido?.precio || 0}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Total Pagado:</span>
                        <span className="text-green-400 font-bold">S/.{pedido?.pagado || 0}</span>
                    </div>
                    <div className="flex justify-between mt-2 pt-2 border-t border-gray-700">
                        <span className="text-gray-400">Pendiente:</span>
                        <span className="text-red-400 font-bold">S/.{Math.max(0, (pedido?.precio || 0) - (pedido?.pagado || 0))}</span>
                    </div>
                </div>

                {/* New Payment Form */}
                <div className="p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-300">Registrar Nuevo Pago</h4>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            placeholder="Monto (S/.)"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="flex-1 bg-gray-950 border border-gray-700 rounded px-3 py-2 text-white focus:border-cyan-500 outline-none"
                            autoFocus
                        />
                        <button
                            onClick={handleAdd}
                            disabled={!amount}
                            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            + Agregar
                        </button>
                    </div>
                    <input
                        type="text"
                        placeholder="Nota (opcional, ej: Yape, Efectivo)"
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-300 focus:border-cyan-500 outline-none"
                    />
                </div>

                {/* History List */}
                <div className="p-4 border-t border-gray-800 max-h-60 overflow-y-auto">
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">Historial de Pagos</h4>
                    {myPayments.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center italic">No hay pagos registrados</p>
                    ) : (
                        <div className="space-y-2">
                            {myPayments.map(pay => (
                                <div key={pay.id} className="flex justify-between items-center bg-gray-800/50 p-2 rounded border border-gray-700/50">
                                    <div>
                                        <div className="text-green-400 font-bold">S/.{pay.monto}</div>
                                        <div className="text-xs text-gray-500">{new Date(pay.fecha).toLocaleString()}</div>
                                    </div>
                                    <div className="text-sm text-gray-300 max-w-[150px] truncate text-right">
                                        {pay.nota || '-'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
