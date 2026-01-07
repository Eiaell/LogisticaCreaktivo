import { useState, useEffect } from 'react';
import { useDatabase } from '../context/DatabaseContext';

interface Props {
    nombre: string;
    isOpen: boolean;
    onClose: () => void;
}

export function ProveedorModal({ nombre, isOpen, onClose }: Props) {
    const { proveedores, updateProveedor } = useDatabase();

    // Load existing data or default
    const currentData = proveedores[nombre] || {
        id: nombre,
        nombre,
        especialidad: 'General',
        factor_demora: 0
    };

    const [formData, setFormData] = useState({
        telefono: '',
        direccion: '',
        contacto: '',
        especialidad: 'General',
        notas: ''
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({
                telefono: currentData.telefono || '',
                direccion: currentData.direccion || '',
                contacto: currentData.contacto || '',
                especialidad: currentData.especialidad || 'General',
                notas: currentData.notas || ''
            });
        }
    }, [nombre, isOpen, proveedores]); // Reload when provider changes

    const handleSave = () => {
        updateProveedor(nombre, formData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="text-purple-400">🏭</span>
                        {nombre}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">✕</button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500 uppercase font-bold">Teléfono / WhatsApp</label>
                        <input
                            className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white focus:border-cyan-500 outline-none"
                            value={formData.telefono}
                            onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                            placeholder="+51 999 999 999"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-gray-500 uppercase font-bold">Dirección</label>
                        <input
                            className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white focus:border-cyan-500 outline-none"
                            value={formData.direccion}
                            onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                            placeholder="Av. Las Flores 123, Gamarra"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500 uppercase font-bold">Contacto Principal</label>
                            <input
                                className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white focus:border-cyan-500 outline-none"
                                value={formData.contacto}
                                onChange={e => setFormData({ ...formData, contacto: e.target.value })}
                                placeholder="Juan Pérez"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500 uppercase font-bold">Especialidad</label>
                            <input
                                className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white focus:border-cyan-500 outline-none"
                                value={formData.especialidad}
                                onChange={e => setFormData({ ...formData, especialidad: e.target.value })}
                                placeholder="Estampado, Costura..."
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-gray-500 uppercase font-bold">Notas Adicionales</label>
                        <textarea
                            className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white focus:border-cyan-500 outline-none h-24 resize-none"
                            value={formData.notas}
                            onChange={e => setFormData({ ...formData, notas: e.target.value })}
                            placeholder="Horarios, condiciones de pago, observaciones..."
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-gray-800 bg-gray-800/30 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-400 hover:text-white text-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-medium text-sm shadow-lg shadow-purple-900/20"
                    >
                        Guardar Información
                    </button>
                </div>
            </div>
        </div>
    );
}
