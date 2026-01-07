import { useState, useEffect, useRef } from 'react';
import { useDatabase } from '../context/DatabaseContext';

interface Props {
    nombre: string;
    isOpen: boolean;
    onClose: () => void;
}

export function ClienteModal({ nombre, isOpen, onClose }: Props) {
    const { clientes, updateCliente, uploadLogo } = useDatabase();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load existing data or default
    const currentData = clientes[nombre] || {
        id: nombre,
        nombre
    };

    const [formData, setFormData] = useState({
        ruc: '',
        direccion: '',
        contacto: '',
        telefono: '',
        email: '',
        logo: '',
        notas: ''
    });
    const [isUploading, setIsUploading] = useState(false);
    const [error, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFormData({
                ruc: currentData.ruc || '',
                direccion: currentData.direccion || '',
                contacto: currentData.contacto || '',
                telefono: currentData.telefono || '',
                email: currentData.email || '',
                notas: currentData.notas || '',
                logo: currentData.logo || ''
            });
        }
    }, [nombre, isOpen, clientes]); // Removed currentData from deps to avoid loop? No, primitive check usually ok but obj triggers. But clientes[nombre] creates new obj if not exist? 
    // Actually currentData is derived from clientes.

    const handleSave = () => {
        updateCliente(nombre, formData);
        onClose();
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploading(true);
            setLocalError(null);
            try {
                const publicUrl = await uploadLogo(file, `cliente-${nombre}`);
                if (publicUrl) {
                    setFormData(prev => ({ ...prev, logo: publicUrl }));
                } else {
                    setLocalError("No se pudo obtener la URL de la imagen.");
                }
            } catch (err: any) {
                setLocalError(err.message || "Error al subir la imagen");
            } finally {
                setIsUploading(false);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="text-blue-400">👤</span>
                        {nombre}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">✕</button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Logo Section */}
                    <div className="flex justify-center mb-6">
                        <div
                            className="relative group w-24 h-24 rounded-full bg-blue-500/20 border-2 border-blue-500/50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-400 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {formData.logo ? (
                                <img src={formData.logo} alt="Logo" className={`w-full h-full object-cover ${isUploading ? 'opacity-50' : ''}`} />
                            ) : (
                                <span className={`text-4xl select-none ${isUploading ? 'animate-pulse text-blue-400' : ''}`}>👤</span>
                            )}
                            <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${isUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                <span className="text-[10px] text-white font-bold text-center">
                                    {isUploading ? 'SUBIENDO...' : 'CAMBIAR LOGO'}
                                </span>
                            </div>
                        </div>
                        {error && <p className="text-[10px] text-red-400 mt-1 text-center font-mono">{error}</p>}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageUpload}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500 uppercase font-bold">RUC / DNI</label>
                            <input
                                className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white focus:border-cyan-500 outline-none"
                                value={formData.ruc}
                                onChange={e => setFormData({ ...formData, ruc: e.target.value })}
                                placeholder="1045..."
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500 uppercase font-bold">Teléfono</label>
                            <input
                                className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white focus:border-cyan-500 outline-none"
                                value={formData.telefono}
                                onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                                placeholder="+51 9..."
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-gray-500 uppercase font-bold">Dirección de Entrega</label>
                        <input
                            className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white focus:border-cyan-500 outline-none"
                            value={formData.direccion}
                            onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                            placeholder="Av. Principal 123..."
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-gray-500 uppercase font-bold">Contacto / Email</label>
                        <div className="flex gap-2">
                            <input
                                className="flex-1 bg-gray-950 border border-gray-700 rounded p-2 text-white focus:border-cyan-500 outline-none"
                                value={formData.contacto}
                                onChange={e => setFormData({ ...formData, contacto: e.target.value })}
                                placeholder="Nombre contacto"
                            />
                            <input
                                className="flex-1 bg-gray-950 border border-gray-700 rounded p-2 text-white focus:border-cyan-500 outline-none"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                placeholder="email@ejemplo.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-gray-500 uppercase font-bold">Notas</label>
                        <textarea
                            className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white focus:border-cyan-500 outline-none h-20 resize-none"
                            value={formData.notas}
                            onChange={e => setFormData({ ...formData, notas: e.target.value })}
                            placeholder="Preferencias..."
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
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium text-sm shadow-lg shadow-blue-900/20"
                    >
                        Guardar Cliente
                    </button>
                </div>
            </div>
        </div>
    );
}
